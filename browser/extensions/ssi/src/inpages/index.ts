/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import { shouldInject } from "../shared/shouldInject";
import { log } from "../shared/logger";
import { WindowSSI } from "../custom.type";
import { init as nostrInit, nostr } from "./nostr";

log("inpage-script working");

const windowSSI: WindowSSI = {
  _scope: "ssi",
  _proxy: new EventTarget(),

  nostr,

  dispatchEvent(event: Event) {
    return windowSSI._proxy.dispatchEvent(event);
  },
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ) {
    return windowSSI._proxy.addEventListener(type, callback, options);
  },
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ) {
    return windowSSI._proxy.removeEventListener(type, callback, options);
  },
};

if (shouldInject()) {
  // It envisions browser-native API, so the object is persisted.
  window.ssi = Object.freeze(windowSSI);
  Object.defineProperty(window, "ssi", {
    writable: false,
    configurable: false,
  });

  nostrInit();
}
