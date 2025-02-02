/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import { shouldInject } from "../shared/shouldInject";
import { log } from "../shared/logger";
import {
  _invoke,
  getPublicKey,
  signEvent,
  nip04Encrypt,
  nip04Decrypt,
  nip44Encrypt,
  nip44Decrypt,
  addEventListener,
  removeEventListener,
  handleAccountChanged,
} from "./api";

declare global {
  interface WrappedJSObject {
    nostr: FixMe;
    nip07Loaded: Map<string, boolean>;
  }
}

log("content-script working", browser.runtime.getURL("contents.bundle.js"));

// Object shared with inpage scripts.
// ref: https://github.com/nostr-protocol/nips/blob/master/07.md
const nostr = new window.Object() as FixMe;
nostr._scope = "nostr";
nostr._provider = "ssb";

nostr.getPublicKey = exportFunction(getPublicKey, window);
nostr.signEvent = exportFunction(signEvent, window);

nostr.nip04 = new window.Object();
nostr.nip04.encrypt = exportFunction(nip04Encrypt, window);
nostr.nip04.decrypt = exportFunction(nip04Decrypt, window);

nostr.nip44 = new window.Object();
nostr.nip44.encrypt = exportFunction(nip44Encrypt, window);
nostr.nip44.decrypt = exportFunction(nip44Decrypt, window);

nostr._proxy = new window.EventTarget();
nostr._invoke = exportFunction(_invoke(nostr._proxy), window);
nostr.addEventListener = exportFunction(addEventListener(nostr._proxy), window);
nostr.removeEventListener = exportFunction(
  removeEventListener(nostr._proxy),
  window
);

const accountChangedHandler = exportFunction(handleAccountChanged, window);

if (shouldInject()) {
  // The message listener to listen to background calls
  // After, emit event to return the response to the inpages.
  browser.runtime.onMessage.addListener(request => {
    log("content-script onMessage", request);
    const action = request.action;
    const data = request.args;

    // forward account changed messaged to inpage script
    if (
      ["nostr/builtinNip07Init", "nostr/builtinNip07Changed"].includes(action)
    ) {
      // TODO(ssb): It depends on the standard spec with other providers.
      if (data) {
        // Inject
        window.wrappedJSObject.nostr = nostr;
        // FIXME(ssb): Typecheck for nip07Loaded. window.Map neither instanceof Map nor instanceof window.Map works.
        if (
          !window.wrappedJSObject.nip07Loaded
        ) {
          window.wrappedJSObject.nip07Loaded = new window.Map();
        }
        window.wrappedJSObject.nip07Loaded.set("ssb", true);
        window.wrappedJSObject.ssi.nostr.addEventListener(
          "accountChanged",
          accountChangedHandler
        );
      } else {
        // Dispose
        if (
          window.wrappedJSObject.nostr &&
          window.wrappedJSObject.nostr._provider === "ssb"
        ) {
          delete window.wrappedJSObject.nostr;
        }
        // FIXME(ssb): Typecheck for nip07Loaded. window.Map neither instanceof Map nor instanceof window.Map works.
        if (
          !window.wrappedJSObject.nip07Loaded
        ) {
          window.wrappedJSObject.nip07Loaded = new window.Map();
        }
        window.wrappedJSObject.nip07Loaded.set("ssb", false);
        window.wrappedJSObject.ssi.nostr.removeEventListener(
          "accountChanged",
          accountChangedHandler
        );
      }
      XPCNativeWrapper(window.wrappedJSObject.nostr);
      XPCNativeWrapper(window.wrappedJSObject.nip07Loaded);
      XPCNativeWrapper(window.wrappedJSObject.ssi);

      // Just in case that app can't add eventListner in window.nostr.
      window.dispatchEvent(
        new CustomEvent("providerChanged", { detail: data })
      );
      log(`inpage providerChanged emit`, data);
    }
  });
}
