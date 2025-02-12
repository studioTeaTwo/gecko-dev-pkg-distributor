/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { schnorr } from "resource://ssi/protocols/curves/secp256k1.sys.mjs";
import { bytesToHex } from "resource://ssi/protocols/hashes/utils.sys.mjs";

export const Bitcoin = {
  BIP340: {
    /**
     *
     * @param {string} message
     * @param {string} guid
     * @returns {string}
     */
    async sign(message, guid) {
      // Get private key from store
      const credentials = await Services.ssi.searchCredentialsAsync({ guid });
      if (credentials.length === 0) {
        return "";
      }
      const key = credentials[0].secret;

      // Sign
      const signature = schnorr.sign(message, key);
      const hexSignature = bytesToHex(signature);

      return hexSignature;
    },
  },
};
