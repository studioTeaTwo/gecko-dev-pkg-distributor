/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals ExtensionAPI, ExtensionCommon, Services, ChromeUtils */

this.builtinNip = class extends ExtensionAPI {
  getAPI(context) {
    let EventManager = ExtensionCommon.EventManager;

    return {
      builtinNip: {
        onPrefBuiltinNip07Changed: new EventManager({
          context,
          name: "builtinNip.onPrefBuiltinNip07Changed",
          register: fire => {
            const prefName = `selfsovereignindividual.nostr.builtinNip07.enabled`;

            const callback = () => {
              // No need to check permission
              fire.async().catch(() => {}); // ignore Message Manager disconnects
            };
            Services.prefs.addObserver(prefName, callback);
            return () => {
              Services.prefs.removeObserver(prefName, callback);
            };
          },
        }).api(),
        async getPrefs() {
          try {
            // No need to check permission

            const protocolName = "nostr";
            const prefs = {
              "builtinNip07.enabled": Services.prefs.getBoolPref(
                `selfsovereignindividual.${protocolName}.builtinNip07.enabled`
              ),
            };
            return prefs;
          } catch (e) {
            console.error(e);
            return null;
          }
        },
      },
    };
  }
};
