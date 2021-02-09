/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* Copyright (c) 2020, The Tor Project, Inc.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "isCryptoSafetyEnabled",
  "security.cryptoSafety",
  true // Defaults to true.
);

export class CryptoSafetyChild extends JSWindowActorChild {
  handleEvent(event) {
    if (
      !lazy.isCryptoSafetyEnabled ||
      // Ignore non-HTTP addresses.
      // We do this before reading the host property since this is not available
      // for about: pages.
      !this.document.documentURIObject.schemeIs("http") ||
      // Ignore onion addresses.
      this.document.documentURIObject.host.endsWith(".onion") ||
      (event.type !== "copy" && event.type !== "cut")
    ) {
      return;
    }

    // We send a message to the parent to inspect the clipboard content.
    // NOTE: We wait until next cycle to allow the event to propagate and fill
    // the clipboard before being read.
    // NOTE: Using navigator.clipboard.readText fails with Wayland. See
    // tor-browser#42702.
    lazy.setTimeout(() => {
      this.sendAsyncMessage("CryptoSafety:CopiedText", {
        host: this.document.documentURIObject.host,
      });
    });
  }
}
