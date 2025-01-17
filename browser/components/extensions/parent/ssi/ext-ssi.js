/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals ExtensionAPI, Services, ChromeUtils */

// lazy is shared with other parent experiment-apis
let lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
  browserSsiHelper: "resource://builtin-addons/ssi/browserSsiHelper.sys.mjs",
});

this.ssi = class extends ExtensionAPI {
  getAPI(context) {
    // Call it as a dummy to perform initialization
    // eslint-disable-next-line no-unused-vars
    const authCache = Services.ssi.authCache;
    return {
      ssi: {
        async searchCredentialsWithoutSecret(
          { protocolName = "", credentialName = "", primary = true },
          { caption = "read YOUR KEY", submission = "" }
        ) {
          // Stuff to check permission
          const enabled = {
            nostr: Services.prefs.getBoolPref(
              `selfsovereignidentity.nostr.enabled`
            ),
          };
          const accountChanged = {
            nostr: Services.prefs.getBoolPref(
              `selfsovereignidentity.nostr.event.accountChanged.enabled`
            ),
          };

          try {
            // NOTE(ssb): User controls whether to grant protocol permissions to apps in the settings page.
            const params = {};
            if (protocolName) {
              if (!lazy.browserSsiHelper.validateProtocolName(protocolName)) {
                return [];
              }
              params.protocolName = protocolName;
            }
            if (credentialName) {
              if (
                !lazy.browserSsiHelper.validateCredentialName(credentialName)
              ) {
                return [];
              }
              params.credentialName = credentialName;
            }
            params.primary = primary;
            if (caption) {
              if (!lazy.browserSsiHelper.validateDialogText(caption)) {
                return false;
              }
            }
            // TODO(ssb): validate submission

            const credentials =
              await lazy.SsiHelper.searchCredentialsWithoutSecret(params);

            return credentials
              .filter(async credential => {
                // Check permission
                if (!enabled[credential.protocolName]) {
                  return false;
                }
                const isAuthorized = await lazy.browserSsiHelper.authorize(
                  context,
                  tabTracker,
                  {
                    protocolName: credential.protocolName,
                    credentialName: credential.credentialName,
                  },
                  { caption, submission },
                  false
                );
                if (!isAuthorized) {
                  return false;
                }
                // NOTE(ssb): If the app wants to do a full search but the user has accountChanged notification turned off, return only primary.
                if (
                  !params.primary &&
                  !accountChanged[credential.protocolName]
                ) {
                  return credential.primary;
                }

                return true;
              })
              .map(credential => {
                // Filter only the data to need
                const filteredVal = {
                  protocolName: credential.protocolName,
                  credentialName: credential.credentialName,
                  primary: credential.primary,
                };
                if (
                  !(
                    credential.protocolName === "bitcoin" &&
                    credential.credentialName === "bip39"
                  )
                ) {
                  filteredVal.identifier = credential.identifier;
                }
                return filteredVal;
              });
          } catch (e) {
            console.error(e);
            return [];
          }
        },
        async askPermission(
          protocolName,
          credentialName,
          { caption = "get your authorization", submission = "" }
        ) {
          try {
            // Validate params
            // TODO(ssb): validate submission
            if (!lazy.browserSsiHelper.validateProtocolName(protocolName)) {
              return false;
            }
            if (!lazy.browserSsiHelper.validateCredentialName(credentialName)) {
              return false;
            }
            if (!lazy.browserSsiHelper.validateDialogText(caption)) {
              return false;
            }

            // Check permission
            const enabled = Services.prefs.getBoolPref(
              `selfsovereignidentity.${protocolName}.enabled`
            );
            if (!enabled) {
              return false;
            }

            const isAuthorized = await lazy.browserSsiHelper.authorize(
              context,
              tabTracker,
              { protocolName, credentialName },
              { caption, submission },
              false
            );
            return isAuthorized;
          } catch (e) {
            console.error(e);
            return false;
          }
        },
      },
    };
  }
};
