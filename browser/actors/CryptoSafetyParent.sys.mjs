/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* Copyright (c) 2020, The Tor Project, Inc.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  TorDomainIsolator: "resource://gre/modules/TorDomainIsolator.sys.mjs",
  Bech32Decode: "resource://gre/modules/Bech32Decode.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "CryptoStrings", function () {
  return new Localization(["toolkit/global/tor-browser.ftl"]);
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "isCryptoSafetyEnabled",
  "security.cryptoSafety",
  true // Defaults to true.
);

function looksLikeCryptoAddress(s) {
  // P2PKH and P2SH addresses
  // https://stackoverflow.com/a/24205650
  const bitcoinAddr = /^[13][a-km-zA-HJ-NP-Z1-9]{25,39}$/;
  if (bitcoinAddr.test(s)) {
    return true;
  }

  // Bech32 addresses
  if (lazy.Bech32Decode(s) !== null) {
    return true;
  }

  // regular addresses
  const etherAddr = /^0x[a-fA-F0-9]{40}$/;
  if (etherAddr.test(s)) {
    return true;
  }

  // t-addresses
  // https://www.reddit.com/r/zec/comments/8mxj6x/simple_regex_to_validate_a_zcash_tz_address/dzr62p5/
  const zcashAddr = /^t1[a-zA-Z0-9]{33}$/;
  if (zcashAddr.test(s)) {
    return true;
  }

  // Standard, Integrated, and 256-bit Integrated addresses
  // https://monero.stackexchange.com/a/10627
  const moneroAddr =
    /^4(?:[0-9AB]|[1-9A-HJ-NP-Za-km-z]{12}(?:[1-9A-HJ-NP-Za-km-z]{30})?)[1-9A-HJ-NP-Za-km-z]{93}$/;
  if (moneroAddr.test(s)) {
    return true;
  }

  return false;
}

export class CryptoSafetyParent extends JSWindowActorParent {
  async receiveMessage(aMessage) {
    if (
      !lazy.isCryptoSafetyEnabled ||
      aMessage.name !== "CryptoSafety:CopiedText"
    ) {
      return;
    }

    // Read the global clipboard. We assume the contents come from the HTTP
    // page specified in `aMessage.data.host`.
    const trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(
      Ci.nsITransferable
    );
    trans.init(null);
    trans.addDataFlavor("text/plain");
    Services.clipboard.getData(trans, Ci.nsIClipboard.kGlobalClipboard);
    let data = {};
    trans.getTransferData("text/plain", data);
    data = data?.value.QueryInterface(Ci.nsISupportsString).data;

    let address = data?.replace(/\s+/g, "");

    if (!address || !looksLikeCryptoAddress(address)) {
      return;
    }

    if (address.length > 32) {
      address = `${address.substring(0, 32)}…`;
    }

    const [titleText, bodyText, reloadText, dismissText] =
      await lazy.CryptoStrings.formatValues([
        { id: "crypto-safety-prompt-title" },
        {
          id: "crypto-safety-prompt-body",
          args: { address, host: aMessage.data.host },
        },
        { id: "crypto-safety-prompt-reload-button" },
        { id: "crypto-safety-prompt-dismiss-button" },
      ]);

    const buttonPressed = Services.prompt.confirmEx(
      this.browsingContext.topChromeWindow,
      titleText,
      bodyText,
      Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0 +
        Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1,
      reloadText,
      dismissText,
      null,
      null,
      {}
    );

    if (buttonPressed === 0) {
      const { browsingContext } = this.manager;
      const browser = browsingContext.embedderElement;
      if (browser) {
        lazy.TorDomainIsolator.newCircuitForBrowser(
          browser.ownerGlobal.gBrowser.selectedBrowser
        );
      }
    }
  }
}
