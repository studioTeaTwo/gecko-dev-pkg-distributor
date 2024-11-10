/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SsiHelper } from "resource://gre/modules/SsiHelper.sys.mjs"

const TELEMETRY_EVENT_CATEGORY = "ssi"
const TELEMETRY_MIN_MS_BETWEEN_OPEN_MANAGEMENT = 5000

let gLastOpenManagementBrowserId = null
let gLastOpenManagementEventTime = Number.NEGATIVE_INFINITY
let gPrimaryPasswordPromise

function recordTelemetryEvent(event) {
  try {
    let { method, object, extra = {}, value = null } = event
    Services.telemetry.recordEvent(
      TELEMETRY_EVENT_CATEGORY,
      method,
      object,
      value,
      extra
    )
  } catch (ex) {
    console.error(
      "AboutSelfsovereignidentityChild: error recording telemetry event:",
      ex
    )
  }
}

export class AboutSelfsovereignidentityChild extends JSWindowActorChild {
  handleEvent(event) {
    switch (event.type) {
      case "AboutSelfsovereignidentityInit": {
        this.#aboutIdentityInit()
        break
      }
      case "AboutSelfsovereignidentityGetAllCredentials": {
        this.#aboutIdentityGetAllCredentials()
        break
      }
      case "AboutSelfsovereignidentityCreateCredential": {
        this.#aboutIdentityCreateCredential(event.detail)
        break
      }
      case "AboutSelfsovereignidentityDeleteCredential": {
        this.#aboutIdentityDeleteCredential(event.detail)
        break
      }
      case "AboutSelfsovereignidentityRecordTelemetryEvent": {
        this.#aboutIdentityRecordTelemetryEvent(event)
        break
      }
      case "AboutSelfsovereignidentityRemoveAllCredentials": {
        this.#aboutIdentityRemoveAllCredentials()
        break
      }
      case "AboutSelfsovereignidentityUpdateCredential": {
        this.#aboutIdentityUpdateCredential(event.detail)
        break
      }
      case "AboutSelfsovereignidentityPrimaryChanged": {
        this.#aboutIdentityPrimaryChanged(event.detail)
        break
      }
      case "AboutSelfsovereignidentityPrefChanged": {
        this.#aboutIdentityPrefChanged(event.detail)
        break
      }
    }
  }

  #aboutIdentityInit() {
    this.sendAsyncMessage("AboutSelfsovereignidentity:Subscribe")

    let win = this.browsingContext.window
    let waivedContent = Cu.waiveXrays(win)
    let that = this
    let AboutSelfsovereignidentityUtils = {
      // List things to share with app through `window`
      doCredentialMatch(credentialA, credentialB) {
        return SsiHelper.doCredentialMatch(credentialA, credentialB, {})
      },
      /**
       * Shows the Primary Password prompt if enabled, or the
       * OS auth dialog otherwise.
       * @param resolve Callback that is called with result of authentication.
       * @param messageId The string ID that corresponds to a string stored in aboutIdentity.ftl.
       *                  This string will be displayed only when the OS auth dialog is used.
       */
      async promptForPrimaryPassword(resolve, messageId) {
        gPrimaryPasswordPromise = {
          resolve,
        }

        that.sendAsyncMessage(
          "AboutSelfsovereignidentity:PrimaryPasswordRequest",
          messageId
        )

        return gPrimaryPasswordPromise
      },
      // Default to enabled just in case a search is attempted before we get a response.
      primaryPasswordEnabled: true,
      passwordRevealVisible: true,
    }
    waivedContent.AboutSelfsovereignidentityUtils = Cu.cloneInto(
      AboutSelfsovereignidentityUtils,
      waivedContent,
      {
        cloneFunctions: true,
      }
    )

    const nostr = {
      protocolName: "nostr",
      enabled: Services.prefs.getBoolPref(
        "selfsovereignidentity.nostr.enabled"
      ),
      usedPrimarypasswordToSettings: Services.prefs.getBoolPref(
        "selfsovereignidentity.nostr.primarypassword.toSettings.enabled"
      ),
      usedPrimarypasswordToApps: Services.prefs.getBoolPref(
        "selfsovereignidentity.nostr.primarypassword.toApps.enabled"
      ),
      usedTrustedSites: Services.prefs.getBoolPref(
        "selfsovereignidentity.nostr.trustedSites.enabled"
      ),
      usedBuiltInNip07: Services.prefs.getBoolPref(
        "selfsovereignidentity.nostr.builtInNip07.enabled"
      ),
      usedAccountChanged: Services.prefs.getBoolPref(
        "selfsovereignidentity.nostr.event.accountChanged.enabled"
      ),
    }
    this.sendToContent("Prefs", nostr)
  }

  #aboutIdentityGetAllCredentials() {
    this.sendAsyncMessage("AboutSelfsovereignidentity:GetAllCredentials")
  }

  #aboutIdentityCreateCredential(credential) {
    this.sendAsyncMessage("AboutSelfsovereignidentity:CreateCredential", {
      credential,
    })
  }

  #aboutIdentityDeleteCredential(credential) {
    this.sendAsyncMessage("AboutSelfsovereignidentity:DeleteCredential", {
      credential,
    })
  }

  #aboutIdentityRecordTelemetryEvent(event) {
    let { method } = event.detail

    if (method == "open_management") {
      let { docShell } = this.browsingContext
      // Compare to the last time open_management was recorded for the same
      // outerWindowID to not double-count them due to a redirect to remove
      // the entryPoint query param (since replaceState isn't allowed for
      // about:). Don't use performance.now for the tab since you can't
      // compare that number between different tabs and this JSM is shared.
      let now = docShell.now()
      if (
        this.browsingContext.browserId == gLastOpenManagementBrowserId &&
        now - gLastOpenManagementEventTime <
          TELEMETRY_MIN_MS_BETWEEN_OPEN_MANAGEMENT
      ) {
        return
      }
      gLastOpenManagementEventTime = now
      gLastOpenManagementBrowserId = this.browsingContext.browserId
    }
    recordTelemetryEvent(event.detail)
  }

  #aboutIdentityRemoveAllCredentials() {
    this.sendAsyncMessage("AboutSelfsovereignidentity:RemoveAllCredentials")
  }

  #aboutIdentityUpdateCredential(credential) {
    this.sendAsyncMessage("AboutSelfsovereignidentity:UpdateCredential", {
      credential,
    })
  }

  #aboutIdentityPrimaryChanged(changeSet) {
    this.sendAsyncMessage("AboutSelfsovereignidentity:PrimaryChanged", {
      changeSet,
    })
  }

  #aboutIdentityPrefChanged(changeSet) {
    this.sendAsyncMessage("AboutSelfsovereignidentity:PrefChanged", {
      changeSet,
    })
  }

  receiveMessage(message) {
    switch (message.name) {
      case "AboutSelfsovereignidentity:PrimaryPasswordResponse":
        this.#primaryPasswordResponse(message.data)
        break
      case "AboutSelfsovereignidentity:RemaskPassword":
        this.#remaskPassword(message.data)
        break
      case "AboutSelfsovereignidentity:Setup":
        this.#setup(message.data)
        break
      default:
        this.#passMessageDataToContent(message)
    }
  }

  #primaryPasswordResponse(data) {
    if (gPrimaryPasswordPromise) {
      gPrimaryPasswordPromise.resolve(data.result)
      recordTelemetryEvent(data.telemetryEvent)
    }
  }

  #remaskPassword(data) {
    this.sendToContent("RemaskPassword", data)
  }

  #setup(data) {
    let utils = Cu.waiveXrays(
      this.browsingContext.window
    ).AboutSelfsovereignidentityUtils
    utils.primaryPasswordEnabled = data.primaryPasswordEnabled
    utils.passwordRevealVisible = data.passwordRevealVisible
    this.sendToContent("Setup", data)
  }

  #passMessageDataToContent(message) {
    this.sendToContent(
      message.name.replace("AboutSelfsovereignidentity:", ""),
      message.data
    )
  }

  sendToContent(messageType, detail) {
    let win = this.document.defaultView
    let message = Object.assign({ messageType }, { value: detail })
    let event = new win.CustomEvent(
      "AboutSelfsovereignidentityChromeToContent",
      {
        detail: Cu.cloneInto(message, win),
      }
    )
    win.dispatchEvent(event)
  }
}
