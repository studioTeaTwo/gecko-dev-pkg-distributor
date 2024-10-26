/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// _AboutIdentity is only exported for testing
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs"
import { E10SUtils } from "resource://gre/modules/E10SUtils.sys.mjs"

const lazy = {}

ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
  OSKeyStore: "resource://gre/modules/OSKeyStore.sys.mjs",
})

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  return lazy.SsiHelper.createLogger("AboutIdentityParent")
})
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "OS_AUTH_ENABLED",
  "signon.management.page.os-auth.enabled",
  true
)
ChromeUtils.defineLazyGetter(lazy, "AboutIdentityL10n", () => {
  return new Localization(["branding/brand.ftl", "browser/aboutIdentity.ftl"])
})

const ABOUT_IDENTITY_ORIGIN = "about:identity"
const AUTH_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const PRIMARY_PASSWORD_NOTIFICATION_ID = "primary-password-login-required"

// about:identity will always use the privileged content process,
// even if it is disabled for other consumers such as about:newtab.
const EXPECTED_ABOUTIDENTITY_REMOTE_TYPE = E10SUtils.PRIVILEGEDABOUT_REMOTE_TYPE
const convertSubjectToCredential = (subject) => {
  subject
    .QueryInterface(Ci.nsICredentialMetaInfo)
    .QueryInterface(Ci.nsICredentialInfo)
  const credential = lazy.SsiHelper.credentialToVanillaObject(subject)
  return credential
}

export class AboutIdentityParent extends JSWindowActorParent {
  async receiveMessage(message) {
    if (!this.browsingContext.embedderElement) {
      return
    }

    // Only respond to messages sent from a privlegedabout process. Ideally
    // we would also check the contentPrincipal.originNoSuffix but this
    // check has been removed due to bug 1576722.
    // TODO: (ssb) review security
    // if (
    //   this.browsingContext.embedderElement.remoteType !=
    //   EXPECTED_ABOUTLOGINS_REMOTE_TYPE
    // ) {
    //   throw new Error(
    //     `AboutIdentityParent: Received ${message.name} message the remote type didn't match expectations: ${this.browsingContext.embedderElement.remoteType} == ${EXPECTED_ABOUTLOGINS_REMOTE_TYPE}`
    //   )
    // }

    AboutIdentity.subscribers.add(this.browsingContext)

    switch (message.name) {
      case "AboutIdentity:GetAllCredentials": {
        this.#getAllCredentials()
        break
      }
      case "AboutIdentity:CreateCredential": {
        await this.#createCredential(message.data.credential)
        break
      }
      case "AboutIdentity:DeleteCredential": {
        this.#deleteCredential(message.data.credential)
        break
      }
      case "AboutIdentity:PrimaryPasswordRequest": {
        await this.#primaryPasswordRequest(message.data)
        break
      }
      case "AboutIdentity:Subscribe": {
        await this.#subscribe()
        break
      }
      case "AboutIdentity:UpdateCredential": {
        this.#updateCredential(message.data.credential)
        break
      }
      case "AboutIdentity:RemoveAllCredentials": {
        this.#removeAllCredentials()
        break
      }
      case "AboutIdentity:PrimaryChanged": {
        this.#primaryChanged(message.data.changeSet)
        break
      }
    }
  }

  get #ownerGlobal() {
    return this.browsingContext.embedderElement.ownerGlobal
  }

  async #getAllCredentials() {
    const credentials = await AboutIdentity.getAllCredentials()
    this.sendAsyncMessage("AboutIdentity:AllCredentials", credentials)
  }

  async #createCredential(newCredential) {
    // TODO: (ssb) review OS Auth later
    // if (!Services.policies.isAllowed("removeMasterPassword")) {
    //   if (!lazy.SsiHelper.isPrimaryPasswordSet()) {
    //     this.#ownerGlobal.openDialog(
    //       "chrome://mozapps/content/preferences/changemp.xhtml",
    //       "",
    //       "centerscreen,chrome,modal,titlebar"
    //     );
    //     if (!lazy.SsiHelper.isPrimaryPasswordSet()) {
    //       return;
    //     }
    //   }
    // }
    newCredential = lazy.SsiHelper.vanillaObjectToCredential(newCredential)
    try {
      await Services.ssi.addCredentialAsync(newCredential)
    } catch (error) {
      this.#handleCredentialStorageErrors(newCredential, error)
    }
  }

  #deleteCredential(credentialObject) {
    let credential = lazy.SsiHelper.vanillaObjectToCredential(credentialObject)
    Services.ssi.removeCredential(credential)
  }

  async #primaryPasswordRequest(messageId) {
    if (!messageId) {
      throw new Error("AboutIdentity:PrimaryPasswordRequest: no messageId.")
    }
    let messageText = { value: "NOT SUPPORTED" }
    let captionText = { value: "" }

    // This feature is only supported on Windows and macOS
    // but we still call in to OSKeyStore on Linux to get
    // the proper auth_details for Telemetry.
    // See bug 1614874 for Linux support.
    if (lazy.OS_AUTH_ENABLED && lazy.OSKeyStore.canReauth()) {
      messageId += "-" + AppConstants.platform
      ;[messageText, captionText] = await lazy.AboutIdentityL10n.formatMessages(
        [
          {
            id: messageId,
          },
          {
            id: "about-identity-os-auth-dialog-caption",
          },
        ]
      )
    }

    let { isAuthorized, telemetryEvent } = await lazy.SsiHelper.requestReauth(
      this.browsingContext.embedderElement,
      lazy.OS_AUTH_ENABLED,
      AboutIdentity._authExpirationTime,
      messageText.value,
      captionText.value
    )
    this.sendAsyncMessage("AboutIdentity:PrimaryPasswordResponse", {
      result: isAuthorized,
      telemetryEvent,
    })
    if (isAuthorized) {
      AboutIdentity._authExpirationTime = Date.now() + AUTH_TIMEOUT_MS
      const remaskPasswords = () => {
        this.sendAsyncMessage("AboutIdentity:RemaskPassword")
      }
      clearTimeout(_gPasswordRemaskTimeout)
      _gPasswordRemaskTimeout = setTimeout(remaskPasswords, AUTH_TIMEOUT_MS)
    }
  }

  async #subscribe() {
    AboutIdentity.addObservers()

    const credentials = await AboutIdentity.getAllCredentials()
    try {
      this.sendAsyncMessage("AboutIdentity:Setup", {
        credentials,
        primaryPasswordEnabled: lazy.SsiHelper.isPrimaryPasswordSet(),
        passwordRevealVisible: Services.policies.isAllowed("passwordReveal"),
      })
    } catch (ex) {
      if (ex.result != Cr.NS_ERROR_NOT_INITIALIZED) {
        throw ex
      }

      // The message manager may be destroyed before the replies can be sent.
      lazy.log.debug(
        "AboutIdentity:Subscribe: exception when replying with credentials",
        ex
      )
    }
  }

  async #updateCredential(credentialUpdates) {
    let credentials = await Services.ssi.searchCredentialsAsync({
      guid: credentialUpdates.guid,
    })
    if (credentials.length != 1) {
      lazy.log.warn(
        `AboutIdentity:UpdateCredential: expected to find a credential for guid: ${credentialUpdates.guid} but found ${credentials.length}`
      )
      return
    }

    let modifiedCredential = credentials[0].clone()
    if (credentialUpdates.hasOwnProperty("primary")) {
      modifiedCredential.primary = credentialUpdates.primary
    }
    if (credentialUpdates.hasOwnProperty("secret")) {
      modifiedCredential.secret = credentialUpdates.secret
    }
    if (credentialUpdates.hasOwnProperty("identifier")) {
      modifiedCredential.identifier = credentialUpdates.identifier
    }
    if (credentialUpdates.hasOwnProperty("properties")) {
      modifiedCredential.properties = credentialUpdates.properties
    }
    try {
      Services.ssi.modifyCredential(credentials[0], modifiedCredential)
    } catch (error) {
      this.#handleCredentialStorageErrors(modifiedCredential, error)
    }
  }

  #removeAllCredentials() {
    Services.ssi.removeAllCredentials()
  }

  #primaryChanged(changeSet) {
    const guid = Cc["@mozilla.org/supports-string;1"].createInstance(
      Ci.nsISupportsString
    )
    guid.data = changeSet.guid

    switch (changeSet.protocolName) {
      case "nostr": {
        Services.obs.notifyObservers(guid, "SSI_PRIMARY_KEY_CHANGED_IN_NOSTR")
        break
      }
    }
  }

  #handleCredentialStorageErrors(credential, error) {
    let messageObject = {
      credential: lazy.SsiHelper.credentialToVanillaObject(credential),
      errorMessage: error.message,
    }

    if (error.message.includes("This credential already exists")) {
      // See comment in SsiHelper.createCredentialAlreadyExistsError as to
      // why we need to call .toString() on the nsISupportsString.
      messageObject.existingCredentialGuid = error.data.toString()
    }

    this.sendAsyncMessage(
      "AboutIdentity:ShowCredentialItemError",
      messageObject
    )
  }
}

class AboutIdentityInternal {
  subscribers = new WeakSet()
  #observersAdded = false
  authExpirationTime = Number.NEGATIVE_INFINITY

  async observe(subject, topic, type) {
    if (!ChromeUtils.nondeterministicGetWeakSetKeys(this.subscribers).length) {
      this.#removeObservers()
      return
    }

    switch (topic) {
      case "ssi-reload-all": {
        await this.#reloadAllCredentials()
        break
      }
      case "ssi-crypto-credential": {
        this.#removeNotifications(PRIMARY_PASSWORD_NOTIFICATION_ID)
        await this.#reloadAllCredentials()
        break
      }
      case "ssi-crypto-credentialCanceled": {
        this.#showPrimaryPasswordLoginNotifications()
        break
      }
      case "ssi-storage-changed": {
        switch (type) {
          case "addCredential": {
            await this.#addCredential(subject)
            break
          }
          case "modifyCredential": {
            this.#modifyCredential(subject)
            break
          }
          case "removeCredential": {
            this.#removeCredential(subject)
            break
          }
          case "removeAllCredentials": {
            this.#removeAllCredentials()
            break
          }
        }
      }
    }
  }

  async #addCredential(subject) {
    const credential = convertSubjectToCredential(subject)
    if (!credential) {
      return
    }

    this.#messageSubscribers("AboutIdentity:CredentialAdded", credential)
  }

  async #modifyCredential(subject) {
    subject.QueryInterface(Ci.nsIArrayExtensions)
    const credential = convertSubjectToCredential(subject.GetElementAt(1))
    if (!credential) {
      return
    }

    this.#messageSubscribers("AboutIdentity:CredentialModified", credential)
  }

  #removeCredential(subject) {
    const credential = convertSubjectToCredential(subject)
    if (!credential) {
      return
    }
    this.#messageSubscribers("AboutIdentity:CredentialRemoved", credential)
  }

  #removeAllCredentials() {
    this.#messageSubscribers("AboutIdentity:RemoveAllCredentials", [])
  }

  async #reloadAllCredentials() {
    let credentials = await this.getAllCredentials()
    this.#messageSubscribers("AboutIdentity:AllCredentials", credentials)
  }

  #showPrimaryPasswordLoginNotifications() {
    this.#showNotifications({
      id: PRIMARY_PASSWORD_NOTIFICATION_ID,
      priority: "PRIORITY_WARNING_MEDIUM",
      iconURL: "chrome://browser/skin/login.svg",
      messageId: "about-identity-primary-password-notification-message",
      buttonIds: ["master-password-reload-button"],
      onClicks: [
        function onReloadClick(browser) {
          browser.reload()
        },
      ],
    })
    this.#messageSubscribers("AboutIdentity:PrimaryPasswordAuthRequired")
  }

  #showNotifications({
    id,
    priority,
    iconURL,
    messageId,
    buttonIds,
    onClicks,
    extraFtl = [],
  } = {}) {
    for (let subscriber of this.#subscriberIterator()) {
      let browser = subscriber.embedderElement
      let MozXULElement = browser.ownerGlobal.MozXULElement
      MozXULElement.insertFTLIfNeeded("browser/aboutIdentity.ftl")
      for (let ftl of extraFtl) {
        MozXULElement.insertFTLIfNeeded(ftl)
      }

      // If there's already an existing notification bar, don't do anything.
      let { gBrowser } = browser.ownerGlobal
      let notificationBox = gBrowser.getNotificationBox(browser)
      let notification = notificationBox.getNotificationWithValue(id)
      if (notification) {
        continue
      }

      let buttons = []
      for (let i = 0; i < buttonIds.length; i++) {
        buttons[i] = {
          "l10n-id": buttonIds[i],
          popup: null,
          callback: () => {
            onClicks[i](browser)
          },
        }
      }

      notification = notificationBox.appendNotification(
        id,
        {
          label: { "l10n-id": messageId },
          image: iconURL,
          priority: notificationBox[priority],
        },
        buttons
      )
    }
  }

  #removeNotifications(notificationId) {
    for (let subscriber of this.#subscriberIterator()) {
      let browser = subscriber.embedderElement
      let { gBrowser } = browser.ownerGlobal
      let notificationBox = gBrowser.getNotificationBox(browser)
      let notification =
        notificationBox.getNotificationWithValue(notificationId)
      if (!notification) {
        continue
      }
      notificationBox.removeNotification(notification)
    }
  }

  *#subscriberIterator() {
    let subscribers = ChromeUtils.nondeterministicGetWeakSetKeys(
      this.subscribers
    )
    for (let subscriber of subscribers) {
      let browser = subscriber.embedderElement
      // TODO: (ssb) review security
      // if (
      //   browser?.remoteType != EXPECTED_ABOUTIDENTITY_REMOTE_TYPE ||
      //   browser?.contentPrincipal?.originNoSuffix != ABOUT_IDENTITY_ORIGIN
      // ) {
      //   this.subscribers.delete(subscriber)
      //   continue
      // }
      yield subscriber
    }
  }

  #messageSubscribers(name, details) {
    for (let subscriber of this.#subscriberIterator()) {
      try {
        if (subscriber.currentWindowGlobal) {
          let actor = subscriber.currentWindowGlobal.getActor("AboutIdentity")
          actor.sendAsyncMessage(name, details)
        }
      } catch (ex) {
        if (ex.result == Cr.NS_ERROR_NOT_INITIALIZED) {
          // The actor may be destroyed before the message is sent.
          lazy.log.debug(
            "messageSubscribers: exception when calling sendAsyncMessage",
            ex
          )
        } else {
          throw ex
        }
      }
    }
  }

  async getAllCredentials() {
    try {
      let credentials = await lazy.SsiHelper.getAllCredentials()
      return credentials.map(lazy.SsiHelper.credentialToVanillaObject)
    } catch (e) {
      if (e.result == Cr.NS_ERROR_ABORT) {
        // If the user cancels the MP prompt then return no credentials.
        return []
      }
      throw e
    }
  }

  #observedTopics = [
    "ssi-crypto-credential",
    "ssi-crypto-credentialCanceled",
    "ssi-storage-changed",
    "ssi-reload-all",
  ]

  addObservers() {
    if (!this.#observersAdded) {
      for (const topic of this.#observedTopics) {
        Services.obs.addObserver(this, topic)
      }
      this.#observersAdded = true
    }
  }

  #removeObservers() {
    for (const topic of this.#observedTopics) {
      Services.obs.removeObserver(this, topic)
    }
    this.#observersAdded = false
  }
}

let AboutIdentity = new AboutIdentityInternal()
export var _AboutIdentity = AboutIdentity
