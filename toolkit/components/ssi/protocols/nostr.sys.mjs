/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { schnorr } from "resource://gre/modules/shared/secp256k1.sys.mjs";
import { bytesToHex } from "resource://gre/modules/shared/utils-hashes.sys.mjs";

export const Nostr = {
  async getSignature(message, guid) {
    // Get private key from store
    const credentials = await Services.ssi.searchCredentialsAsync({guid});
    if (credentials.length === 0 ) return ""
    const key = JSON.parse(credentials[0].properties).seckey;

    // Sign
    const signature = schnorr.sign(message, key);
    const hexSignature = bytesToHex(signature)

    return hexSignature;
  }
}
