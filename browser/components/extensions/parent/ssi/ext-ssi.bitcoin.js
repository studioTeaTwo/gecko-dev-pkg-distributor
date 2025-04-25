/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals ExtensionCommon, ExtensionAPI, Services, ChromeUtils, lazy */

// lazy is shared with other parent experiment-apis
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
  Bitcoin: "resource://ssi/protocols/Bitcoin.sys.mjs",
  Nostr: "resource://ssi/protocols/Nostr.sys.mjs",
  browserSsiHelper: "resource://builtin-addons/ssi/browserSsiHelper.sys.mjs",
});

this["ssi.bitcoin"] = class extends ExtensionAPI {
  getAPI(context) {
    let EventManager = ExtensionCommon.EventManager;

    return {
      ssi: {
        bitcoin: {
          // ref: https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/events.html
          onPrimaryChanged: new EventManager({
            context,
            name: "ssi.bitcoin.onPrimaryChanged",
            register: lazy.browserSsiHelper.onPrimaryChangedRegister("bitcoin"),
          }).api(),
          onPrefEnabledChanged: new EventManager({
            context,
            name: "ssi.bitcoin.onPrefEnabledChanged",
            register:
              lazy.browserSsiHelper.onPrefEnabledChangedRegister("bitcoin"),
          }).api(),
          async getPrefs() {
            return lazy.browserSsiHelper.getPrefs("bitcoin");
          },
          async generate(
            tabId,
            { type, strength, passphrase, path },
            { caption = "", submission = "", enforce = false }
          ) {
            const errorValue = null;

            try {
              // Validate params
              switch (type) {
                // Only the check for required. Value validation will be executed in services.ssi.
                case "mnemonic":
                  if (!strength) {
                    return errorValue;
                  }
                  break;
                case "derivation":
                  if (!path) {
                    return errorValue;
                  }
                  break;
                default:
                  return errorValue;
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
                "selfsovereignindividual.bitcoin.enabled"
              );
              if (!enabled) {
                return errorValue;
              }

              // Firstly make credential so that the user can authorize. If the user rejects, delete it.
              let credential = null;
              const { site } = lazy.browserSsiHelper.getOrigin(context, tabId);
              if (type === "mnemonic") {
                credential = await lazy.Bitcoin.BIP39.generateMnemonic(
                  site.origin,
                  strength,
                  passphrase
                );
              } else if (type === "derivation") {
                // Not implemented
              }

              // Authorize
              const credentialName = type === "mnemonic" ? "bip39" : "bip32";
              const pointing = {
                protocolName: "bitcoin",
                credentialName,
              };
              const isAuthorized = await lazy.browserSsiHelper.authorize(
                context,
                tabId,
                pointing,
                {
                  type: "generate",
                  evidence: { type, strength, passphrase, path },
                  caption,
                  submission,
                  enforce,
                },
                false
              );
              if (!isAuthorized) {
                // Delete the credential
                await Services.ssi.removeCredential(credential);
                return errorValue;
              }

              // NOTE(ssb): Decide identifier to webapp.
              // It seems to be preferable that it is not an "identifier" such as xpub to prevent correlation,
              // but the decision must be made taking into account the use case on the webapp side.
              // Therefore, at the here and now, we are deferring the decision.
              return credential.identifier;
            } catch (e) {
              console.error(e);
              return errorValue;
            }
          },
          async shareWith(
            tabId,
            pubkey,
            { type, xpub, path },
            { caption = "", submission = "", enforce = false }
          ) {
            const errorValue = null;

            try {
              // Validate params
              enforce = true; // NOTE(ssb): Make it mandatory for now
              switch (type) {
                // Only the check for required. Value validation will be executed in services.ssi.
                case "mnemonic":
                  // No required
                  break;
                case "derivation":
                  if (!path) {
                    return errorValue;
                  }
                  break;
                case "xpriv":
                  if (!xpub) {
                    return errorValue;
                  }
                  break;
                default:
                  return errorValue;
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
              // Need not only bitcoin but also nostr
              const enabled =
                Services.prefs.getBoolPref(
                  "selfsovereignindividual.bitcoin.enabled"
                ) &&
                Services.prefs.getBoolPref(
                  "selfsovereignindividual.nostr.enabled"
                );
              if (!enabled) {
                return errorValue;
              }

              const nostrKeys =
                await lazy.SsiHelper.searchCredentialsWithoutSecret({
                  protocolName: "nostr",
                  credentialName: "nsec",
                  primary: true,
                });
              if (nostrKeys.length === 0) {
                return errorValue;
              }

              // Get the shared credential.
              // TODO(ssb): Here comes all secret information. It is necessary if there is a reason to present it to the user, but if not, encapsulate it in services.ssi.
              const pointing = {
                protocolName: "bitcoin",
              };
              if (type === "mnemonic") {
                pointing.credentialName = "bip39";
                pointing.primary = true;
              } else if (type === "xpriv") {
                pointing.identifier = xpub;
              } else if (type === "derivation") {
                // Not implemented
              }
              let credentials = await Services.ssi.searchCredentialsAsync(
                pointing
              );
              if (credentials.length === 0) {
                return errorValue;
              }

              // Authorize
              let npub = "";
              if (pubkey.startsWith("npub")) {
                npub = pubkey;
                pubkey = lazy.Nostr.convertPublicKey(pubkey);
              } else {
                npub = lazy.Nostr.convertPublicKey(pubkey);
              }
              const isAuthorized = await lazy.browserSsiHelper.authorize(
                context,
                tabId,
                pointing,
                {
                  type: "custom",
                  evidence: {
                    you: nostrKeys[0].identifier,
                    partner: npub,
                    sharedCredential: credentials[0].identifier,
                    displayName: JSON.parse(credentials[0].properties)
                      .displayName,
                    type,
                    xpub,
                    path,
                  },
                  caption,
                  submission,
                  enforce,
                },
                false
              );
              if (!isAuthorized) {
                return errorValue;
              }

              // Encrypt
              const ciphertext = await lazy.Nostr.encrypt(
                credentials[0].secret,
                nostrKeys[0].guid,
                { type: "nip44", pubkey }
              );

              // Record the share
              const { site } = lazy.browserSsiHelper.getOrigin(context, tabId);
              const sender = nostrKeys[0].identifier;
              const receiver = npub;
              // It has been updated due to authorization, so get it again.
              credentials = await Services.ssi.searchCredentialsAsync(pointing);
              const properties = JSON.parse(credentials[0].properties);
              properties.sharing.push({
                url: site.origin,
                guid: credentials[0].guid,
                identifier: credentials[0].identifier,
                sender,
                receiver,
                date: Date.now(),
              });
              const newCredential = credentials[0].clone();
              newCredential.properties = context.jsonStringify(properties);
              await Services.ssi.modifyCredential(
                credentials[0],
                newCredential
              );

              return {
                secret: ciphertext,
                sender, // Unnecessary?
                receiver,
              };
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
