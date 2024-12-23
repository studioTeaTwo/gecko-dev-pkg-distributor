/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict"

/* globals ExtensionAPI, ExtensionCommon, Services, ChromeUtils */

this.builtinNip = class extends ExtensionAPI {
  getAPI(context) {
    let EventManager = ExtensionCommon.EventManager

    return {
      builtinNip: {
        onPrefBuiltinNip07Changed: new EventManager({
          context,
          name: "builtinNip.onPrefBuiltinNip07Changed",
          register: (fire) => {
            const prefName = `selfsovereignidentity.nostr.builtinNip07.enabled`

            const callback = () => {
              // Check permission
              const enabled = Services.prefs.getBoolPref(
                `selfsovereignidentity.nostr.enabled`
              )
              if (!enabled) {
                return
              }

              fire.async("builtinNip07.enabled").catch(() => {}) // ignore Message Manager disconnects
            }
            Services.prefs.addObserver(prefName, callback)
            return () => {
              Services.prefs.removeObserver(prefName, callback)
            }
          },
        }).api(),
        async getPrefs() {
          const protocolName = "nostr"
          // Check permission
          const enabled = Services.prefs.getBoolPref(
            `selfsovereignidentity.${protocolName}.enabled`
          )
          if (!enabled) {
            return null
          }

          try {
            const prefs = {
              "builtinNip07.enabled": Services.prefs.getBoolPref(
                `selfsovereignidentity.${protocolName}.builtinNip07.enabled`
              ),
            }
            return prefs
          } catch (e) {
            console.error(e)
            return null
          }
        },
      },
    }
  }
}
