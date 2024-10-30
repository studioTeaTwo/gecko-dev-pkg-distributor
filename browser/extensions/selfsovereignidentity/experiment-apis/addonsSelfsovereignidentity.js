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
        // If you are checking for 'nightly', also check for 'nightly-try'.
        //
        // Otherwise, just use the standard builds, but be aware of the many
        // non-standard options that also exist (as of August 2018).
        //
        // Standard builds:
        //   'esr' - ESR channel
        //   'release' - release channel
        //   'beta' - beta channel
        //   'nightly' - nightly channel
        // Non-standard / deprecated builds:
        //   'aurora' - deprecated aurora channel (still observed in dxr)
        //   'default' - local builds from source
        //   'nightly-try' - nightly Try builds (QA may occasionally need to test with these)
        async getUpdateChannel() {
          return AppConstants.MOZ_UPDATE_CHANNEL;
        },
        // ref: https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/events.html
        onPrimaryChanged: new EventManager({
          context,
          name: "addonsSelfsovereignidentity.onPrimaryChanged",
          register: (fire, protocolName) => {
            const callback = (newGuidPayload) => {
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
          register: (fire, protocolName) => {
            const prefName = `browser.selfsovereignidentity.${protocolName}.enabled`;
            const callback = () => {
              fire.async(protocolName).catch(() => {}); // ignore Message Manager disconnects
            };
            Services.prefs.addObserver(prefName, callback);
            return () => {
              Services.prefs.removeObserver(prefName, callback);
            };
          },
        }).api(),
        async searchCredentialsWithoutSecret(protocolName, credentialName, primary, guid) {
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
              // meta info
              guid: credential.guid,
            }
            return filteredVal
          })
        },
        async signByNostrKey(message, guid) {
          let signature
          try {
            signature = await lazy.Nostr.getSignature(message, guid)
          } catch (e) {
            throw e
          }

          return signature
        },
        async getPref(protocolName) {
          try {
            return Services.prefs.getBoolPref(
              `browser.selfsovereignidentity.${protocolName}.enabled`
            );
          } catch (e) {
            throw e
          }
        },
      },
    };
  }
};
