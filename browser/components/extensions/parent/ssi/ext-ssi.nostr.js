/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals ExtensionCommon, ExtensionAPI, Services, ChromeUtils, lazy */

// lazy is shared with other parent experiment-apis
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
  Nostr: "resource://ssi/protocols/Nostr.sys.mjs",
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
          async getPrefs() {
            return lazy.browserSsiHelper.getPrefs("nostr");
          },
          async sign(
            message,
            { type },
            { caption = "", submission = "", enforce = false }
          ) {
            const errorValue = null;
            let nEvent = {}; // for type=signEvent

            try {
              // Validate params
              switch (type) {
                case "signEvent": {
                  nEvent = JSON.parse(message);
                  if (!lazy.Nostr.validateEvent(nEvent)) {
                    return errorValue;
                  }
                  break;
                }
                default: {
                  // Not implemented
                  return errorValue;
                }
              }
              if (caption) {
                if (!lazy.browserSsiHelper.validateDialogText(caption)) {
                  return errorValue;
                }
              }
              if (submission) {
                if (!lazy.browserSsiHelper.validateDialogText(submission)) {
                  return errorValue;
                }
              }

              // Check permission
              const enabled = Services.prefs.getBoolPref(
                "selfsovereignidentity.nostr.enabled"
              );
              if (!enabled) {
                return errorValue;
              }
              const credentials =
                await lazy.SsiHelper.searchCredentialsWithoutSecret({
                  protocolName: "nostr",
                  credentialName: "nsec",
                  primary: true,
                });
              if (credentials.length === 0) {
                return errorValue;
              }
              if (type === "signEvent") {
                nEvent = lazy.Nostr.attachPubkey(
                  credentials[0].identifier,
                  nEvent
                );
                if (!nEvent) {
                  // caller's pubkey is different from current primary key.
                  return errorValue;
                }
              }
              const isAuthorized = await lazy.browserSsiHelper.authorize(
                context,
                tabTracker,
                {
                  protocolName: credentials[0].protocolName,
                  credentialName: credentials[0].credentialName,
                },
                {
                  type: "sign",
                  evidence: nEvent,
                  caption,
                  submission,
                  enforce,
                },
                false
              );
              if (!isAuthorized) {
                return errorValue;
              }

              // Sign
              if (type === "signEvent") {
                message = lazy.Nostr.hashEvent(nEvent);
              }
              const signature = await lazy.Nostr.sign(
                message,
                credentials[0].guid
              );
              return signature;
            } catch (e) {
              console.error(e);
              return errorValue;
            }
          },
        },
      },
    };
  }
};
