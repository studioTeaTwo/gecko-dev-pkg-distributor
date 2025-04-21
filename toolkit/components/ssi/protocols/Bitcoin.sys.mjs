/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { schnorr } from "resource://ssi/protocols/curves/secp256k1.sys.mjs";
import {
  bytesToHex,
  randomBytes,
} from "resource://ssi/protocols/hashes/utils.sys.mjs";
import { sha256 } from "resource://ssi/protocols/hashes/sha256.sys.mjs";
import { sha512 } from "resource://ssi/protocols/hashes/sha512.sys.mjs";
import {
  pbkdf2,
  pbkdf2Async,
} from "resource://ssi/protocols/hashes/pbkdf2.sys.mjs";
import {
  abytes,
  anumber,
} from "resource://ssi/protocols/hashes/_assert.sys.mjs";
import { utils as baseUtils } from "resource://ssi/protocols/scure-base.sys.mjs";
import { wordlists } from "resource://ssi/protocols/utils/wordlists.mjs";

export const Bitcoin = {
  // ref: https://github.com/paulmillr/scure-bip39
  BIP39: {
    /**
     *
     * @param {string} type 'about' | 'browser'
     * @param {number} strength
     * @param {string} passphrase
     */
    async generateMnemonic(type, strength = 256, passphrase = "") {
      anumber(strength);
      if (strength % 32 !== 0 || strength > 256) {
        throw new TypeError("Invalid entropy");
      }
      const nm = entropyToMnemonic(randomBytes(strength / 8), wordlists.en);

      if (type === "about") {
        // Call `Services.ssi.searchCredentialsAsync` from settings
        return nm;
      }

      const xpub = nm;
      const existings = await Services.ssi.searchCredentialsAsync({
        protocolName: "bitcoin",
        credentialName: "bip39",
      });

      const credential = await Services.ssi.addCredential({
        protocolName: "bitcoin",
        credentialName: "bip39",
        identifier: xpub,
        secret: nm,
        primary: existings.length === 0,
        trustedSites: [],
        properties: {
          passphrase,
          displayName: xpub,
          generationFrom: type,
          generationMethod: "new",
          sharedWith: [],
        },
      });
      return credential;
    },
  },

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

/**
 *
 * @param {Uint8Array} ent
 */
function aentropy(ent) {
  abytes(ent, 16, 20, 24, 28, 32);
}

const calcChecksum = entropy => {
  // Checksum is ent.length/4 bits long
  const bitsLeft = 8 - entropy.length / 4;
  // Zero rightmost "bitsLeft" bits in byte
  // For example: bitsLeft=4 val=10111101 -> 10110000
  return new Uint8Array([(sha256(entropy)[0] >> bitsLeft) << bitsLeft]);
};

function getCoder(wordlist) {
  if (
    !Array.isArray(wordlist) ||
    wordlist.length !== 2048 ||
    typeof wordlist[0] !== "string"
  ) {
    throw new Error("Wordlist: expected array of 2048 strings");
  }
  wordlist.forEach(i => {
    if (typeof i !== "string") {
      throw new Error("wordlist: non-string element: " + i);
    }
  });
  return baseUtils.chain(
    baseUtils.checksum(1, calcChecksum),
    baseUtils.radix2(11, true),
    baseUtils.alphabet(wordlist)
  );
}

/**
 *
 * @param {Uint8Array} entropy
 * @param {string[]} wordlist
 * @returns
 */
function entropyToMnemonic(entropy, wordlist) {
  aentropy(entropy);
  const words = getCoder(wordlist).encode(entropy);
  return words.join(" ");
}
