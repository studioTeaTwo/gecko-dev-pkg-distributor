/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// _AboutSelfsovereignidentity is only exported for testing
import { setTimeout, clearTimeout } from "resource://gre/modules/Timer.sys.mjs"

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs"
import { E10SUtils } from "resource://gre/modules/E10SUtils.sys.mjs"

const lazy = {}

ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
})

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  return lazy.SsiHelper.createLogger("AboutSelfsovereignidentityParent")
})
// TODO(ssb): reconsider later
// ChromeUtils.defineLazyGetter(lazy, "AboutSelfsovereignidentityL10n", () => {
//   return new Localization(["branding/brand.ftl", "browser/aboutSelfsovereignidentity.ftl"])
// })

const ABOUT_ABOUTSELFSOVEREIGNIDENTITY_ORIGIN = "about:selfsovereignidentity"
const AUTH_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const PRIMARY_PASSWORD_NOTIFICATION_ID = "primary-password-login-required"

// about:selfsovereignidentity will always use the privileged content process,
// even if it is disabled for other consumers such as about:newtab.
const EXPECTED_ABOUTSELFSOVEREIGNIDENTITY_REMOTE_TYPE =
  E10SUtils.PRIVILEGEDABOUT_REMOTE_TYPE
let _gPasswordRemaskTimeout = null
const convertSubjectToCredential = (subject) => {
  subject
    .QueryInterface(Ci.nsICredentialMetaInfo)
    .QueryInterface(Ci.nsICredentialInfo)
  const credential = lazy.SsiHelper.credentialToVanillaObject(subject)
  return credential
}

export class AboutSelfsovereignidentityParent extends JSWindowActorParent {
  async receiveMessage(message) {
    if (!this.browsingContext.embedderElement) {
      return
    }

    // Only respond to messages sent from a privlegedabout process. Ideally
    // we would also check the contentPrincipal.originNoSuffix but this
    // check has been removed due to bug 1576722.
    if (
      this.browsingContext.embedderElement.remoteType !=
      EXPECTED_ABOUTSELFSOVEREIGNIDENTITY_REMOTE_TYPE
    ) {
      throw new Error(
        `AboutSelfsovereignidentityParent: Received ${message.name} message the remote type didn't match expectations: ${this.browsingContext.embedderElement.remoteType} == ${EXPECTED_ABOUTSELFSOVEREIGNIDENTITY_REMOTE_TYPE}`
      )
    }

    AboutSelfsovereignidentity.subscribers.add(this.browsingContext)

    switch (message.name) {
      case "AboutSelfsovereignidentity:GetAllCredentials": {
        this.#getAllCredentials()
        break
      }
      case "AboutSelfsovereignidentity:CreateCredential": {
        await this.#createCredential(message.data.credential)
        break
      }
      case "AboutSelfsovereignidentity:DeleteCredential": {
        this.#deleteCredential(message.data.credential)
        break
      }
      case "AboutSelfsovereignidentity:PrimaryPasswordRequest": {
        await this.#primaryPasswordRequest(message.data)
        break
      }
      case "AboutSelfsovereignidentity:Subscribe": {
        await this.#subscribe()
        break
      }
      case "AboutSelfsovereignidentity:UpdateCredential": {
        this.#updateCredential(message.data.credential)
        break
      }
      case "AboutSelfsovereignidentity:RemoveAllCredentials": {
        this.#removeAllCredentials()
        break
      }
      case "AboutSelfsovereignidentity:PrimaryChanged": {
        this.#primaryChanged(message.data.changeSet)
        break
      }
      case "AboutSelfsovereignidentity:PrefChanged": {
        this.#prefChanged(message.data.changeSet)
        break
      }
    }
  }

  get #ownerGlobal() {
    return this.browsingContext.embedderElement.ownerGlobal
  }

  async #getAllCredentials() {
    const credentials = await AboutSelfsovereignidentity.getAllCredentials()
    this.sendAsyncMessage(
      "AboutSelfsovereignidentity:AllCredentials",
      credentials
    )
  }

  async #createCredential(newCredential) {
    // TODO(ssb): reconsider whether it needs.
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
      throw new Error(
        "AboutSelfsovereignidentity:PrimaryPasswordRequest: no messageId."
      )
    }
    // TODO(ssb): reconsider later
    // let messageText = { value: "NOT SUPPORTED" }
    let messageText =
      messageId ===
      "about-selfsovereignidentity-access-secrets-os-auth-dialog-message"
        ? { value: "ACCESS YOUR KEY" }
        : { value: "AUTH LOCK" }
    let captionText = { value: "" }

    const isOSAuthEnabled = lazy.SsiHelper.getOSAuthEnabled(
      lazy.SsiHelper.OS_AUTH_FOR_PASSWORDS_PREF
    )

    // This feature is only supported on Windows and macOS
    // but we still call in to OSKeyStore on Linux to get
    // the proper auth_details for Telemetry.
    // See bug 1614874 for Linux support.
    if (isOSAuthEnabled) {
      messageId += "-" + AppConstants.platform
      // TODO(ssb): reconsider later
      // [messageText, captionText] =
      //   await lazy.AboutSelfsovereignidentityL10n.formatMessages([
      //     {
      //       id: messageId,
      //     },
      //     {
      //       id: "about-selfsovereignidentity-os-auth-dialog-caption",
      //     },
      //   ])
    }

    let { isAuthorized, telemetryEvent } = await lazy.SsiHelper.requestReauth(
      this.browsingContext.embedderElement,
      isOSAuthEnabled,
      AboutSelfsovereignidentity._authExpirationTime,
      messageText.value,
      captionText.value
    )
    this.sendAsyncMessage(
      "AboutSelfsovereignidentity:PrimaryPasswordResponse",
      {
        result: isAuthorized,
        telemetryEvent,
      }
    )
    if (isAuthorized) {
      AboutSelfsovereignidentity._authExpirationTime =
        Date.now() + AUTH_TIMEOUT_MS
      const remaskPasswords = () => {
        this.sendAsyncMessage("AboutSelfsovereignidentity:RemaskPassword")
      }
      clearTimeout(_gPasswordRemaskTimeout)
      _gPasswordRemaskTimeout = setTimeout(remaskPasswords, AUTH_TIMEOUT_MS)
    }
  }

  async #subscribe() {
    AboutSelfsovereignidentity._authExpirationTime = Number.NEGATIVE_INFINITY
    AboutSelfsovereignidentity.addObservers()

    const credentials = await AboutSelfsovereignidentity.getAllCredentials()
    try {
      this.sendAsyncMessage("AboutSelfsovereignidentity:Setup", {
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
        "AboutSelfsovereignidentity:Subscribe: exception when replying with credentials",
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
        `AboutSelfsovereignidentity:UpdateCredential: expected to find a credential for guid: ${credentialUpdates.guid} but found ${credentials.length}`
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
    if (credentialUpdates.hasOwnProperty("trustedSites")) {
      modifiedCredential.trustedSites = credentialUpdates.trustedSites
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

  #prefChanged(changeSet) {
    if (changeSet.hasOwnProperty("enabled")) {
      Services.prefs.setBoolPref(
        `selfsovereignidentity.${changeSet.protocolName}.enabled`,
        changeSet.enabled
      )
    }
    if (changeSet.hasOwnProperty("usedPrimarypasswordToSettings")) {
      Services.prefs.setBoolPref(
        `selfsovereignidentity.${changeSet.protocolName}.primarypassword.toSettings.enabled`,
        changeSet.usedPrimarypasswordToSettings
      )
    }
    if (changeSet.hasOwnProperty("expiryTimeForPrimarypasswordToSettings")) {
      Services.prefs.setIntPref(
        `selfsovereignidentity.${changeSet.protocolName}.primarypassword.toSettings.expiryTime`,
        changeSet.expiryTimeForPrimarypasswordToSettings
      )
    }
    if (changeSet.hasOwnProperty("usedPrimarypasswordToApps")) {
      Services.prefs.setBoolPref(
        `selfsovereignidentity.${changeSet.protocolName}.primarypassword.toApps.enabled`,
        changeSet.usedPrimarypasswordToApps
      )
    }
    if (changeSet.hasOwnProperty("expiryTimeForPrimarypasswordToApps")) {
      Services.prefs.setIntPref(
        `selfsovereignidentity.${changeSet.protocolName}.primarypassword.toApps.expiryTime`,
        changeSet.expiryTimeForPrimarypasswordToApps
      )
    }
    if (changeSet.hasOwnProperty("usedTrustedSites")) {
      Services.prefs.setBoolPref(
        `selfsovereignidentity.${changeSet.protocolName}.trustedSites.enabled`,
        changeSet.usedTrustedSites
      )
    }
    if (changeSet.hasOwnProperty("usedAccountChanged")) {
      Services.prefs.setBoolPref(
        `selfsovereignidentity.${changeSet.protocolName}.event.accountChanged.enabled`,
        changeSet.usedAccountChanged
      )
    }
    if (changeSet.protocolName === "nostr") {
      if (changeSet.hasOwnProperty("usedBuiltInNip07")) {
        Services.prefs.setBoolPref(
          "selfsovereignidentity.nostr.builtInNip07.enabled",
          changeSet.usedBuiltInNip07
        )
      }

      this.sendAsyncMessage("AboutSelfsovereignidentity:Prefs", {
        [changeSet.protocolName]: { ...changeSet },
      })
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
      "AboutSelfsovereignidentity:ShowCredentialItemError",
      messageObject
    )
  }
}

class AboutSelfsovereignidentityInternal {
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

    this.#messageSubscribers(
      "AboutSelfsovereignidentity:CredentialAdded",
      credential
    )
  }

  async #modifyCredential(subject) {
    subject.QueryInterface(Ci.nsIArrayExtensions)
    const credential = convertSubjectToCredential(subject.GetElementAt(1))
    if (!credential) {
      return
    }

    this.#messageSubscribers(
      "AboutSelfsovereignidentity:CredentialModified",
      credential
    )
  }

  #removeCredential(subject) {
    const credential = convertSubjectToCredential(subject)
    if (!credential) {
      return
    }
    this.#messageSubscribers(
      "AboutSelfsovereignidentity:CredentialRemoved",
      credential
    )
  }

  #removeAllCredentials() {
    this.#messageSubscribers(
      "AboutSelfsovereignidentity:RemoveAllCredentials",
      []
    )
  }

  async #reloadAllCredentials() {
    let credentials = await this.getAllCredentials()
    this.#messageSubscribers(
      "AboutSelfsovereignidentity:AllCredentials",
      credentials
    )
  }

  #showPrimaryPasswordLoginNotifications() {
    this.#showNotifications({
      id: PRIMARY_PASSWORD_NOTIFICATION_ID,
      priority: "PRIORITY_WARNING_MEDIUM",
      iconURL: "chrome://browser/skin/login.svg",
      messageId:
        "about-selfsovereignidentity-primary-password-notification-message",
      buttonIds: ["master-password-reload-button"],
      onClicks: [
        function onReloadClick(browser) {
          browser.reload()
        },
      ],
    })
    this.#messageSubscribers(
      "AboutSelfsovereignidentity:PrimaryPasswordAuthRequired"
    )
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
      if (
        browser?.remoteType !=
          EXPECTED_ABOUTSELFSOVEREIGNIDENTITY_REMOTE_TYPE ||
        browser?.contentPrincipal?.originNoSuffix !=
          ABOUT_ABOUTSELFSOVEREIGNIDENTITY_ORIGIN
      ) {
        this.subscribers.delete(subscriber)
        continue
      }
      yield subscriber
    }
  }

  #messageSubscribers(name, details) {
    for (let subscriber of this.#subscriberIterator()) {
      try {
        if (subscriber.currentWindowGlobal) {
          let actor = subscriber.currentWindowGlobal.getActor(
            "AboutSelfsovereignidentity"
          )
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

let AboutSelfsovereignidentity = new AboutSelfsovereignidentityInternal()
export var _AboutSelfsovereignidentity = AboutSelfsovereignidentity
