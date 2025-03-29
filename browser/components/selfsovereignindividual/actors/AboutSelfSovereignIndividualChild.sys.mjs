/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SsiHelper } from "resource://gre/modules/SsiHelper.sys.mjs";

const TELEMETRY_EVENT_CATEGORY = "ssi";
const TELEMETRY_MIN_MS_BETWEEN_OPEN_MANAGEMENT = 5000;

let gLastOpenManagementBrowserId = null;
let gLastOpenManagementEventTime = Number.NEGATIVE_INFINITY;
let gPrimaryPasswordPromise;

function recordTelemetryEvent(event) {
  try {
    let { method, object, extra = {}, value = null } = event;
    Services.telemetry.recordEvent(
      TELEMETRY_EVENT_CATEGORY,
      method,
      object,
      value,
      extra
    );
  } catch (ex) {
    console.error(
      "AboutSelfSovereignIndividualChild: error recording telemetry event:",
      ex
    );
  }
}

/**
 *
 */
export class AboutSelfSovereignIndividualChild extends JSWindowActorChild {
  handleEvent(event) {
    switch (event.type) {
      case "AboutSelfSovereignIndividualInit": {
        this.#aboutSelfSovereignIndividualInit();
        break;
      }
      case "AboutSelfSovereignIndividualGetAllCredentials": {
        this.#aboutSelfSovereignIndividualGetAllCredentials();
        break;
      }
      case "AboutSelfSovereignIndividualCreateCredential": {
        this.#aboutSelfSovereignIndividualCreateCredential(event.detail);
        break;
      }
      case "AboutSelfSovereignIndividualDeleteCredential": {
        this.#aboutSelfSovereignIndividualDeleteCredential(event.detail);
        break;
      }
      case "AboutSelfSovereignIndividualRecordTelemetryEvent": {
        this.#aboutSelfSovereignIndividualRecordTelemetryEvent(event);
        break;
      }
      case "AboutSelfSovereignIndividualRemoveAllCredentials": {
        this.#aboutSelfSovereignIndividualRemoveAllCredentials();
        break;
      }
      case "AboutSelfSovereignIndividualUpdateCredential": {
        this.#aboutSelfSovereignIndividualUpdateCredential(event.detail);
        break;
      }
      case "AboutSelfSovereignIndividualPrimaryChanged": {
        this.#aboutSelfSovereignIndividualPrimaryChanged(event.detail);
        break;
      }
      case "AboutSelfSovereignIndividualPrefChanged": {
        this.#aboutSelfSovereignIndividualPrefChanged(event.detail);
        break;
      }
    }
  }

  #aboutSelfSovereignIndividualInit() {
    this.sendAsyncMessage("AboutSelfSovereignIndividual:Subscribe");

    let win = this.browsingContext.window;
    let waivedContent = Cu.waiveXrays(win);
    let that = this;
    let AboutSelfSovereignIndividualUtils = {
      // List things to share with app through `window`
      doCredentialMatch(credentialA, credentialB) {
        return SsiHelper.doCredentialMatch(credentialA, credentialB, {});
      },
      /**
       * Shows the Primary Password prompt if enabled, or the
       * OS auth dialog otherwise.
       *
       * @param resolve Callback that is called with result of authentication.
       * @param messageId The string ID that corresponds to a string stored in aboutSelfSovereignIndividual.ftl.
       *                  This string will be displayed only when the OS auth dialog is used.
       */
      async promptForPrimaryPassword(resolve, messageId) {
        gPrimaryPasswordPromise = {
          resolve,
        };

        that.sendAsyncMessage(
          "AboutSelfSovereignIndividual:PrimaryPasswordRequest",
          messageId
        );

        return gPrimaryPasswordPromise;
      },
      // Default to enabled just in case a search is attempted before we get a response.
      primaryPasswordEnabled: true,
      passwordRevealVisible: true,
    };
    waivedContent.AboutSelfSovereignIndividualUtils = Cu.cloneInto(
      AboutSelfSovereignIndividualUtils,
      waivedContent,
      {
        cloneFunctions: true,
      }
    );

    const prefs = {
      base: {
        menuPin: Services.prefs.getStringPref(
          "selfsovereignindividual.ui.menuPin"
        ),
      },
    };
    for (const protocolName of ["nostr"]) {
      const defaults = {
        enabled: Services.prefs.getBoolPref(
          `selfsovereignindividual.${protocolName}.enabled`
        ),
        usedPrimarypasswordToSettings: Services.prefs.getBoolPref(
          `selfsovereignindividual.${protocolName}.primarypassword.toSettings.enabled`
        ),
        expiryTimeForPrimarypasswordToSettings: Services.prefs.getIntPref(
          `selfsovereignindividual.${protocolName}.primarypassword.toSettings.expiryTime`
        ),
        usedPrimarypasswordToApps: Services.prefs.getBoolPref(
          `selfsovereignindividual.${protocolName}.primarypassword.toApps.enabled`
        ),
        expiryTimeForPrimarypasswordToApps: Services.prefs.getIntPref(
          `selfsovereignindividual.${protocolName}.primarypassword.toApps.expiryTime`
        ),
        trustedMethodsPreset: Services.prefs.getStringPref(
          `selfsovereignindividual.${protocolName}.primarypassword.toApps.trustedMethodsPreset`
        ),
        usedTrustedSites: Services.prefs.getBoolPref(
          `selfsovereignindividual.${protocolName}.trustedSites.enabled`
        ),
        usedAccountChanged: Services.prefs.getBoolPref(
          `selfsovereignindividual.${protocolName}.event.accountChanged.enabled`
        ),
      };

      if (protocolName === "nostr") {
        prefs.nostr = {
          ...defaults,
          usedBuiltinNip07: Services.prefs.getBoolPref(
            "selfsovereignindividual.nostr.builtinNip07.enabled"
          ),
          excludedKindsPreset: Services.prefs.getStringPref(
            "selfsovereignindividual.nostr.primarypassword.toApps.excludedKindsPreset"
          ),
          tabPin: Services.prefs.getStringPref(
            "selfsovereignindividual.nostr.ui.tabPin"
          ),
          tabPinInNip07: Services.prefs.getStringPref(
            "selfsovereignindividual.nostr.ui.nip07.tabPin"
          ),
        };
      }
    }

    this.sendToContent("Prefs", prefs);
  }

  #aboutSelfSovereignIndividualGetAllCredentials() {
    this.sendAsyncMessage("AboutSelfSovereignIndividual:GetAllCredentials");
  }

  #aboutSelfSovereignIndividualCreateCredential(credential) {
    this.sendAsyncMessage("AboutSelfSovereignIndividual:CreateCredential", {
      credential,
    });
  }

  #aboutSelfSovereignIndividualDeleteCredential(credential) {
    this.sendAsyncMessage("AboutSelfSovereignIndividual:DeleteCredential", {
      credential,
    });
  }

  #aboutSelfSovereignIndividualRecordTelemetryEvent(event) {
    let { method } = event.detail;

    if (method == "open_management") {
      let { docShell } = this.browsingContext;
      // Compare to the last time open_management was recorded for the same
      // outerWindowID to not double-count them due to a redirect to remove
      // the entryPoint query param (since replaceState isn't allowed for
      // about:). Don't use performance.now for the tab since you can't
      // compare that number between different tabs and this JSM is shared.
      let now = docShell.now();
      if (
        this.browsingContext.browserId == gLastOpenManagementBrowserId &&
        now - gLastOpenManagementEventTime <
          TELEMETRY_MIN_MS_BETWEEN_OPEN_MANAGEMENT
      ) {
        return;
      }
      gLastOpenManagementEventTime = now;
      gLastOpenManagementBrowserId = this.browsingContext.browserId;
    }
    recordTelemetryEvent(event.detail);
  }

  #aboutSelfSovereignIndividualRemoveAllCredentials() {
    this.sendAsyncMessage("AboutSelfSovereignIndividual:RemoveAllCredentials");
  }

  #aboutSelfSovereignIndividualUpdateCredential(changeSet) {
    this.sendAsyncMessage("AboutSelfSovereignIndividual:UpdateCredential", {
      changeSet,
    });
  }

  #aboutSelfSovereignIndividualPrimaryChanged(changeSet) {
    this.sendAsyncMessage("AboutSelfSovereignIndividual:PrimaryChanged", {
      changeSet,
    });
  }

  #aboutSelfSovereignIndividualPrefChanged(changeSet) {
    this.sendAsyncMessage("AboutSelfSovereignIndividual:PrefChanged", {
      changeSet,
    });
  }

  receiveMessage(message) {
    switch (message.name) {
      case "AboutSelfSovereignIndividual:PrimaryPasswordResponse":
        this.#primaryPasswordResponse(message.data);
        break;
      case "AboutSelfSovereignIndividual:RemaskPassword":
        this.#remaskPassword(message.data);
        break;
      case "AboutSelfSovereignIndividual:Setup":
        this.#setup(message.data);
        break;
      default:
        this.#passMessageDataToContent(message);
    }
  }

  #primaryPasswordResponse(data) {
    if (gPrimaryPasswordPromise) {
      gPrimaryPasswordPromise.resolve(data.result);
      recordTelemetryEvent(data.telemetryEvent);
    }
  }

  #remaskPassword(data) {
    this.sendToContent("RemaskPassword", data);
  }

  #setup(data) {
    let utils = Cu.waiveXrays(
      this.browsingContext.window
    ).AboutSelfSovereignIndividualUtils;
    utils.primaryPasswordEnabled = data.primaryPasswordEnabled;
    utils.passwordRevealVisible = data.passwordRevealVisible;
    this.sendToContent("Setup", data);
  }

  #passMessageDataToContent(message) {
    this.sendToContent(
      message.name.replace("AboutSelfSovereignIndividual:", ""),
      message.data
    );
  }

  sendToContent(messageType, detail) {
    let win = this.document.defaultView;
    let message = Object.assign({ messageType }, { value: detail });
    let event = new win.CustomEvent(
      "AboutSelfSovereignIndividualChromeToContent",
      {
        detail: Cu.cloneInto(message, win),
      }
    );
    win.dispatchEvent(event);
  }
}
