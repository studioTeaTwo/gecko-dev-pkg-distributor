/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PrivateBrowsingUtils } from "resource://gre/modules/PrivateBrowsingUtils.sys.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { showConfirmation } from "resource://gre/modules/FillHelpers.sys.mjs";

const lazy = {};

console.log("a");

ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
});

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "usernameAutocompleteSearch",
  "@mozilla.org/autocomplete/search;1?name=credential-doorhanger-username",
  "nsIAutoCompleteSimpleSearch"
);

ChromeUtils.defineLazyGetter(lazy, "l10n", () => {
  return new Localization(["toolkit/passwordmgr/passwordmgr.ftl"], true);
});

const CredentialInfo = Components.Constructor(
  "@mozilla.org/ssi/credentialInfo;1",
  "nsICredentialInfo",
  "init"
);

/**
 * The maximum age of the password in ms (using `timePasswordChanged`) whereby
 * a user can toggle the password visibility in a doorhanger to add a username to
 * a saved credential.
 */
const VISIBILITY_TOGGLE_MAX_PW_AGE_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Constants for password prompt telemetry.
 */
const PROMPT_DISPLAYED = 0;
const PROMPT_ADD_OR_UPDATE = 1;
const PROMPT_NOTNOW_OR_DONTUPDATE = 2;
const PROMPT_NEVER = 3;
const PROMPT_DELETE = 3;

/**
 * The minimum age of a doorhanger in ms before it will get removed after a locationchange
 */
const NOTIFICATION_TIMEOUT_MS = 10 * 1000; // 10 seconds

/**
 * The minimum age of an attention-requiring dismissed doorhanger in ms
 * before it will get removed after a locationchange
 */
const ATTENTION_NOTIFICATION_TIMEOUT_MS = 60 * 1000; // 1 minute

function autocompleteSelected(popup) {
  const doc = popup.ownerDocument;
  const nameField = doc.getElementById("password-notification-username");
  const passwordField = doc.getElementById("password-notification-password");

  const activeElement = nameField.ownerDocument.activeElement;
  if (activeElement == nameField) {
    popup.onUsernameSelect();
  } else if (activeElement == passwordField) {
    popup.onPasswordSelect();
  }
}

const observer = {
  QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),

  // nsIObserver
  observe(subject, topic, _data) {
    switch (topic) {
      case "autocomplete-did-enter-text": {
        const input = subject.QueryInterface(Ci.nsIAutoCompleteInput);
        autocompleteSelected(input.popupElement);
        break;
      }
    }
  },
};

/**
 * Implements interfaces for prompting the user to enter/save/change credential info
 * found in HTML forms.
 */
export class SsiPrompter {
  get classID() {
    return Components.ID("{194fe61c-e33b-4f60-8165-1112da3176d1}");
  }

  get QueryInterface() {
    return ChromeUtils.generateQI(["nsISsiPrompter"]);
  }

  /**
   * Called when we detect a password or username that is not yet saved as
   * an existing credential.
   *
   * @param {Element} aBrowser
   *                  The browser element that the request came from.
   * @param {nsICredentialInfo} aCredential
   *                       The new credential from the page form.
   * @param {boolean} [dismissed = false]
   *                  If the prompt should be automatically dismissed on being shown.
   * @param {boolean} [notifySaved = false]
   *                  Whether the notification should indicate that a credential has been saved
   * @param {string} [autoSavedCredentialGuid = ""]
   *                 A guid value for the old credential to be removed if the changes match it
   *                 to a different credential
   * @param {object?} possibleValues
   *                 Contains values from anything that we think, but are not sure, might be
   *                 a username or password.  Has two properties, 'usernames' and 'passwords'.
   * @param {Set<String>} possibleValues.usernames
   * @param {Set<String>} possibleValues.passwords
   */
  promptToSavePassword(
    aBrowser,
    aCredential,
    dismissed = false,
    notifySaved = false,
    autoFilledCredentialGuid = "",
    possibleValues = undefined
  ) {
    lazy.log.debug("Prompting user to save credential.");
    const inPrivateBrowsing = PrivateBrowsingUtils.isBrowserPrivate(aBrowser);
    const notification = SsiPrompter._showCredentialCaptureDoorhanger(
      aBrowser,
      aCredential,
      "password-save",
      {
        dismissed: inPrivateBrowsing || dismissed,
        extraAttr: notifySaved ? "attention" : "",
      },
      possibleValues,
      {
        notifySaved,
        autoFilledCredentialGuid,
      }
    );
    Services.obs.notifyObservers(aCredential, "passwordmgr-prompt-save");

    return {
      dismiss() {
        const { PopupNotifications } = aBrowser.ownerGlobal.wrappedJSObject;
        PopupNotifications.remove(notification);
      },
    };
  }

  /**
   * Displays the PopupNotifications.sys.mjs doorhanger for password save or change.
   *
   * @param {Element} browser
   *        The browser to show the doorhanger on.
   * @param {nsICredentialInfo} credential
   *        Credential to save or change. For changes, this credential should contain the
   *        new password and/or username
   * @param {string} type
   *        This is "password-save" or "password-change" depending on the
   *        original notification type. This is used for telemetry and tests.
   * @param {object} showOptions
   *        Options to pass along to PopupNotifications.show().
   * @param {bool} [options.notifySaved = false]
   *        Whether to indicate to the user that the credential was already saved.
   * @param {string} [options.messageStringID = undefined]
   *        An optional string ID to override the default message.
   * @param {string} [options.autoSavedCredentialGuid = ""]
   *        A string guid value for the auto-saved credential to be removed if the changes
   *        match it to a different credential
   * @param {string} [options.autoFilledCredentialGuid = ""]
   *        A string guid value for the autofilled credential
   * @param {object?} possibleValues
   *                 Contains values from anything that we think, but are not sure, might be
   *                 a username or password.  Has two properties, 'usernames' and 'passwords'.
   * @param {Set<String>} possibleValues.usernames
   * @param {Set<String>} possibleValues.passwords
   */
  static _showCredentialCaptureDoorhanger(
    browser,
    credential,
    type,
    showOptions = {},
    possibleValues = undefined,
    {
      notifySaved = false,
      messageStringID,
      autoSavedCredentialGuid = "",
      autoFilledCredentialGuid = "",
    } = {}
  ) {
    lazy.log.debug(
      `Got autoSavedCredentialGuid: ${autoSavedCredentialGuid} and autoFilledCredentialGuid ${autoFilledCredentialGuid}.`
    );

    const saveMessageIds = {
      prompt: "password-manager-save-password-message",
      mainButton: "password-manager-save-password-button-allow",
      secondaryButton: "password-manager-save-password-button-deny",
    };

    const changeMessageIds = {
      prompt: messageStringID ?? "password-manager-update-password-message",
      mainButton: "password-manager-password-password-button-allow",
      secondaryButton: "password-manager-update-password-button-deny",
    };

    const initialMessageIds =
      type == "password-save" ? saveMessageIds : changeMessageIds;

    const promptId = initialMessageIds.prompt;
    const host = this._getShortDisplayHost(credential.origin);
    const promptMessage = lazy.l10n.formatValueSync(promptId, { host });

    const histogramName =
      type == "password-save"
        ? "PWMGR_PROMPT_REMEMBER_ACTION"
        : "PWMGR_PROMPT_UPDATE_ACTION";
    const histogram = Services.telemetry.getHistogramById(histogramName);

    const chromeDoc = browser.ownerDocument;
    let currentNotification;

    const wasModifiedEvent = {
      // Values are mutated
      did_edit_un: "false",
      did_select_un: "false",
      did_edit_pw: "false",
      did_select_pw: "false",
    };

    const updateButtonStatus = element => {
      const mainActionButton = element.button;
      // Disable the main button inside the menu-button if the password field is empty.
      if (!credential.password.length) {
        mainActionButton.setAttribute("disabled", true);
        chromeDoc
          .getElementById("password-notification-password")
          .classList.add("popup-notification-invalid-input");
      } else {
        mainActionButton.removeAttribute("disabled");
        chromeDoc
          .getElementById("password-notification-password")
          .classList.remove("popup-notification-invalid-input");
      }
    };

    const updateButtonLabel = () => {
      if (!currentNotification) {
        console.error("updateButtonLabel, no currentNotification");
      }
      const foundCredentials = lazy.SsiHelper.searchCredentialsWithObject({
        formActionOrigin: credential.formActionOrigin,
        origin: credential.origin,
        httpRealm: credential.httpRealm,
        schemeUpgrades: lazy.SsiHelper.schemeUpgrades,
      });

      const credentials = this._filterUpdatableCredentials(
        credential,
        foundCredentials,
        autoSavedCredentialGuid
      );
      const messageIds = !credentials.length
        ? saveMessageIds
        : changeMessageIds;

      // Update the label based on whether this will be a new credential or not.

      const mainButton = this.getLabelAndAccessKey(messageIds.mainButton);

      // Update the labels for the next time the panel is opened.
      currentNotification.mainAction.label = mainButton.label;
      currentNotification.mainAction.accessKey = mainButton.accessKey;

      // Update the labels in real time if the notification is displayed.
      const element = [...currentNotification.owner.panel.childNodes].find(
        n => n.notification == currentNotification
      );
      if (element) {
        element.setAttribute("buttonlabel", mainButton.label);
        element.setAttribute("buttonaccesskey", mainButton.accessKey);
        updateButtonStatus(element);
      }
    };

    const writeDataToUI = () => {
      const nameField = chromeDoc.getElementById(
        "password-notification-username"
      );

      nameField.placeholder = usernamePlaceholder;
      nameField.value = credential.username;

      const toggleCheckbox = chromeDoc.getElementById(
        "password-notification-visibilityToggle"
      );
      toggleCheckbox.removeAttribute("checked");
      const passwordField = chromeDoc.getElementById(
        "password-notification-password"
      );
      // Ensure the type is reset so the field is masked.
      passwordField.type = "password";
      passwordField.value = credential.password;

      updateButtonLabel();
    };

    const readDataFromUI = () => {
      credential.username = chromeDoc.getElementById(
        "password-notification-username"
      ).value;
      credential.password = chromeDoc.getElementById(
        "password-notification-password"
      ).value;
    };

    const onInput = () => {
      readDataFromUI();
      updateButtonLabel();
    };

    const onUsernameInput = () => {
      wasModifiedEvent.did_edit_un = "true";
      wasModifiedEvent.did_select_un = "false";
      onInput();
    };

    const onUsernameSelect = () => {
      wasModifiedEvent.did_edit_un = "false";
      wasModifiedEvent.did_select_un = "true";
    };

    const onPasswordInput = () => {
      wasModifiedEvent.did_edit_pw = "true";
      wasModifiedEvent.did_select_pw = "false";
      onInput();
    };

    const onPasswordSelect = () => {
      wasModifiedEvent.did_edit_pw = "false";
      wasModifiedEvent.did_select_pw = "true";
    };

    const onKeyUp = e => {
      if (e.key == "Enter") {
        e.target.closest("popupnotification").button.doCommand();
      }
    };

    const onVisibilityToggle = commandEvent => {
      const passwordField = chromeDoc.getElementById(
        "password-notification-password"
      );
      // Gets the caret position before changing the type of the textbox
      const selectionStart = passwordField.selectionStart;
      const selectionEnd = passwordField.selectionEnd;
      passwordField.setAttribute(
        "type",
        commandEvent.target.checked ? "" : "password"
      );
      if (!passwordField.hasAttribute("focused")) {
        return;
      }
      passwordField.selectionStart = selectionStart;
      passwordField.selectionEnd = selectionEnd;
    };

    const togglePopup = event => {
      event.target.parentElement
        .getElementsByClassName("ac-has-end-icon")[0]
        .toggleHistoryPopup();
    };

    const persistData = async () => {
      const foundCredentials = lazy.SsiHelper.searchCredentialsWithObject({
        formActionOrigin: credential.formActionOrigin,
        origin: credential.origin,
        httpRealm: credential.httpRealm,
        schemeUpgrades: lazy.SsiHelper.schemeUpgrades,
      });

      let credentials = this._filterUpdatableCredentials(
        credential,
        foundCredentials,
        autoSavedCredentialGuid
      );
      const resolveBy = ["scheme", "timePasswordChanged"];
      credentials = lazy.SsiHelper.dedupeCredentials(
        credentials,
        ["username"],
        resolveBy,
        credential.origin
      );
      // sort exact username matches to the top
      credentials.sort(l => (l.username == credential.username ? -1 : 1));

      lazy.log.debug(`Matched ${credentials.length} credentials.`);

      let credentialToRemove;
      const credentialToUpdate = credentials.shift();

      if (
        credentials.length &&
        credentials[0].guid == autoSavedCredentialGuid
      ) {
        credentialToRemove = credentials.shift();
      }
      if (credentials.length) {
        lazy.log.warn(
          "persistData:",
          credentials.length,
          "other updatable credentials!",
          credentials.map(l => l.guid),
          "credentialToUpdate:",
          credentialToUpdate && credentialToUpdate.guid,
          "credentialToRemove:",
          credentialToRemove && credentialToRemove.guid
        );
        // Proceed with updating the credential with the best username match rather
        // than returning and losing the edit.
      }

      if (!credentialToUpdate) {
        // Create a new credential, don't update an original.
        // The original credential we have been provided with might have its own
        // metadata, but we don't want it propagated to the newly created one.
        await Services.ssi.addCredentialAsync(
          new CredentialInfo(
            credential.origin,
            credential.formActionOrigin,
            credential.httpRealm,
            credential.username,
            credential.password,
            credential.usernameField,
            credential.passwordField
          )
        );
      } else if (
        credentialToUpdate.password == credential.password &&
        credentialToUpdate.username == credential.username
      ) {
        // We only want to touch the credential's use count and last used time.
        lazy.log.debug(`Touch matched credential: ${credentialToUpdate.guid}.`);
        Services.ssi.recordPasswordUse(
          credentialToUpdate,
          PrivateBrowsingUtils.isBrowserPrivate(browser),
          credentialToUpdate.username ? "form_password" : "form_credential",
          !!autoFilledCredentialGuid
        );
      } else {
        lazy.log.debug(
          `Update matched credential: ${credentialToUpdate.guid}.`
        );
        this._updateCredential(credentialToUpdate, credential);
        // notify that this auto-saved credential has been merged
        if (
          credentialToRemove &&
          credentialToRemove.guid == autoSavedCredentialGuid
        ) {
          Services.obs.notifyObservers(
            credentialToRemove,
            "passwordmgr-autosaved-credential-merged"
          );
        }
      }

      if (credentialToRemove) {
        lazy.log.debug(`Removing credential ${credentialToRemove.guid}.`);
        Services.ssi.removeCredential(credentialToRemove);
      }
    };

    const supportedHistogramNames = {
      PWMGR_PROMPT_REMEMBER_ACTION: true,
      PWMGR_PROMPT_UPDATE_ACTION: true,
    };

    const mainButton = this.getLabelAndAccessKey(initialMessageIds.mainButton);

    // The main action is the "Save" or "Update" button.
    const mainAction = {
      label: mainButton.label,
      accessKey: mainButton.accessKey,
      callback: async () => {
        const eventTypeMapping = {
          "password-save": {
            eventObject: "save",
            confirmationHintFtlId: "confirmation-hint-password-created",
          },
          "password-change": {
            eventObject: "update",
            confirmationHintFtlId: "confirmation-hint-password-updated",
          },
        };

        if (!eventTypeMapping[type]) {
          throw new Error(`Unexpected doorhanger type: '${type}'`);
        }

        readDataFromUI();
        if (
          type == "password-save" &&
          !Services.policies.isAllowed("removeMasterPassword")
        ) {
          if (!lazy.SsiHelper.isPrimaryPasswordSet()) {
            browser.ownerGlobal.openDialog(
              "chrome://mozapps/content/preferences/changemp.xhtml",
              "",
              "centerscreen,chrome,modal,titlebar"
            );
            if (!lazy.SsiHelper.isPrimaryPasswordSet()) {
              return;
            }
          }
        }
        histogram.add(PROMPT_ADD_OR_UPDATE);
        if (!supportedHistogramNames[histogramName]) {
          throw new Error("Unknown histogram");
        }

        showConfirmation(browser, eventTypeMapping[type].confirmationHintFtlId);
        // The popup does not wait until this promise is resolved, but is
        // closed immediately when the function is returned. Therefore, we set
        // the focus before awaiting the asynchronous operation.
        browser.focus();
        await persistData();

        Services.telemetry.recordEvent(
          "pwmgr",
          "doorhanger_submitted",
          eventTypeMapping[type].eventObject,
          null,
          wasModifiedEvent
        );

        if (histogramName == "PWMGR_PROMPT_REMEMBER_ACTION") {
          Services.obs.notifyObservers(
            browser,
            "CredentialStats:NewSavedPassword"
          );
        } else if (histogramName == "PWMGR_PROMPT_UPDATE_ACTION") {
          Services.obs.notifyObservers(
            browser,
            "CredentialStats:CredentialUpdateSaved"
          );
        }

        Services.obs.notifyObservers(
          null,
          "weave:telemetry:histogram",
          histogramName
        );
      },
    };

    const secondaryButton = this.getLabelAndAccessKey(
      initialMessageIds.secondaryButton
    );

    const secondaryActions = [
      {
        label: secondaryButton.label,
        accessKey: secondaryButton.accessKey,
        callback: () => {
          histogram.add(PROMPT_NOTNOW_OR_DONTUPDATE);
          Services.obs.notifyObservers(
            null,
            "weave:telemetry:histogram",
            histogramName
          );
          browser.focus();
        },
      },
    ];
    // Include a "Never for this site" button when saving a new password.
    if (type == "password-save") {
      const neverSaveButton = this.getLabelAndAccessKey(
        "password-manager-save-password-button-never"
      );
      secondaryActions.push({
        label: neverSaveButton.label,
        accessKey: neverSaveButton.accessKey,
        callback: () => {
          histogram.add(PROMPT_NEVER);
          Services.obs.notifyObservers(
            null,
            "weave:telemetry:histogram",
            histogramName
          );
          Services.ssi.setCredentialSavingEnabled(credential.origin, false);
          browser.focus();
        },
      });
    }

    const updatePasswordButtonDelete = this.getLabelAndAccessKey(
      "password-manager-update-password-button-delete"
    );

    // Include a "Delete this credential" button when updating an existing password
    if (type == "password-change") {
      secondaryActions.push({
        label: updatePasswordButtonDelete.label,
        accessKey: updatePasswordButtonDelete.accessKey,
        callback: async () => {
          histogram.add(PROMPT_DELETE);
          Services.obs.notifyObservers(
            null,
            "weave:telemetry:histogram",
            histogramName
          );
          const matchingCredentials = await Services.ssi.searchCredentialsAsync(
            {
              guid: credential.guid,
              origin: credential.origin,
            }
          );
          Services.ssi.removeCredential(matchingCredentials[0]);
          browser.focus();
          lazy.log.debug("Showing the ConfirmationHint");
          showConfirmation(browser, "confirmation-hint-password-removed");
        },
      });
    }

    const usernamePlaceholder = lazy.l10n.formatValueSync(
      "password-manager-no-username-placeholder"
    );
    const togglePassword = this.getLabelAndAccessKey(
      "password-manager-toggle-password"
    );

    // .wrappedJSObject needed here -- see bug 422974 comment 5.
    const { PopupNotifications } = browser.ownerGlobal.wrappedJSObject;

    const notificationID = "password";
    // keep attention notifications around for longer after a locationchange
    const timeoutMs =
      showOptions.dismissed && showOptions.extraAttr == "attention"
        ? ATTENTION_NOTIFICATION_TIMEOUT_MS
        : NOTIFICATION_TIMEOUT_MS;

    const options = Object.assign(
      {
        timeout: Date.now() + timeoutMs,
        persistWhileVisible: true,
        passwordNotificationType: type,
        hideClose: true,
        eventCallback(topic) {
          switch (topic) {
            case "showing":
              {
                lazy.log.debug("showing");
                currentNotification = this;

                // Record the first time this instance of the doorhanger is shown.
                if (!this.timeShown) {
                  histogram.add(PROMPT_DISPLAYED);
                  Services.obs.notifyObservers(
                    null,
                    "weave:telemetry:histogram",
                    histogramName
                  );
                }

                chromeDoc
                  .getElementById("password-notification-password")
                  .removeAttribute("focused");
                chromeDoc
                  .getElementById("password-notification-username")
                  .removeAttribute("focused");
                chromeDoc
                  .getElementById("password-notification-username")
                  .addEventListener("input", onUsernameInput);
                chromeDoc
                  .getElementById("password-notification-username")
                  .addEventListener("keyup", onKeyUp);
                chromeDoc
                  .getElementById("password-notification-password")
                  .addEventListener("keyup", onKeyUp);
                chromeDoc
                  .getElementById("password-notification-password")
                  .addEventListener("input", onPasswordInput);
                chromeDoc
                  .getElementById("password-notification-username-dropmarker")
                  .addEventListener("click", togglePopup);

                SsiPrompter._getUsernameSuggestions(
                  credential,
                  possibleValues?.usernames
                ).then(usernameSuggestions => {
                  const dropmarker = chromeDoc?.getElementById(
                    "password-notification-username-dropmarker"
                  );
                  if (dropmarker) {
                    dropmarker.hidden = !usernameSuggestions.length;
                  }

                  const usernameField = chromeDoc?.getElementById(
                    "password-notification-username"
                  );
                  if (usernameField) {
                    usernameField.classList.toggle(
                      "ac-has-end-icon",
                      !!usernameSuggestions.length
                    );
                  }
                });

                const toggleBtn = chromeDoc.getElementById(
                  "password-notification-visibilityToggle"
                );

                if (
                  Services.prefs.getBoolPref(
                    "signon.rememberSignons.visibilityToggle"
                  )
                ) {
                  toggleBtn.addEventListener("command", onVisibilityToggle);

                  toggleBtn.setAttribute("label", togglePassword.label);
                  toggleBtn.setAttribute("accesskey", togglePassword.accessKey);

                  const hideToggle =
                    lazy.SsiHelper.isPrimaryPasswordSet() ||
                    // Don't show the toggle when the credential was autofilled
                    !!autoFilledCredentialGuid ||
                    // Dismissed-by-default prompts should still show the toggle.
                    (this.timeShown && this.wasDismissed) ||
                    // If we are only adding a username then the password is
                    // one that is already saved and we don't want to reveal
                    // it as the submitter of this form may not be the account
                    // owner, they may just be using the saved password.
                    (messageStringID ==
                      "password-manager-update-credential-add-username" &&
                      credential.timePasswordChanged <
                        Date.now() - VISIBILITY_TOGGLE_MAX_PW_AGE_MS);
                  toggleBtn.hidden = hideToggle;
                }

                let popup = chromeDoc.getElementById("PopupAutoComplete");
                popup.onUsernameSelect = onUsernameSelect;
                popup.onPasswordSelect = onPasswordSelect;

                SsiPrompter._setUsernameAutocomplete(
                  credential,
                  possibleValues?.usernames
                );
              }
              break;
            case "shown": {
              lazy.log.debug("shown");
              writeDataToUI();
              const anchorIcon = this.anchorElement;
              if (anchorIcon && this.options.extraAttr == "attention") {
                anchorIcon.removeAttribute("extraAttr");
                delete this.options.extraAttr;
              }
              break;
            }
            case "dismissed":
              // Note that this can run after `showing` but before `shown` upon tab switch.
              this.wasDismissed = true;
            // Fall through.
            case "removed": {
              // Note that this can run after `showing` and `shown` for the
              // notification it's replacing.
              lazy.log.debug(topic);
              currentNotification = null;

              const usernameField = chromeDoc.getElementById(
                "password-notification-username"
              );
              usernameField.removeEventListener("input", onUsernameInput);
              usernameField.removeEventListener("keyup", onKeyUp);
              const passwordField = chromeDoc.getElementById(
                "password-notification-password"
              );
              passwordField.removeEventListener("input", onPasswordInput);
              passwordField.removeEventListener("keyup", onKeyUp);
              passwordField.removeEventListener("command", onVisibilityToggle);
              chromeDoc
                .getElementById("password-notification-username-dropmarker")
                .removeEventListener("click", togglePopup);
              break;
            }
          }
          return false;
        },
      },
      showOptions
    );

    const notification = PopupNotifications.show(
      browser,
      notificationID,
      promptMessage,
      "password-notification-icon",
      mainAction,
      secondaryActions,
      options
    );

    if (notifySaved) {
      showConfirmation(
        browser,
        "confirmation-hint-password-created",
        "password-notification-icon"
      );
    }

    return notification;
  }

  /**
   * Called when we think we detect a password or username change for
   * an existing credential, when the form being submitted contains multiple
   * password fields.
   *
   * @param {Element} aBrowser
   *                  The browser element that the request came from.
   * @param {nsICredentialInfo} aOldCredential
   *                       The old credential we may want to update.
   * @param {nsICredentialInfo} aNewCredential
   *                       The new credential from the page form.
   * @param {boolean} [dismissed = false]
   *                  If the prompt should be automatically dismissed on being shown.
   * @param {boolean} [notifySaved = false]
   *                  Whether the notification should indicate that a credential has been saved
   * @param {string} [autoSavedCredentialGuid = ""]
   *                 A guid value for the old credential to be removed if the changes match it
   *                 to a different credential
   * @param {object?} possibleValues
   *                 Contains values from anything that we think, but are not sure, might be
   *                 a username or password.  Has two properties, 'usernames' and 'passwords'.
   * @param {Set<String>} possibleValues.usernames
   * @param {Set<String>} possibleValues.passwords
   */
  promptToChangePassword(
    aBrowser,
    aOldCredential,
    aNewCredential,
    dismissed = false,
    notifySaved = false,
    autoSavedCredentialGuid = "",
    autoFilledCredentialGuid = "",
    possibleValues = undefined
  ) {
    const credential = aOldCredential.clone();
    credential.origin = aNewCredential.origin;
    credential.formActionOrigin = aNewCredential.formActionOrigin;
    credential.password = aNewCredential.password;
    credential.username = aNewCredential.username;

    let messageStringID;
    if (
      aOldCredential.username === "" &&
      credential.username !== "" &&
      credential.password == aOldCredential.password
    ) {
      // If the saved password matches the password we're prompting with then we
      // are only prompting to let the user add a username since there was one in
      // the form. Change the message so the purpose of the prompt is clearer.
      messageStringID = "password-manager-update-credential-add-username";
    }

    const notification = SsiPrompter._showCredentialCaptureDoorhanger(
      aBrowser,
      credential,
      "password-change",
      {
        dismissed,
        extraAttr: notifySaved ? "attention" : "",
      },
      possibleValues,
      {
        notifySaved,
        messageStringID,
        autoSavedCredentialGuid,
        autoFilledCredentialGuid,
      }
    );

    const oldGUID = aOldCredential.QueryInterface(
      Ci.nsICredentialMetaInfo
    ).guid;
    Services.obs.notifyObservers(
      aNewCredential,
      "passwordmgr-prompt-change",
      oldGUID
    );

    return {
      dismiss() {
        const { PopupNotifications } = aBrowser.ownerGlobal.wrappedJSObject;
        PopupNotifications.remove(notification);
      },
    };
  }

  /**
   * Called when we detect a password change in a form submission, but we
   * don't know which existing credential (username) it's for. Asks the user
   * to select a username and confirm the password change.
   *
   * Note: The caller doesn't know the username for aNewCredential, so this
   *       function fills in .username and .usernameField with the values
   *       from the credential selected by the user.
   */
  promptToChangePasswordWithUsernames(browser, credentials, aNewCredential) {
    lazy.log.debug(
      `Prompting user to change passowrd for username with count: ${credentials.length}.`
    );

    const noUsernamePlaceholder = lazy.l10n.formatValueSync(
      "password-manager-no-username-placeholder"
    );
    const usernames = credentials.map(l => l.username || noUsernamePlaceholder);
    const dialogText = lazy.l10n.formatValueSync(
      "password-manager-select-username"
    );
    const dialogTitle = lazy.l10n.formatValueSync(
      "password-manager-confirm-password-change"
    );
    const selectedIndex = { value: null };

    // If user selects ok, outparam.value is set to the index
    // of the selected username.
    const ok = Services.prompt.select(
      browser.ownerGlobal,
      dialogTitle,
      dialogText,
      usernames,
      selectedIndex
    );
    if (ok) {
      // Now that we know which credential to use, modify its password.
      const selectedCredential = credentials[selectedIndex.value];
      lazy.log.debug(`Updating password for origin: ${aNewCredential.origin}.`);
      const newCredentialWithUsername = Cc[
        "@mozilla.org/credential-manager/credentialInfo;1"
      ].createInstance(Ci.nsICredentialInfo);
      newCredentialWithUsername.init(
        aNewCredential.origin,
        aNewCredential.formActionOrigin,
        aNewCredential.httpRealm,
        selectedCredential.username,
        aNewCredential.password,
        selectedCredential.usernameField,
        aNewCredential.passwordField
      );
      SsiPrompter._updateCredential(
        selectedCredential,
        newCredentialWithUsername
      );
    }
  }

  /* ---------- Internal Methods ---------- */

  /**
   * Helper method to update and persist an existing nsICredentialInfo object with new property values.
   */
  static _updateCredential(credential, aNewCredential) {
    const now = Date.now();
    const propBag = Cc["@mozilla.org/hash-property-bag;1"].createInstance(
      Ci.nsIWritablePropertyBag
    );
    propBag.setProperty("formActionOrigin", aNewCredential.formActionOrigin);
    propBag.setProperty("origin", aNewCredential.origin);
    propBag.setProperty("password", aNewCredential.password);
    propBag.setProperty("username", aNewCredential.username);
    // Explicitly set the password change time here (even though it would
    // be changed automatically), to ensure that it's exactly the same
    // value as timeLastUsed.
    propBag.setProperty("timePasswordChanged", now);
    propBag.setProperty("timeLastUsed", now);
    propBag.setProperty("timesUsedIncrement", 1);
    // Note that we don't call `recordPasswordUse` so telemetry won't record a
    // use in this case though that is normally correct since we would instead
    // record the save/update in a separate probe and recording it in both would
    // be wrong.
    Services.ssi.modifyCredential(credential, propBag);
  }

  /**
   * Retrieves the message of the given id from fluent
   * and extracts the label and accesskey
   *
   * @param {String} id message id
   * @returns label and accesskey
   */
  static getLabelAndAccessKey(id) {
    const msg = lazy.l10n.formatMessagesSync([id])[0];
    return {
      label: msg.attributes.find(x => x.name == "label").value,
      accessKey: msg.attributes.find(x => x.name == "accesskey").value,
    };
  }

  /**
   * Converts a credential's origin field to a short string for
   * prompting purposes. Eg, "http://foo.com" --> "foo.com", or
   * "ftp://www.site.co.uk" --> "site.co.uk".
   */
  static _getShortDisplayHost(aURIString) {
    let displayHost;

    const idnService = Cc["@mozilla.org/network/idn-service;1"].getService(
      Ci.nsIIDNService
    );
    try {
      const uri = Services.io.newURI(aURIString);
      const baseDomain = Services.eTLD.getBaseDomain(uri);
      displayHost = idnService.convertToDisplayIDN(baseDomain, {});
    } catch (e) {
      lazy.log.warn(`Couldn't process supplied URIString: ${aURIString}`);
    }

    if (!displayHost) {
      displayHost = aURIString;
    }

    return displayHost;
  }

  /**
   * This function looks for existing credentials that can be updated
   * to match a submitted credential, instead of creating a new one.
   *
   * Given a credential and a credentialList, it filters the credential list
   * to find every credential with either:
   * - the same username as aCredential
   * - the same password as aCredential and an empty username
   *   so the user can add a username.
   * - the same guid as the given credential when it has an empty username
   *
   * @param {nsICredentialInfo} aCredential
   *                       credential to use as filter.
   * @param {nsICredentialInfo[]} aCredentialList
   *                         Array of credentials to filter.
   * @param {String} includeGUID
   *                 guid value for credential that not be filtered out
   * @returns {nsICredentialInfo[]} the filtered array of credentials.
   */
  static _filterUpdatableCredentials(
    aCredential,
    aCredentialList,
    includeGUID
  ) {
    return aCredentialList.filter(
      l =>
        l.username == aCredential.username ||
        (l.password == aCredential.password && !l.username) ||
        (includeGUID && includeGUID == l.guid)
    );
  }

  /**
   * Set the values that will be used the next time the username autocomplete popup is opened.
   *
   * @param {nsICredentialInfo} credential - used only for its information about the current domain.
   * @param {Set<String>?} possibleUsernames - values that we believe may be new/changed credential usernames.
   */
  static async _setUsernameAutocomplete(
    credential,
    possibleUsernames = new Set()
  ) {
    const result = Cc[
      "@mozilla.org/autocomplete/simple-result;1"
    ].createInstance(Ci.nsIAutoCompleteSimpleResult);
    result.setDefaultIndex(0);

    const usernames = await this._getUsernameSuggestions(
      credential,
      possibleUsernames
    );
    for (const { text, style } of usernames) {
      const value = text;
      const comment = "";
      const image = "";
      const _style = style;
      result.appendMatch(value, comment, image, _style);
    }

    result.setSearchResult(
      usernames.length
        ? Ci.nsIAutoCompleteResult.RESULT_SUCCESS
        : Ci.nsIAutoCompleteResult.RESULT_NOMATCH
    );

    lazy.usernameAutocompleteSearch.overrideNextResult(result);
  }

  /**
   * @param {nsICredentialInfo} credential - used only for its information about the current domain.
   * @param {Set<String>?} possibleUsernames - values that we believe may be new/changed credential usernames.
   *
   * @returns {object[]} an ordered list of usernames to be used the next time the username autocomplete popup is opened.
   */
  static async _getUsernameSuggestions(
    credential,
    possibleUsernames = new Set()
  ) {
    if (!Services.prefs.getBoolPref("signon.capture.inputChanges.enabled")) {
      return [];
    }

    // Don't reprompt for Primary Password, as we already prompted at least once
    // to show the doorhanger if it is locked
    if (!Services.ssi.isLoggedIn) {
      return [];
    }

    const baseDomainCredentials = await Services.ssi.searchCredentialsAsync({
      origin: credential.origin,
      schemeUpgrades: lazy.SsiHelper.schemeUpgrades,
      acceptDifferentSubdomains: true,
    });

    const saved = baseDomainCredentials.map(credential => {
      return { text: credential.username, style: "credential" };
    });
    const possible = [...possibleUsernames].map(username => {
      return { text: username, style: "possible-username" };
    });

    return possible
      .concat(saved)
      .reduce((acc, next) => {
        const alreadyInAcc =
          acc.findIndex(entry => entry.text == next.text) != -1;
        if (!alreadyInAcc) {
          acc.push(next);
        } else if (next.style == "possible-username") {
          const existingIndex = acc.findIndex(entry => entry.text == next.text);
          acc[existingIndex] = next;
        }
        return acc;
      }, [])
      .filter(suggestion => !!suggestion.text);
  }
}

// Add this observer once for the process.
Services.obs.addObserver(observer, "autocomplete-did-enter-text");

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  return lazy.SsiHelper.createLogger("SsiPrompter");
});
