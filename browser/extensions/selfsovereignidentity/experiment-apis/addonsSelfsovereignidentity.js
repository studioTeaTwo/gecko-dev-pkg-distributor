/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals ExtensionAPI, Services, XPCOMUtils */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
  Nostr: "resource://gre/modules/shared/nostr.sys.mjs",
});

this.addonsSelfsovereignidentity = class extends ExtensionAPI {

  getAPI(context) {
    let EventManager = ExtensionCommon.EventManager;

    return {
      addonsSelfsovereignidentity: {
        // ref: https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/events.html
        onPrimaryChanged: new EventManager({
          context,
          name: "addonsSelfsovereignidentity.onPrimaryChanged",
          register: (fire, protocolName) => {
            const callback = (newGuidPayload) => {
              // Check permission
              const enabled = Services.prefs.getBoolPref(`selfsovereignidentity.${protocolName}.enabled`)
              const usedAccountChanged = Services.prefs.getBoolPref(`selfsovereignidentity.${protocolName}.event.accountChanged.enabled`)
              if (!enabled || !usedAccountChanged) return;

              const newGuid = newGuidPayload.data
              fire.async(newGuid).catch(() => {}); // ignore Message Manager disconnects
            };

            let obsTopic;
            if (protocolName === "nostr") {
              obsTopic = "SSI_PRIMARY_KEY_CHANGED_IN_NOSTR"
            }

            Services.obs.addObserver(callback, obsTopic);
            return () => {
              Services.obs.removeObserver(callback, obsTopic);
            };
          },
        }).api(),
        onPrefChanged: new EventManager({
          context,
          name: "addonsSelfsovereignidentity.onPrefChanged",
          register: (fire, protocolName, prefKey) => {
            // TODO(ssb): filter only what permits
            const prefName = `browser.selfsovereignidentity.${protocolName}.${prefKey}`;

            const callback = () => {
              // Check permission
              const enabled = Services.prefs.getBoolPref(`selfsovereignidentity.${protocolName}.enabled`)
              if (prefName !== "enabled" && !enabled ) return;

              fire.async(prefKey).catch(() => {}); // ignore Message Manager disconnects
            };
            Services.prefs.addObserver(prefName, callback);
            return () => {
              Services.prefs.removeObserver(prefName, callback);
            };
          },
        }).api(),
        async searchCredentialsWithoutSecret(protocolName, credentialName, primary, guid) {
          // Check permission
          const enabled = Services.prefs.getBoolPref(`selfsovereignidentity.${protocolName}.enabled`)
          if (!enabled) return null;

          const params = {}
          if (protocolName) {
            params.protocolName = protocolName
          }
          if (credentialName) {
            params.credentialName = credentialName
          }
          if (primary) {
            params.primary = primary
          }
          if (guid) {
            params.guid = guid
          }

          let credentials
          try {
            credentials = await lazy.SsiHelper.searchCredentialsWithoutSecret(params)
          } catch (e) {
            throw e
          }

          return credentials.map(credential => {
            // Filter only the data to need
            const filteredVal = {
              // credential info
              protocolName: credential.protocolName,
              credentialName: credential.credentialName,
              identifier: credential.identifier,
              primary: credential.primary,
              trustedSites: JSON.parse(credential.trustedSites),
              // meta info
              guid: credential.guid,
            }
            return filteredVal
          })
        },
        async getPrefs(protocolName) {
          // Check permission
          const enabled = Services.prefs.getBoolPref(`selfsovereignidentity.${protocolName}.enabled`)
          if (!enabled) return null;

          let prefs;
          try {
            if (protocolName === "nostr") {
              prefs = {
                "enabled": enabled,
                "trustedSites.enabled": Services.prefs.getBoolPref(
                  "selfsovereignidentity.nostr.trustedSites.enabled"
                ),
                "builtInNip07.enabled": Services.prefs.getBoolPref(
                  "selfsovereignidentity.nostr.builtInNip07.enabled"
                ),
                "event.accountChanged.enabled": Services.prefs.getBoolPref(
                  "selfsovereignidentity.nostr.event.accountChanged.enabled"
                ),
              }
            }
            return prefs
          } catch (e) {
            throw e
          }
        },
        /**
        * Nostr only
        */
        async signByNostrKey(message, guid) {
          // Check permission
          const enabled = Services.prefs.getBoolPref("selfsovereignidentity.nostr.enabled")
          if (!enabled) return null;
  
          let signature
          try {
            signature = await lazy.Nostr.getSignature(message, guid)
          } catch (e) {
            throw e
          }
  
          return signature
        },
      }
    };
  }
};
