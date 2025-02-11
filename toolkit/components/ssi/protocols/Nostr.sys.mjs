/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { sha256 } from "resource://ssi/protocols/hashes/sha256.sys.mjs";
import {
  bytesToHex,
  randomBytes,
} from "resource://ssi/protocols/hashes/utils.sys.mjs";
import { base64, bech32 } from "resource://ssi/protocols/scure-base.sys.mjs";
import { secp256k1 } from "resource://ssi/protocols/curves/secp256k1.sys.mjs";
import { cbc } from "resource://ssi/protocols/ciphers/aes.sys.mjs";
import { Bitcoin } from "resource://ssi/protocols/Bitcoin.sys.mjs";

const utf8Decoder = new TextDecoder("utf-8");
const utf8Encoder = new TextEncoder();

export const Nostr = {
  /**
   *
   * @param {string} message
   * @param {string} guid
   * @returns {string}
   */
  async sign(message, guid) {
    const signature = await Bitcoin.BIP340.sign(message, guid);
    return signature;
  },
  /**
   *
   * @param {string} plaintext
   * @param {string} guid
   * @param {object} option
   * @returns {string}
   */
  async encrypt(plaintext, guid, { type, pubkey }) {
    // Get private key from store
    const credentials = await Services.ssi.searchCredentialsAsync({ guid });
    if (credentials.length === 0) {
      return "";
    }
    const privkey = credentials[0].secret;

    if (type === "nip04") {
      return encryptNip04(privkey, pubkey, plaintext);
    }

    return "";
  },
  /**
   *
   * @param {string} ciphertext
   * @param {string} guid
   * @param {object} option
   * @returns {string}
   */
  async decrypt(ciphertext, guid, { type, pubkey }) {
    // Get private key from store
    const credentials = await Services.ssi.searchCredentialsAsync({ guid });
    if (credentials.length === 0) {
      return "";
    }
    const privkey = credentials[0].secret;

    if (type === "nip04") {
      return decryptNip04(privkey, pubkey, ciphertext);
    }

    return "";
  },
  /**
   *
   * @param {object} event Nostr Event
   * @returns {string}
   */
  hashEvent(event) {
    const eventHash = bytesToHex(
      sha256(new TextEncoder().encode(_serializeEvent(event)))
    );
    return eventHash;
  },
  /**
   *
   * @param {object} event Nostr Event
   * @returns {boolean}
   */
  validateEvent(event) {
    return _validateEvent(event);
  },
  /**
   *
   * @param {string} npub "npub1abc..."
   * @param {object} event Nostr Event
   * @returns {object}
   */
  attachPubkey(npub, event) {
    const decoded = _decodeNpub(npub);
    if (event.pubkey !== decoded) {
      return null;
    }
    event.pubkey = decoded;
    return event;
  },
};

// see: https://github.com/nbd-wtf/nostr-tools/blob/master/nip04.ts
function encryptNip04(privkey, pubkey, data) {
  const key = secp256k1.getSharedSecret(privkey, "02" + pubkey);
  const normalizedKey = getNormalizedX(key);

  let iv = Uint8Array.from(randomBytes(16));
  let plaintext = utf8Encoder.encode(data);

  let ciphertext = cbc(normalizedKey, iv).encrypt(plaintext);

  let ctb64 = base64.encode(new Uint8Array(ciphertext));
  let ivb64 = base64.encode(new Uint8Array(iv.buffer));

  return `${ctb64}?iv=${ivb64}`;
}
function decryptNip04(privkey, pubkey, data) {
  const [ctb64, ivb64] = data.split("?iv=");
  const key = secp256k1.getSharedSecret(privkey, "02" + pubkey);
  const normalizedKey = getNormalizedX(key);

  const iv = base64.decode(ivb64);
  const ciphertext = base64.decode(ctb64);

  const plaintext = cbc(normalizedKey, iv).decrypt(ciphertext);

  return utf8Decoder.decode(plaintext);
}
function getNormalizedX(key) {
  return key.slice(1, 33);
}

function _decodeNpub(npub) {
  const Bech32MaxSize = 5000;
  const { prefix, words } = bech32.decode(npub, Bech32MaxSize);
  if (prefix !== "npub") {
    throw new Error("Not npub!");
  }
  return bytesToHex(new Uint8Array(bech32.fromWords(words)));
}

// based upon : https://github.com/nbd-wtf/nostr-tools/blob/master/core.ts#L33
function _validateEvent(event) {
  // After IPC isn't Object.prototype
  // if (!(event instanceof Object)) {
  if (typeof event !== "object") {
    return false;
  }
  if (typeof event.kind !== "number") {
    return false;
  }
  if (typeof event.content !== "string") {
    return false;
  }
  if (typeof event.created_at !== "number") {
    return false;
  }
  if (typeof event.pubkey !== "string") {
    return false;
  }
  if (!event.pubkey.match(/^[a-f0-9]{64}$/)) {
    return false;
  }

  if (!Array.isArray(event.tags)) {
    return false;
  }
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i];
    if (!Array.isArray(tag)) {
      return false;
    }
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === "object") {
        return false;
      }
    }
  }

  return true;
}

// from: https://github.com/nbd-wtf/nostr-tools/blob/master/pure.ts#L43
function _serializeEvent(event) {
  if (!_validateEvent(event)) {
    throw new Error("can't serialize event with wrong or missing properties");
  }

  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}
