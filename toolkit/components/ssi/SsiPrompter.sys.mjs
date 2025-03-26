/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Implements doorhanger singleton that wraps up the PopupNotifications and handles
 * the doorhager UI for formautofill related features.
 */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { FormAutofill } from "resource://autofill/FormAutofill.sys.mjs";
import { FormAutofillUtils } from "resource://gre/modules/shared/FormAutofillUtils.sys.mjs";

import { AutofillTelemetry } from "resource://gre/modules/shared/AutofillTelemetry.sys.mjs";
import { showConfirmation } from "resource://gre/modules/FillHelpers.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  formAutofillStorage: "resource://autofill/FormAutofillStorage.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "log", () =>
  FormAutofill.defineLogGetter(lazy, "FormAutofillPrompter")
);

const l10n = new Localization(
  [
    "browser/preferences/formAutofill.ftl",
    "toolkit/formautofill/formAutofill.ftl",
    "branding/brand.ftl",
  ],
  true
);

let CONTENT = {};

/**
 * `SsiDoorhanger` provides a base for both address capture and credit card
 * capture doorhanger notifications. It handles the UI generation and logic
 * related to displaying the doorhanger,
 *
 * The UI data sourced from the `CONTENT` variable is used for rendering. Derived classes
 * should override the `render()` method to customize the layout.
 */
export class SsiDoorhanger {
  /**
   * Constructs an instance of the `SsiDoorhanger` class.
   *
   * @param {object} browser   The browser where the doorhanger will be displayed.
   * @param {object} oldRecord The old record that can be merged with the new record
   * @param {object} newRecord The new record submitted by users
   */
  static headerClass = "address-capture-header";
  static descriptionClass = "address-capture-description";
  static contentClass = "address-capture-content";
  static menuButtonId = "address-capture-menu-button";

  static preferenceURL = null;
  static learnMoreURL = null;

  constructor(browser, preference, data, flowId) {
    this.browser = browser;
    this.preference = preference ?? {};
    this.data = data ?? {};
    this.flowId = flowId;
  }

  get ui() {
    return CONTENT[this.constructor.name];
  }

  // PopupNotification appends a "-notification" suffix to the id to avoid
  // id conflict.
  get notificationId() {
    return this.ui.id + "-notification";
  }

  // The popup notification element
  get panel() {
    return this.browser.ownerDocument.getElementById(this.notificationId);
  }

  get doc() {
    return this.browser.ownerDocument;
  }

  get chromeWin() {
    return this.browser.ownerGlobal;
  }

  /*
   * An autofill doorhanger consists 3 parts - header, description, and content
   * The content part contains customized UI layout for this doorhanger
   */

  // The container of the header part
  static header(panel) {
    return panel.querySelector(`.${SsiDoorhanger.headerClass}`);
  }
  get header() {
    return SsiDoorhanger.header(this.panel);
  }

  // The container of the description part
  static description(panel) {
    return panel.querySelector(`.${SsiDoorhanger.descriptionClass}`);
  }
  get description() {
    return SsiDoorhanger.description(this.panel);
  }

  // The container of the content part
  static content(panel) {
    return panel.querySelector(`.${SsiDoorhanger.contentClass}`);
  }
  get content() {
    return SsiDoorhanger.content(this.panel);
  }

  static menuButton(panel) {
    return panel.querySelector(`#${SsiDoorhanger.menuButtonId}`);
  }
  get menuButton() {
    return SsiDoorhanger.menuButton(this.panel);
  }

  static menuPopup(panel) {
    return SsiDoorhanger.menuButton(panel).querySelector(`.toolbar-menupopup`);
  }
  get menuPopup() {
    return SsiDoorhanger.menuPopup(this.panel);
  }

  static preferenceButton(panel) {
    return SsiDoorhanger.menuButton(panel).querySelector(
      `[data-l10n-id=address-capture-manage-address-button]`
    );
  }
  static learnMoreButton(panel) {
    return SsiDoorhanger.menuButton(panel).querySelector(
      `[data-l10n-id=address-capture-learn-more-button]`
    );
  }

  get preferenceURL() {
    return this.constructor.preferenceURL;
  }
  get learnMoreURL() {
    return this.constructor.learnMoreURL;
  }

  onMenuItemClick(evt) {
    AutofillTelemetry.recordDoorhangerClicked(
      this.constructor.telemetryType,
      evt,
      this.constructor.telemetryObject,
      this.flowId
    );

    if (evt == "open-pref") {
      this.browser.ownerGlobal.openPreferences(this.preferenceURL);
    } else if (evt == "learn-more") {
      const url =
        Services.urlFormatter.formatURLPref("app.support.baseURL") +
        this.learnMoreURL;
      this.browser.ownerGlobal.openWebLinkIn(url, "tab", {
        relatedToCurrent: true,
      });
    }
  }

  // Build the doorhanger markup
  render() {
    this.renderHeader();

    this.renderDescription();

    // doorhanger specific content
    this.renderContent();
  }

  renderHeader() {
    // Render the header text
    const text = this.header.querySelector(`h1`);
    this.doc.l10n.setAttributes(text, this.ui.header.l10nId);

    // Render the menu button
    if (!this.ui.menu?.length || SsiDoorhanger.menuButton(this.panel)) {
      return;
    }

    const button = this.doc.createElement("button");
    button.setAttribute("id", SsiDoorhanger.menuButtonId);
    button.setAttribute("class", "address-capture-icon-button");
    this.doc.l10n.setAttributes(button, "address-capture-open-menu-button");

    const menupopup = this.doc.createXULElement("menupopup");
    menupopup.setAttribute("id", SsiDoorhanger.menuButtonId);
    menupopup.setAttribute("class", "toolbar-menupopup");

    for (const [index, element] of this.ui.menu.entries()) {
      const menuitem = this.doc.createXULElement("menuitem");
      this.doc.l10n.setAttributes(menuitem, element.l10nId);
      /* eslint-disable mozilla/balanced-listeners */
      menuitem.addEventListener("command", event => {
        event.stopPropagation();
        this.onMenuItemClick(element.evt);
      });
      menupopup.appendChild(menuitem);

      if (index != this.ui.menu.length - 1) {
        menupopup.appendChild(this.doc.createXULElement("menuseparator"));
      }
    }

    button.appendChild(menupopup);
    /* eslint-disable mozilla/balanced-listeners */
    button.addEventListener("click", event => {
      event.stopPropagation();
      menupopup.openPopup(button, "after_start");
    });
    this.header.appendChild(button);
  }

  renderDescription() {
    if (this.ui.description?.l10nId) {
      const text = this.description.querySelector(`p`);
      this.doc.l10n.setAttributes(text, this.ui.description.l10nId);
      this.description?.setAttribute("style", "");
    } else {
      this.description?.setAttribute("style", "display:none");
    }
  }

  onEventCallback(state) {
    lazy.log.debug(`Doorhanger receives event callback: ${state}`);

    if (state == "showing") {
      this.render();
    }
  }

  async show() {
    AutofillTelemetry.recordDoorhangerShown(
      this.constructor.telemetryType,
      this.constructor.telemetryObject,
      this.flowId
    );

    let options = {
      ...this.ui.options,
      eventCallback: state => this.onEventCallback(state),
    };

    this.#setAnchor();

    return new Promise(resolve => {
      this.resolve = resolve;
      this.chromeWin.PopupNotifications.show(
        this.browser,
        this.ui.id,
        this.getNotificationHeader?.() ?? "",
        this.ui.anchor.id,
        ...this.#createActions(),
        options
      );
    });
  }

  /**
   * Closes the doorhanger with a given action.
   * This method is specifically intended for closing the doorhanger in scenarios
   * other than clicking the main or secondary buttons.
   */
  closeDoorhanger(action) {
    this.resolve(action);
    const notification = this.chromeWin.PopupNotifications.getNotification(
      this.ui.id,
      this.browser
    );
    if (notification) {
      this.chromeWin.PopupNotifications.remove(notification);
    }
  }

  /**
   * Create an image element for notification anchor if it doesn't already exist.
   */
  #setAnchor() {
    let anchor = this.doc.getElementById(this.ui.anchor.id);
    if (!anchor) {
      // Icon shown on URL bar
      anchor = this.doc.createXULElement("image");
      anchor.id = this.ui.anchor.id;
      anchor.setAttribute("src", this.ui.anchor.URL);
      anchor.classList.add("notification-anchor-icon");
      anchor.setAttribute("role", "button");
      anchor.setAttribute("tooltiptext", this.ui.anchor.tooltiptext);

      const popupBox = this.doc.getElementById("notification-popup-box");
      popupBox.appendChild(anchor);
    }
  }

  /**
   * Generate the main action and secondary actions from content parameters and
   * promise resolve.
   */
  #createActions() {
    function getLabelAndAccessKey(param) {
      const msg = l10n.formatMessagesSync([{ id: param.l10nId }])[0];
      return {
        label: msg.attributes.find(x => x.name == "label").value,
        accessKey: msg.attributes.find(x => x.name == "accessKey").value,
        dismiss: param.dismiss,
      };
    }

    const mainActionParams = this.ui.footer.mainAction;
    const secondaryActionParams = this.ui.footer.secondaryActions;

    const callback = () => {
      AutofillTelemetry.recordDoorhangerClicked(
        this.constructor.telemetryType,
        mainActionParams.callbackState,
        this.constructor.telemetryObject,
        this.flowId
      );

      this.resolve(mainActionParams.callbackState);
    };

    const mainAction = {
      ...getLabelAndAccessKey(mainActionParams),
      callback,
    };

    let secondaryActions = [];
    for (const params of secondaryActionParams) {
      const callback = () => {
        AutofillTelemetry.recordDoorhangerClicked(
          this.constructor.telemetryType,
          params.callbackState,
          this.constructor.telemetryObject,
          this.flowId
        );

        this.resolve(params.callbackState);
      };

      secondaryActions.push({
        ...getLabelAndAccessKey(params),
        callback,
      });
    }

    return [mainAction, secondaryActions];
  }
}

export class AddressSaveDoorhanger extends SsiDoorhanger {
  static preferenceURL = "privacy-address-autofill";
  static learnMoreURL = "automatically-fill-your-address-web-forms";
  static editButtonId = "address-capture-edit-address-button";

  static telemetryType = AutofillTelemetry.ADDRESS;
  static telemetryObject = "capture_doorhanger";

  constructor(browser, preference, data, flowId) {
    super(browser, preference, data, flowId);
  }

  static editButton(panel) {
    return panel.querySelector(`#${AddressSaveDoorhanger.editButtonId}`);
  }
  get editButton() {
    return AddressSaveDoorhanger.editButton(this.panel);
  }

  /**
   * Formats a line by comparing the old and the new address field and returns an array of
   * <span> elements that represents the formatted line.
   *
   * @param {Array<Array<string>>} datalist An array of pairs, where each pair contains old and new data.
   * @param {boolean}              showDiff True to format the text line that highlight the diff part.
   *
   * @returns {Array<HTMLSpanElement>} An array of formatted text elements.
   */
  #formatLine(datalist, showDiff) {
    const createSpan = (text, style = null) => {
      let s;

      if (showDiff) {
        if (style == "remove") {
          s = this.doc.createElement("del");
          s.setAttribute("class", "address-update-text-diff-removed");
        } else if (style == "add") {
          s = this.doc.createElement("mark");
          s.setAttribute("class", "address-update-text-diff-added");
        } else {
          s = this.doc.createElement("span");
        }
      } else {
        s = this.doc.createElement("span");
      }
      s.textContent = text;
      return s;
    };

    let spans = [];
    let previousField;
    for (const [field, oldData, newData] of datalist) {
      if (!oldData && !newData) {
        continue;
      }

      // Always add a whitespace between field data that we put in the same line.
      // Ex. first-name: John, family-name: Doe becomes
      // "John Doe"
      if (spans.length) {
        if (previousField == "address-level2" && field == "address-level1") {
          spans.push(createSpan(", "));
        } else {
          spans.push(createSpan(" "));
        }
      }

      if (!oldData) {
        spans.push(createSpan(newData, "add"));
      } else if (!newData || oldData == newData) {
        // The same
        spans.push(createSpan(oldData));
      } else if (newData.startsWith(oldData)) {
        // Have the same prefix
        const diff = newData.slice(oldData.length).trim();
        spans.push(createSpan(newData.slice(0, newData.length - diff.length)));
        spans.push(createSpan(diff, "add"));
      } else if (newData.endsWith(oldData)) {
        // Have the same suffix
        const diff = newData.slice(0, newData.length - oldData.length).trim();
        spans.push(createSpan(diff, "add"));
        spans.push(createSpan(newData.slice(diff.length)));
      } else {
        spans.push(createSpan(oldData, "remove"));
        spans.push(createSpan(" "));
        spans.push(createSpan(newData, "add"));
      }

      previousField = field;
    }

    return spans;
  }

  #formatTextByAddressCategory(fieldName) {
    let data = [];
    switch (fieldName) {
      case "street-address":
        data = [
          [
            fieldName,
            FormAutofillUtils.toOneLineAddress(
              this.preference["street-address"]
            ),
            FormAutofillUtils.toOneLineAddress(this.data["street-address"]),
          ],
        ];
        break;
      case "address":
        data = [
          [
            "address-level2",
            this.preference["address-level2"],
            this.data["address-level2"],
          ],
          [
            "address-level1",
            FormAutofillUtils.getAbbreviatedSubregionName(
              this.preference["address-level1"],
              this.preference.country
            ) || this.preference["address-level1"],
            FormAutofillUtils.getAbbreviatedSubregionName(
              this.data["address-level1"],
              this.data.country
            ) || this.data["address-level1"],
          ],
          [
            "postal-code",
            this.preference["postal-code"],
            this.data["postal-code"],
          ],
        ];
        break;
      case "name":
      case "country":
      case "tel":
      case "email":
      case "organization":
        data = [[fieldName, this.preference[fieldName], this.data[fieldName]]];
        break;
    }

    const showDiff = !!Object.keys(this.preference).length;
    return this.#formatLine(data, showDiff);
  }

  renderDescription() {
    // if (lazy.formAutofillStorage.addresses.isEmpty()) {
    super.renderDescription();
    // } else {
    //   this.description?.setAttribute("style", "display:none");
    // }
  }

  renderContent() {
    this.content.replaceChildren();

    // Each section contains address fields that are grouped together while displaying
    // the doorhanger.
    for (const { imgClass, categories } of this.ui.content.sections) {
      // Add all the address fields that are in the same category
      let texts = [];
      categories.forEach(category => {
        // const line = this.#formatTextByAddressCategory(category);
        // if (line.length) {
        //   texts.push(line);
        // }
      });

      const s = this.doc.createElement("span");
      s.textContent = "違う、違う、そうじゃない\n Here is on URL address bar";
      texts.push([s]);

      // If there is no data for this section, just ignore it.
      if (!texts.length) {
        continue;
      }

      const section = this.doc.createElement("div");
      section.setAttribute("class", "address-save-update-row-container");

      // Add image icon for this section
      //const img = this.doc.createElement("img");
      const img = this.doc.createXULElement("image");
      img.setAttribute("class", imgClass);
      // ToDo: provide meaningful alt values (bug 1870155):
      img.setAttribute("alt", "");
      section.appendChild(img);

      // Each line is consisted of multiple <span> to form diff style texts
      const lineContainer = this.doc.createElement("div");
      for (const spans of texts) {
        const p = this.doc.createElement("p");
        spans.forEach(span => p.appendChild(span));
        lineContainer.appendChild(p);
      }
      section.appendChild(lineContainer);

      this.content.appendChild(section);

      // Put the edit address button in the first section
      if (!AddressSaveDoorhanger.editButton(this.panel)) {
        const button = this.doc.createElement("button");
        button.setAttribute("id", AddressSaveDoorhanger.editButtonId);
        button.setAttribute("class", "address-capture-icon-button");
        this.doc.l10n.setAttributes(
          button,
          "address-capture-edit-address-button"
        );

        // The element will be removed after the popup is closed
        /* eslint-disable mozilla/balanced-listeners */
        button.addEventListener("click", event => {
          event.stopPropagation();
          this.closeDoorhanger("edit-address");
        });
        section.appendChild(button);
      }
    }
  }

  // The record to be saved by this doorhanger
  recordToSave() {
    return this.data;
  }
}

CONTENT = {
  [AddressSaveDoorhanger.name]: {
    id: "address-save-update",
    anchor: {
      id: "autofill-address-notification-icon",
      URL: "chrome://formautofill/content/formfill-anchor.svg",
      tooltiptext: l10n.formatValueSync("autofill-message-tooltip"),
    },
    header: {
      l10nId: "address-capture-save-doorhanger-header",
    },
    description: {
      l10nId: "address-capture-save-doorhanger-description",
    },
    menu: [
      {
        l10nId: "address-capture-manage-address-button",
        evt: "open-pref",
      },
      {
        l10nId: "address-capture-learn-more-button",
        evt: "learn-more",
      },
    ],
    content: {
      // We divide address data into two sections to display in the Address Save Doorhanger.
      sections: [
        {
          imgClass: "address-capture-img-address",
          categories: [
            "name",
            "organization",
            "street-address",
            "address",
            "country",
          ],
        },
        {
          imgClass: "address-capture-img-email",
          categories: ["email", "tel"],
        },
      ],
    },
    footer: {
      mainAction: {
        l10nId: "address-capture-save-button",
        callbackState: "create",
      },
      secondaryActions: [
        {
          l10nId: "address-capture-not-now-button",
          callbackState: "cancel",
        },
      ],
    },
    options: {
      autofocus: true,
      persistWhileVisible: true,
      hideClose: true,
    },
  },
};

export let SsiPrompter = {
  /**
   * Show save or update address doorhanger
   *
   * @param {Element<browser>} browser  Browser to show the save/update address prompt
   * @param {string} flowId Unique GUID to record a series of the same user action
   * @param {object} options
   * @param {object} [options.preference] Record to be merged
   * @param {object} [options.data] Record with more information
   */
  async promptToSaveAddress(browser, flowId, { preference, data }) {
    lazy.log.debug(`Show the save address doorhanger`);

    const { ownerGlobal: win } = browser;
    win.MozXULElement.insertFTLIfNeeded(
      "toolkit/formautofill/formAutofill.ftl"
    );
    // address-autofill-* are defined in browser/preferences now
    win.MozXULElement.insertFTLIfNeeded("browser/preferences/formAutofill.ftl");

    const doorhanger = new AddressSaveDoorhanger(
      browser,
      preference,
      data,
      flowId
    );
    const action = await doorhanger.show();

    lazy.log.debug(`Doorhanger action is ${action}`);

    if (action == "cancel") {
      return;
    }

    this._updateStorageAfterInteractWithPrompt(doorhanger.recordToSave());
  },

  async _updateStorageAfterInteractWithPrompt(newRecord) {
    let changedGUID = null;
    // Save to AuthCache
  },
};
