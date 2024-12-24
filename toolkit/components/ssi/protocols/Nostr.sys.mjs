/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Bitcoin } from "resource://gre/modules/shared/Bitcoin.sys.mjs";

export const Nostr = {
  async sign(message, guid) {
    const signature = await Bitcoin.BIP340.sign(message, guid);
    return signature;
  },
};
