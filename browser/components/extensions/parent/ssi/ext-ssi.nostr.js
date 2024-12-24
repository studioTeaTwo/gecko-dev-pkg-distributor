/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals ExtensionCommon, ExtensionAPI, Services, ChromeUtils, lazy */

// lazy is shared with other parent experiment-apis
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
  Nostr: "resource://gre/modules/shared/Nostr.sys.mjs",
  browserSsiHelper: "resource://builtin-addons/ssi/browserSsiHelper.sys.mjs",
});

this["ssi.nostr"] = class extends ExtensionAPI {
  getAPI(context) {
    let EventManager = ExtensionCommon.EventManager;

    return {
      ssi: {
        nostr: {
          // ref: https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/events.html
          onPrimaryChanged: new EventManager({
            context,
            name: "ssi.nostr.onPrimaryChanged",
            register: lazy.browserSsiHelper.onPrimaryChangedRegister("nostr"),
          }).api(),
          onPrefEnabledChanged: new EventManager({
            context,
            name: "ssi.nostr.onPrefEnabledChanged",
            register:
              lazy.browserSsiHelper.onPrefEnabledChangedRegister("nostr"),
          }).api(),
          onPrefAccountChanged: new EventManager({
            context,
            name: "ssi.nostr.onPrefAccountChanged",
            register:
              lazy.browserSsiHelper.onPrefAccountChangedRegister("nostr"),
          }).api(),
          async getPrefs() {
            return lazy.browserSsiHelper.getPrefs("nostr");
          },
          async sign(message) {
            // TODO(ssb): validate message

            // Check permission
            // TODO(ssb): call ssi.askPermission
            const enabled = Services.prefs.getBoolPref(
              "selfsovereignidentity.nostr.enabled"
            );
            if (!enabled) {
              return null;
            }

            try {
              const credentials =
                await lazy.SsiHelper.searchCredentialsWithoutSecret({
                  protocolName: "nostr",
                  credentialName: "nsec",
                  primary: true,
                });
              if (credentials.length === 0) {
                return null;
              }

              const signature = await lazy.Nostr.sign(
                message,
                credentials[0].guid
              );
              return signature;
            } catch (e) {
              console.error(e);
              return null;
            }
          },
        },
      },
    };
  }
};
