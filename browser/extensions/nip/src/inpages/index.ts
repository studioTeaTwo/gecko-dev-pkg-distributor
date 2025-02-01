/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import { shouldInject } from "../shared/shouldInject";
import { log } from "../shared/logger";

log("inpage-script working");

if (shouldInject()) {
  // The message listener to listen to content calls
  // After, emit event to return the reponse to the web apps.
  window.addEventListener("message", event => {
    if (event.source !== window || event.data.id !== "native") {
      return;
    }

    const action = event.data.data.action;
    const data = event.data.data.data;
    if (event.data.scope === "nostr") {
      if (action === "builtinNip07Init" || action === "builtinNip07Changed") {
        if (data) {
          // Inject Class here for gaining permission.
          // TODO(ssb): Move to contents script
          window.nostr._proxy = new EventTarget();
          window.nostr.dispatchEvent = (...args) => {
            return window.nostr._proxy.dispatchEvent(...args);
          };
          window.nostr.addEventListener = (...args) => {
            return window.nostr._proxy.addEventListener(...args);
          };
          window.nostr.removeEventListener = (...args) => {
            return window.nostr._proxy.removeEventListener(...args);
          };
          window.ssi.nostr.addEventListener(
            "accountChanged",
            accountChangedHandler
          );
        } else {
          // Dispose
          window.ssi.nostr.removeEventListener(
            "accountChanged",
            accountChangedHandler
          );
        }
      }
    }
  });
}

const accountChangedHandler = (event: CustomEvent<string>) => {
  const newPublicKey = event.detail;

  log(`inpage accountChanged emit`, event);
  window.nostr.dispatchEvent(
    new CustomEvent("accountChanged", {
      detail: newPublicKey,
      bubbles: true,
    })
  );
};
