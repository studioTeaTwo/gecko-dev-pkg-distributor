/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict"

/* globals ExtensionAPI, Services, ChromeUtils */

let lazy = {}
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
  experimentApiSsiHelper:
    "resource://builtin-addons/ssi/experiment-apis/ssiHelper.sys.mjs",
})

const AUTH_TIMEOUT_MS = 24 * 60 * 60 * 1000 // 1 day
const INITIAL_EXPIRATIONTIME = Number.NEGATIVE_INFINITY
const PRIMARY_PASSWORD_NOTIFICATION_ID = "primary-password-ssi-required"
const MESSAGE_ID = "experimentapi-ssi-access-authlocked-os-auth-dialog-message"

this.ssi = class extends ExtensionAPI {
  getAPI(context) {
    const { tabManager } = context.extension
    // TODO(ssb): persist
    let _authExpirationTimes = new Map()

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
          }
          const accountChanged = {
            nostr: Services.prefs.getBoolPref(
              `selfsovereignidentity.nostr.event.accountChanged.enabled`
            ),
          }

          // NOTE(ssb): User controls whether to grant protocol permissions to apps in the settings page.
          // TODO(ssb): validate params
          const params = {}
          if (protocolName) {
            params.protocolName = protocolName
          }
          if (credentialName) {
            params.credentialName = credentialName
          }
          params.primary = primary

          let credentials
          try {
            credentials =
              await lazy.SsiHelper.searchCredentialsWithoutSecret(params)
          } catch (e) {
            console.error(e)
            return []
          }

          return credentials
            .filter((credential) => {
              // Check permission
              if (!enabled[credential.protocolName]) return false
              // If the app wants to do a full search but the user has accountChanged notification turned off, return only primary.
              if (!params.primary && !accountChanged[credential.protocolName])
                return credential.primary

              return true
            })
            .map((credential) => {
              // Filter only the data to need
              const filteredVal = {
                // credential info
                protocolName: credential.protocolName,
                credentialName: credential.credentialName,
                identifier: credential.identifier,
                primary: credential.primary, // TODO(ssb): should remove?
              }
              return filteredVal
            })
        },
        async askPermission(protocolName, credentialName, tabId, message) {
          // TODO(ssb): validate params
          // TODO(ssb): validate tabId
          // TODO(ssb): how to make tabId unnecessary
          // const tabs = Array.from(
          //   tabManager.query({
          //     active: true,
          //     lastFocusedWindow: true,
          //     url: null,
          //     cookieStoreId: null,
          //     title: null,
          //   })
          // )

          // Check permission
          const enabled = Services.prefs.getBoolPref(
            `selfsovereignidentity.${protocolName}.enabled`
          )
          if (!enabled) return false

          try {
            const { url, browser } = tabManager.get(tabId)
            const origin = Services.io.newURI(url).displayPrePath
            const internalPrefs =
              await lazy.experimentApiSsiHelper.getInternalPrefs(protocolName)

            if (internalPrefs["trustedSites.enabled"]) {
              const credentials =
                await lazy.SsiHelper.searchCredentialsWithoutSecret({
                  protocolName,
                  credentialName,
                  primary: true,
                })
              if (credentials.length === 0) return false

              const trustedSites = JSON.parse(credentials[0].trustedSites)
              // TODO(ssb): improve the match method, such as supporting glob or WebExtension.UrlFilter
              const trusted = trustedSites.some((site) =>
                url.includes(site.url)
              )
              console.log("trusted", trusted, url)
              if (trusted) {
                return true
              } else {
                // go to primarypassword auth
              }
            }

            if (internalPrefs["primarypassword.toApps.enabled"]) {
              const messageText = {
                value: `${message || "AUTH LOCK"} ${origin}`,
              }
              const captionText = { value: "" } // FIXME(ssb): not displayed. want to set the origin here.

              const isOSAuthEnabled = lazy.SsiHelper.getOSAuthEnabled(
                lazy.SsiHelper.OS_AUTH_FOR_PASSWORDS_PREF
              )
              if (isOSAuthEnabled) {
                const messageId = MESSAGE_ID + "-" + AppConstants.platform
              }

              let _authExpirationTime = _authExpirationTimes.get(origin)
              if (_authExpirationTime === undefined) {
                _authExpirationTime = INITIAL_EXPIRATIONTIME
                _authExpirationTimes.set(origin, INITIAL_EXPIRATIONTIME)
              }

              const { isAuthorized, telemetryEvent } =
                await lazy.SsiHelper.requestReauth(
                  browser.browsingContext.embedderElement,
                  isOSAuthEnabled,
                  _authExpirationTime,
                  messageText.value,
                  captionText.value
                )
              if (isAuthorized) {
                _authExpirationTimes.set(
                  origin,
                  Date.now() +
                    internalPrefs["primarypassword.toApps.expiryTime"]
                )
              }
              console.log(
                "primarypassword",
                isAuthorized,
                telemetryEvent,
                origin,
                _authExpirationTimes.get(origin)
              )
              return isAuthorized
            }

            // NOTE(ssb): Returns true if all settings are explicitly turned off.
            return internalPrefs["trustedSites.enabled"] ? false : true
          } catch (e) {
            console.error(e)
            return false
          }
        },
      },
    }
  }
}
