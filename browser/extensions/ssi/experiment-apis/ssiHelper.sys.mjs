/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals exportFunction, Services */

export const experimentApiSsiHelper = {
  // ref: https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/events.html
  onPrimaryChangedRegister: (protocolName) => (fire) => {
    const callback = (newGuidPayload) => {
      // Check permission
      const enabled = Services.prefs.getBoolPref(
        `selfsovereignidentity.${protocolName}.enabled`
      )
      const usedAccountChanged = Services.prefs.getBoolPref(
        `selfsovereignidentity.${protocolName}.event.accountChanged.enabled`
      )
      if (!enabled || !usedAccountChanged) return

      const newGuid = newGuidPayload.data
      fire.async(newGuid).catch(() => {}) // ignore Message Manager disconnects
    }

    let obsTopic
    if (protocolName === "nostr") {
      obsTopic = "SSI_PRIMARY_KEY_CHANGED_IN_NOSTR"
    }

    Services.obs.addObserver(callback, obsTopic)
    return () => {
      Services.obs.removeObserver(callback, obsTopic)
    }
  },
  onPrefEnabledChangedRegister: (protocolName) => (fire) => {
    const prefName = `selfsovereignidentity.${protocolName}.enabled`

    const callback = () => {
      // No need to check permission
      fire.async("enabled").catch(() => {}) // ignore Message Manager disconnects
    }
    Services.prefs.addObserver(prefName, callback)
    return () => {
      Services.prefs.removeObserver(prefName, callback)
    }
  },
  onPrefAccountChangedRegister: (protocolName) => (fire) => {
    const prefName = `selfsovereignidentity.${protocolName}.event.accountChanged.enabled`
    const callback = () => {
      // Check permission
      const enabled = Services.prefs.getBoolPref(
        `selfsovereignidentity.${protocolName}.enabled`
      )
      if (!enabled) return

      fire.async("event.accountChanged.enabled").catch(() => {}) // ignore Message Manager disconnects
    }
    Services.prefs.addObserver(prefName, callback)
    return () => {
      Services.prefs.removeObserver(prefName, callback)
    }
  },
  getPrefs(protocolName) {
    // Check permission
    const enabled = Services.prefs.getBoolPref(
      `selfsovereignidentity.${protocolName}.enabled`
    )
    if (!enabled) return null

    try {
      const prefs = {
        enabled: enabled,
        "event.accountChanged.enabled": Services.prefs.getBoolPref(
          `selfsovereignidentity.${protocolName}.event.accountChanged.enabled`
        ),
      }
      if (protocolName === "nostr") {
        prefs["builtInNip07.enabled"] = Services.prefs.getBoolPref(
          `selfsovereignidentity.${protocolName}.builtInNip07.enabled`
        )
      }
      return prefs
    } catch (e) {
      console.error(e)
      return null
    }
  },
  getInternalPrefs(protocolName) {
    try {
      const prefs = {
        "trustedSites.enabled": Services.prefs.getBoolPref(
          `selfsovereignidentity.${protocolName}.trustedSites.enabled`
        ),
        "primarypassword.toApps.enabled": Services.prefs.getBoolPref(
          `selfsovereignidentity.${protocolName}.primarypassword.toApps.enabled`
        ),
        "primarypassword.toApps.expiryTime": Services.prefs.getIntPref(
          `selfsovereignidentity.${protocolName}.primarypassword.toApps.expiryTime`
        ),
      }
      return prefs
    } catch (e) {
      console.error(e)
      return null
    }
  },
}
