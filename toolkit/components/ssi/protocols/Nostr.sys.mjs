/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { sha256 } from "resource://ssi/protocols/hashes/sha256.sys.mjs";
import {
  bytesToHex,
  concatBytes,
  randomBytes,
} from "resource://ssi/protocols/hashes/utils.sys.mjs";
import { base64, bech32 } from "resource://ssi/protocols/scure-base.sys.mjs";
import { secp256k1 } from "resource://ssi/protocols/curves/secp256k1.sys.mjs";
import { cbc } from "resource://ssi/protocols/ciphers/aes.sys.mjs";
import {
  extract as hkdf_extract,
  expand as hkdf_expand,
} from "resource://ssi/protocols/hashes/hkdf.sys.mjs";
import { hmac } from "resource://ssi/protocols/hashes/hmac.sys.mjs";
import { chacha20 } from "resource://ssi/protocols/ciphers/chacha.sys.mjs";
import { equalBytes } from "resource://ssi/protocols/ciphers/utils.sys.mjs";
import { Bitcoin } from "resource://ssi/protocols/Bitcoin.sys.mjs";

const utf8Decoder = new TextDecoder("utf-8");
const utf8Encoder = new TextEncoder();

export const Nostr = {
  /**
   *
   * @returns {string}
   */
  async generateSecretKey() {
    return Bitcoin.BIP340.generatePrivateKey();
  },

  /**
   *
   * @param {string | Uint8Array<ArrayBufferLike>} secretKey
   * @returns {string}
   */
  async generatePublicKey(secretKey) {
    return Bitcoin.BIP340.generatePublicKey(secretKey);
  },

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
    } else if (type === "nip44") {
      return encryptNip44(plaintext, getConversationKey(privkey, pubkey));
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
    } else if (type === "nip44") {
      return decryptNip44(ciphertext, getConversationKey(privkey, pubkey));
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

// see: https://github.com/nbd-wtf/nostr-tools/blob/master/nip44.ts
const minPlaintextSize = 0x0001; // 1b msg => padded to 32b
const maxPlaintextSize = 0xffff; // 65535 (64kb-1) => padded to 64kb
function getConversationKey(privkeyA, pubkeyB) {
  const sharedX = secp256k1
    .getSharedSecret(privkeyA, "02" + pubkeyB)
    .subarray(1, 33);
  return hkdf_extract(sha256, sharedX, "nip44-v2");
}
function getMessageKeys(conversationKey, nonce) {
  const keys = hkdf_expand(sha256, conversationKey, nonce, 76);
  return {
    chacha_key: keys.subarray(0, 32),
    chacha_nonce: keys.subarray(32, 44),
    hmac_key: keys.subarray(44, 76),
  };
}
function calcPaddedLen(len) {
  if (!Number.isSafeInteger(len) || len < 1) {
    throw new Error("expected positive integer");
  }
  if (len <= 32) {
    return 32;
  }
  const nextPower = 1 << (Math.floor(Math.log2(len - 1)) + 1);
  const chunk = nextPower <= 256 ? 32 : nextPower / 8;
  return chunk * (Math.floor((len - 1) / chunk) + 1);
}
function writeU16BE(num) {
  if (
    !Number.isSafeInteger(num) ||
    num < minPlaintextSize ||
    num > maxPlaintextSize
  ) {
    throw new Error(
      "invalid plaintext size: must be between 1 and 65535 bytes"
    );
  }
  const arr = new Uint8Array(2);
  new DataView(arr.buffer).setUint16(0, num, false);
  return arr;
}
function pad(plaintext) {
  const unpadded = utf8Encoder.encode(plaintext);
  const unpaddedLen = unpadded.length;
  const prefix = writeU16BE(unpaddedLen);
  const suffix = new Uint8Array(calcPaddedLen(unpaddedLen) - unpaddedLen);
  return concatBytes(prefix, unpadded, suffix);
}
function unpad(padded) {
  const unpaddedLen = new DataView(padded.buffer).getUint16(0);
  const unpadded = padded.subarray(2, 2 + unpaddedLen);
  if (
    unpaddedLen < minPlaintextSize ||
    unpaddedLen > maxPlaintextSize ||
    unpadded.length !== unpaddedLen ||
    padded.length !== 2 + calcPaddedLen(unpaddedLen)
  ) {
    throw new Error("invalid padding");
  }
  return utf8Decoder.decode(unpadded);
}
function hmacAad(key, message, aad) {
  if (aad.length !== 32) {
    throw new Error("AAD associated data must be 32 bytes");
  }
  const combined = concatBytes(aad, message);
  return hmac(sha256, key, combined);
}
// metadata: always 65b (version: 1b, nonce: 32b, max: 32b)
// plaintext: 1b to 0xffff
// padded plaintext: 32b to 0xffff
// ciphertext: 32b+2 to 0xffff+2
// raw payload: 99 (65+32+2) to 65603 (65+0xffff+2)
// compressed payload (base64): 132b to 87472b
function decodePayload(payload) {
  if (typeof payload !== "string") {
    throw new Error("payload must be a valid string");
  }
  const plen = payload.length;
  if (plen < 132 || plen > 87472) {
    throw new Error("invalid payload length: " + plen);
  }
  if (payload[0] === "#") {
    throw new Error("unknown encryption version");
  }
  let data;
  try {
    data = base64.decode(payload);
  } catch (error) {
    throw new Error("invalid base64: " + error.message);
  }
  const dlen = data.length;
  if (dlen < 99 || dlen > 65603) {
    throw new Error("invalid data length: " + dlen);
  }
  const vers = data[0];
  if (vers !== 2) {
    throw new Error("unknown encryption version " + vers);
  }
  return {
    nonce: data.subarray(1, 33),
    ciphertext: data.subarray(33, -32),
    mac: data.subarray(-32),
  };
}
function encryptNip44(plaintext, conversationKey, nonce = randomBytes(32)) {
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(
    conversationKey,
    nonce
  );
  const padded = pad(plaintext);
  const ciphertext = chacha20(chacha_key, chacha_nonce, padded);
  const mac = hmacAad(hmac_key, ciphertext, nonce);
  return base64.encode(
    concatBytes(new Uint8Array([2]), nonce, ciphertext, mac)
  );
}
function decryptNip44(payload, conversationKey) {
  const { nonce, ciphertext, mac } = decodePayload(payload);
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(
    conversationKey,
    nonce
  );
  const calculatedMac = hmacAad(hmac_key, ciphertext, nonce);
  if (!equalBytes(calculatedMac, mac)) {
    throw new Error("invalid MAC");
  }
  const padded = chacha20(chacha_key, chacha_nonce, ciphertext);
  return unpad(padded);
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
