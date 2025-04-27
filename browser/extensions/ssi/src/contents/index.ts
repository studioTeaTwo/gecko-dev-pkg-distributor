/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import { shouldInject } from "../shared/shouldInject";
import { log } from "../shared/logger";
import { WindowSSI } from "../window.ssi.type";
import { bitcoin, init as bitcoinInit } from "./bitcoin";
import { nostr, init as nostrInit } from "./nostr";
import { _invoke, addEventListener, removeEventListener } from "./api";

/**
 * We waive Xray, so we prepend the global window object with `window.`.
 * ref: https://firefox-source-docs.mozilla.org/dom/scriptSecurity/xray_vision.html
 */

log("content-script working", browser.runtime.getURL("contents.bundle.js"));

// Object shared with inpage scripts.
const windowSSI = new window.Object() as WindowSSI;
windowSSI._scope = "ssi";

windowSSI.bitcoin = bitcoin;
windowSSI.nostr = nostr;

windowSSI._proxy = new window.EventTarget();
// TODO(ssb): Ideally should conceal
windowSSI._invoke = exportFunction(_invoke(windowSSI._proxy), window);
windowSSI.addEventListener = exportFunction(
  addEventListener(windowSSI._proxy),
  window
);
windowSSI.removeEventListener = exportFunction(
  removeEventListener(windowSSI._proxy),
  window
);

if (shouldInject()) {
  // It envisions browser-native API, so the object is persisted.
  window.wrappedJSObject.ssi = windowSSI;
  for (const api of [
    window.wrappedJSObject.ssi,
    window.wrappedJSObject.ssi.bitcoin,
    window.wrappedJSObject.ssi.nostr,
  ]) {
    for (const property of window.Object.getOwnPropertyNames(api)) {
      window.Object.defineProperty(api, property, {
        writable: false,
        configurable: false,
      });
    }
  }
  window.Object.defineProperty(window.wrappedJSObject, "ssi", {
    writable: false,
    configurable: false,
  });
  XPCNativeWrapper(window.wrappedJSObject.ssi);

  bitcoinInit();
  nostrInit();
}
