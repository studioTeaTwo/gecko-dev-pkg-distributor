/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict"

/* globals ExtensionAPI, Services, ChromeUtils */

ChromeUtils.defineESModuleGetters(this, {
  Nostr: "resource://gre/modules/shared/Nostr.sys.mjs",
})

this["ssi.nostr"] = class extends ExtensionAPI {
  getAPI(context) {
    let EventManager = ExtensionCommon.EventManager

    return {
      ssi: {
        nostr: {
          // ref: https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/events.html
          onPrimaryChanged: new EventManager({
            context,
            name: "ssi.nostr.onPrimaryChanged",
            register: experimentApiSsiHelper.onPrimaryChangedRegister("nostr"),
          }).api(),
          onPrefEnabledChanged: new EventManager({
            context,
            name: "ssi.nostr.onPrefEnabledChanged",
            register:
              experimentApiSsiHelper.onPrefEnabledChangedRegister("nostr"),
          }).api(),
          onPrefTrustedSitesChanged: new EventManager({
            context,
            name: "ssi.nostr.onPrefTrustedSitesChanged",
            register:
              experimentApiSsiHelper.onPrefTrustedSitesChangedRegister("nostr"),
          }).api(),
          onPrefAccountChanged: new EventManager({
            context,
            name: "ssi.nostr.onPrefAccountChanged",
            register:
              experimentApiSsiHelper.onPrefAccountChangedRegister("nostr"),
          }).api(),
          onPrefBuiltInNip07Changed: new EventManager({
            context,
            name: "ssi.nostr.onPrefBuiltInNip07Changed",
            register: (fire) => {
              const prefName = `selfsovereignidentity.nostr.builtInNip07.enabled`

              const callback = () => {
                // Check permission
                const enabled = Services.prefs.getBoolPref(
                  `selfsovereignidentity.nostr.enabled`
                )
                if (!enabled) return

                fire.async("builtInNip07.enabled").catch(() => {}) // ignore Message Manager disconnects
              }
              Services.prefs.addObserver(prefName, callback)
              return () => {
                Services.prefs.removeObserver(prefName, callback)
              }
            },
          }).api(),
          async getPrefs() {
            return experimentApiSsiHelper.getPrefs("nostr")
          },
          async sign(message, guid) {
            // Check permission
            const enabled = Services.prefs.getBoolPref(
              "selfsovereignidentity.nostr.enabled"
            )
            if (!enabled) return null

            try {
              const signature = await Nostr.sign(message, guid)
              return signature
            } catch (e) {
              throw e
            }
          },
        },
      },
    }
  }
}
