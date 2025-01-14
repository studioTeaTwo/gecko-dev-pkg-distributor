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
const { ensureBytes } = ChromeUtils.importESModule(
  "resource://gre/modules/shared/utils-curves.sys.mjs"
);

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
            try {
              // Validate params
              ensureBytes("message", message); // Will throw error for other types.

              // Check permission
              const enabled = Services.prefs.getBoolPref(
                "selfsovereignidentity.nostr.enabled"
              );
              if (!enabled) {
                return null;
              }
              const credentials =
                await lazy.SsiHelper.searchCredentialsWithoutSecret({
                  protocolName: "nostr",
                  credentialName: "nsec",
                  primary: true,
                });
              if (credentials.length === 0) {
                return null;
              }
              const { originSite, originExtension } =
                lazy.browserSsiHelper.getOrigin(context, tabTracker);
              const isAuthorized = lazy.browserSsiHelper.isAuthorized(
                "nostr",
                "nsec",
                credentials[0].identifier,
                originSite,
                originExtension
              );
              if (!isAuthorized) {
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
