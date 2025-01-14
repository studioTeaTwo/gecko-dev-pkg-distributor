/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals ExtensionAPI, Services, ChromeUtils, AppConstants */

// lazy is shared with other parent experiment-apis
let lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
  browserSsiHelper: "resource://builtin-addons/ssi/browserSsiHelper.sys.mjs",
});
// Treat AuthCache as a singleton
const { AuthCache } = ChromeUtils.importESModule(
  "resource://gre/modules/AuthCache.sys.mjs"
);

const MESSAGE_ID = "builtinapi-ssi-access-authlocked-os-auth-dialog-message";

this.ssi = class extends ExtensionAPI {
  getAPI(context) {
    return {
      ssi: {
        async searchCredentialsWithoutSecret(
          protocolName,
          credentialName,
          primary = true
        ) {
          // Check permission
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

            const credentials =
              await lazy.SsiHelper.searchCredentialsWithoutSecret(params);

            return credentials
              .filter(credential => {
                // Check permission
                if (!enabled[credential.protocolName]) {
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
        async askPermission(protocolName, credentialName, message) {
          try {
            // Validate params
            // TODO(ssb): validate message
            if (!lazy.browserSsiHelper.validateProtocolName(protocolName)) {
              return false;
            }
            if (!lazy.browserSsiHelper.validateCredentialName(credentialName)) {
              return false;
            }

            // Check permission
            const enabled = Services.prefs.getBoolPref(
              `selfsovereignidentity.${protocolName}.enabled`
            );
            if (!enabled) {
              return false;
            }

            // Prepare stuff
            const { originSite, originExtension, browsingContext } =
              lazy.browserSsiHelper.getOrigin(context, tabTracker);
            if (!originSite || !originExtension) {
              return false;
            }
            const internalPrefs =
              lazy.browserSsiHelper.getInternalPrefs(protocolName);
            const credentials =
              await lazy.SsiHelper.searchCredentialsWithoutSecret({
                protocolName,
                credentialName,
                primary: true,
              });
            if (credentials.length === 0) {
              return false;
            }
            const authKey = `${protocolName}:${credentialName}:${credentials[0].identifier}`;
            const auth = AuthCache.get(authKey);

            if (internalPrefs["trustedSites.enabled"]) {
              const trusted = lazy.browserSsiHelper.isTrusted(
                originSite,
                originExtension,
                auth.trustedSites
              );
              console.log("trusted", trusted, originSite, originExtension);
              if (trusted) {
                return true;
              }
              // go to primarypassword auth
            }

            if (internalPrefs["primarypassword.toApps.enabled"]) {
              // Prepare stuff
              const messageText = {
                value: `${message || "AUTH LOCK"} \n${originSite}`,
              };
              const captionText = { value: "" }; // FIXME(ssb): not displayed. want to set the origin here.
              const isOSAuthEnabled = lazy.SsiHelper.getOSAuthEnabled(
                lazy.SsiHelper.OS_AUTH_FOR_PASSWORDS_PREF
              );
              if (isOSAuthEnabled) {
                const messageId = MESSAGE_ID + "-" + AppConstants.platform;
              }
              let _authExpirationTime = auth.passwordAuthorizedSites.filter(
                site => site.url === originSite
              )[0]?.expiryTime;
              if (_authExpirationTime === undefined) {
                _authExpirationTime = 0;
                AuthCache.set(authKey, {
                  passwordAuthorizedSites: [{ url: originSite, expiryTime: 0 }],
                });
              }

              // Auth
              const { isAuthorized, telemetryEvent } =
                await lazy.SsiHelper.requestReauth(
                  browsingContext.embedderElement,
                  isOSAuthEnabled,
                  _authExpirationTime,
                  messageText.value,
                  captionText.value
                );

              // Update expiry time if password is newly entered.
              const isEntered = [
                "success",
                "success_unsupported_platform",
              ].includes(telemetryEvent.value);
              if (isAuthorized && isEntered) {
                const preference =
                  internalPrefs["primarypassword.toApps.expiryTime"];
                const expiryTime = preference > 0 ? Date.now() + preference : 0;
                AuthCache.set(authKey, {
                  passwordAuthorizedSites: [{ url: originSite, expiryTime }],
                });
              }
              console.log(
                "primarypassword",
                isAuthorized,
                telemetryEvent,
                originSite,
                AuthCache.get(authKey)
              );
              if (isAuthorized) {
                return true;
              }
              // go to self-sovereign check
            }

            return lazy.browserSsiHelper.isSelfsovereignty(protocolName);
          } catch (e) {
            console.error(e);
            return false;
          }
        },
      },
    };
  }
};
