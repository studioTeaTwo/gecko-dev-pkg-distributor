/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { sha256 } from "resource://ssi/protocols/sha256.sys.mjs";
import { bytesToHex } from "resource://ssi/protocols/utils-hashes.sys.mjs";
import { bech32 } from "resource://ssi/protocols/scure-base.sys.mjs";
import { Bitcoin } from "resource://ssi/protocols/Bitcoin.sys.mjs";

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
   * @param {string} npub npub1abc...
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
