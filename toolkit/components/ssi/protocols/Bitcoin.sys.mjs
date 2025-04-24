/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { schnorr } from "resource://ssi/protocols/curves/secp256k1.sys.mjs";
import {
  abytes,
  anumber,
  bytesToHex,
  randomBytes,
} from "resource://ssi/protocols/hashes/utils.sys.mjs";
import { sha256, sha512 } from "resource://ssi/protocols/hashes/sha2.sys.mjs";
import { pbkdf2 } from "resource://ssi/protocols/hashes/pbkdf2.sys.mjs";
import { utils as baseUtils } from "resource://ssi/protocols/scure-base.sys.mjs";
import { wordlists } from "resource://ssi/protocols/utils/wordlists.mjs";
import { HDKey } from "resource://ssi/protocols/utils/hdkey.sys.mjs";
import { SsiHelper } from "resource://gre/modules/SsiHelper.sys.mjs";

// see: browser/components/selfsovereignindividual/src/components/bitcoin/constants.ts
const DefaultTrustedSites = [
  {
    url: "http://localhost",
    name: "",
    enabled: true,
    permissions: { nallowedMethod: [] },
  },
];

export const Bitcoin = {
  // ref: https://github.com/paulmillr/scure-bip32
  BIP32: {
    getHDKeyFromMnemonic(mnemonic, passphrase) {
      const seed = pbkdf2(sha512, normalize(mnemonic).nfkd, psalt(passphrase), {
        c: 2048,
        dkLen: 64,
      });
      const hdkey = HDKey.fromMasterSeed(seed);
      return hdkey;
    },
  },

  // ref: https://github.com/paulmillr/scure-bip39
  BIP39: {
    /**
     *
     * @param {string} origin - origin URL generated from
     * @param {number=} strength
     * @param {string=} passphrase
     */
    async generateMnemonic(origin, strength = 256, passphrase = "") {
      anumber(strength);
      if (strength % 32 !== 0 || strength > 256) {
        throw new TypeError("Invalid entropy");
      }

      const mnemonic = entropyToMnemonic(
        randomBytes(strength / 8),
        wordlists.en
      );
      const hdkey = Bitcoin.BIP32.getHDKeyFromMnemonic(mnemonic, passphrase);
      const xpub = hdkey.publicExtendedKey;
      const xpriv = hdkey.privateExtendedKey;

      if (origin.startsWith("about:")) {
        // Call `Services.ssi.searchCredentialsAsync` from settings
        return { mnemonic, xpub, xpriv };
      }

      // In browser.ssi, Firstly make credential so that the user can authorize. If the user rejects, delete it.
      const ssi = WebExtensionPolicy.getByID(
        "experimentapi-ssi@teatwo.dev"
      )?.extension;
      const defaultTrustedSites = [
        ...DefaultTrustedSites,
        {
          url: ssi.getURL().slice(0, -1),
          name: ssi.name,
          enabled: true,
          permissions: { nallowedMethod: [] },
        },
      ];
      const existings = await Services.ssi.searchCredentialsAsync({
        protocolName: "bitcoin",
        credentialName: "bip39",
      });
      let newCredential = {
        protocolName: "bitcoin",
        credentialName: "bip39",
        identifier: xpub,
        secret: mnemonic,
        primary: existings.length === 0,
        trustedSites: JSON.stringify(defaultTrustedSites),
        dialogicAuthorizedSites: JSON.stringify([]),
        properties: JSON.stringify({
          passphrase,
          xpriv,
          displayName: xpub,
          generationFrom: origin,
          generationMethod: "new",
          sharedWith: [],
        }),
      };
      newCredential = SsiHelper.vanillaObjectToCredential(newCredential);
      const credential = await Services.ssi.addCredentialAsync(newCredential);

      // Exclude the secret properties for browser.ssi.
      // eslint-disable-next-line no-unused-vars
      const { secret, properties, unknownFields, ...rest } = credential;
      return rest;
    },

    /**
     *
     * @param {string} mnemonic
     * @param {string[]} wordlist
     * @returns {boolean}
     */
    validateMnemonic(mnemonic, wordlist = wordlists.en) {
      try {
        mnemonicToEntropy(mnemonic, wordlist);
      } catch (e) {
        return false;
      }
      return true;
    },
  },

  BIP340: {
    generatePrivateKey() {
      return schnorr.utils.randomPrivateKey();
    },

    /**
     *
     * @param {string | Uint8Array<ArrayBufferLike>} secretKey
     * @returns
     */
    generatePublicKey(secretKey) {
      return bytesToHex(schnorr.getPublicKey(secretKey));
    },

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
 * @param {string} str
 * @returns
 */
function nfkd(str) {
  if (typeof str !== "string") {
    throw new TypeError("invalid mnemonic type: " + typeof str);
  }
  return str.normalize("NFKD");
}

/**
 *
 * @param {string} str
 * @returns
 */
function normalize(str) {
  const norm = nfkd(str);
  const words = norm.split(" ");
  if (![12, 15, 18, 21, 24].includes(words.length)) {
    throw new Error("Invalid mnemonic");
  }
  return { nfkd: norm, words };
}

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
 * @param {string} mnemonic
 * @param {string[]} wordlist
 * @returns {Uint8Array}
 */
function mnemonicToEntropy(mnemonic, wordlist) {
  const { words } = normalize(mnemonic);
  const entropy = getCoder(wordlist).decode(words);
  aentropy(entropy);
  return entropy;
}

/**
 *
 * @param {Uint8Array} entropy
 * @param {string[]} wordlist
 * @returns {string}
 */
function entropyToMnemonic(entropy, wordlist) {
  aentropy(entropy);
  const words = getCoder(wordlist).encode(entropy);
  return words.join(" ");
}

const psalt = passphrase => nfkd("mnemonic" + passphrase);

/**
 *
 * @param {string} mnemonic
 * @param {string} passphrase
 * @returns {Uint8Array}
 */
export function mnemonicToSeedSync(mnemonic, passphrase = "") {
  return pbkdf2(sha512, normalize(mnemonic).nfkd, psalt(passphrase), {
    c: 2048,
    dkLen: 64,
  });
}
