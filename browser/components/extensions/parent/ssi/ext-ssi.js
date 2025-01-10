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

const INITIAL_EXPIRATIONTIME = Number.NEGATIVE_INFINITY;
const MESSAGE_ID = "builtinapi-ssi-access-authlocked-os-auth-dialog-message";

this.ssi = class extends ExtensionAPI {
  getAPI(context) {
    const { tabManager } = context.extension;
    // TODO(ssb): persist
    let _authExpirationTimes = new Map();

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
                  // credential info
                  protocolName: credential.protocolName,
                  credentialName: credential.credentialName,
                  identifier: credential.identifier,
                  primary: credential.primary,
                };
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
            // TODO(ssb): Background exec check
            const activeTabId = tabTracker.getId(tabTracker.activeTab);

            // FIXME(ssb): Set more robust tabId than activeTab by finding a way to identify the caller.
            const { browser } = tabManager.get(activeTabId);
            const originSite = browser.contentPrincipal.originNoSuffix;
            const originExtension =
              context.xulBrowser.contentPrincipal.originNoSuffix;
            const internalPrefs = await lazy.browserSsiHelper.getInternalPrefs(
              protocolName
            );

            if (internalPrefs["trustedSites.enabled"]) {
              const credentials =
                await lazy.SsiHelper.searchCredentialsWithoutSecret({
                  protocolName,
                  credentialName,
                  primary: true,
                });
              if (credentials.length === 0) {
                return false;
              }

              const trustedSites = JSON.parse(credentials[0].trustedSites);
              // TODO(ssb): improve the match method, such as supporting glob or WebExtension.UrlFilter
              // TODO(ssb): Number of cases for sites and extensions
              const trusted = trustedSites.some(
                site =>
                  originSite.startsWith(site.url) &&
                  originExtension.startsWith(site.url)
              );
              console.log("trusted", trusted, originSite, originExtension);
              if (trusted) {
                return true;
              }
              // go to primarypassword auth
            }

            if (internalPrefs["primarypassword.toApps.enabled"]) {
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

              let _authExpirationTime = _authExpirationTimes.get(originSite);
              if (_authExpirationTime === undefined) {
                _authExpirationTime = INITIAL_EXPIRATIONTIME;
                _authExpirationTimes.set(originSite, INITIAL_EXPIRATIONTIME);
              }

              const { isAuthorized, telemetryEvent } =
                await lazy.SsiHelper.requestReauth(
                  browser.browsingContext.embedderElement,
                  isOSAuthEnabled,
                  _authExpirationTime,
                  messageText.value,
                  captionText.value
                );
              if (isAuthorized) {
                _authExpirationTimes.set(
                  originSite,
                  Date.now() +
                    internalPrefs["primarypassword.toApps.expiryTime"]
                );
              }
              console.log(
                "primarypassword",
                isAuthorized,
                telemetryEvent,
                originSite,
                _authExpirationTimes.get(originSite)
              );
              if (isAuthorized) {
                return true;
              }
              // go to self-sovereign check
            }

            // NOTE(ssb): Returns true if all settings are explicitly turned off.
            // eslint-disable-next-line no-unneeded-ternary
            return !internalPrefs["trustedSites.enabled"] &&
              !internalPrefs["primarypassword.toApps.enabled"]
              ? true
              : false;
          } catch (e) {
            console.error(e);
            return false;
          }
        },
      },
    };
  }
};
