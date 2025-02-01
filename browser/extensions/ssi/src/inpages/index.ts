/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import { shouldInject } from "../shared/shouldInject";
import { log } from "../shared/logger";
import { WindowSSI } from "../custom.type";
import { nostr } from "./nostr";

log("inpage-script working");

const windowSSI: WindowSSI = Object.create(null, {
  _scope: {
    value: "ssi",
    enumerable: true,
  },
  _proxy: {
    value: new EventTarget(),
    enumerable: true,
  },

  nostr: {
    value: nostr,
    enumerable: true,
  },

  // TODO(ssb): Ideally should conceal
  _invoke: {
    value: function (event: CustomEvent) {
      return windowSSI._proxy.dispatchEvent(event);
    },
    enumerable: true,
  },
  addEventListener: {
    value: function (
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: AddEventListenerOptions | boolean
    ) {
      return windowSSI._proxy.addEventListener(type, callback, options);
    },
    enumerable: true,
  },
  removeEventListener: {
    value: function (
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: EventListenerOptions | boolean
    ) {
      return windowSSI._proxy.removeEventListener(type, callback, options);
    },
    enumerable: true,
  },
});

if (shouldInject()) {
  // It envisions browser-native API, so the object is persisted.
  window.ssi = windowSSI;
  Object.defineProperty(window, "ssi", {
    writable: false,
    configurable: false,
  });
}
