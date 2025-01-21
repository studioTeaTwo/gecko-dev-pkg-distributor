// ref: https://github.com/nbd-wtf/nostr-tools
import { Hex } from "@noble/curves/abstract/utils";
import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";

/**
 * Bitocin
 */
export const BIP340 = {
  generateSecretKey: () => schnorr.utils.randomPrivateKey(),
  generatePublicKey: (secretKey: Hex) =>
    bytesToHex(schnorr.getPublicKey(secretKey)),
};

/**
 * Nostr
 */
export type NostrPrefix = "nsec" | "npub";
export type NostrSecretKey = `nsec1${string}`;

export const NostrTypeGuard = {
  isNSec: (value?: string | null): value is NostrSecretKey =>
    /^nsec1[a-z\d]{58}$/.test(value || ""),
};

const Bech32MaxSize = 5000;
export const encodeToNostrKey = (
  prefix: "nsec" | "npub",
  bytes: Uint8Array
) => {
  const words = bech32.toWords(bytes);
  return bech32.encode(
    prefix,
    words,
    Bech32MaxSize
  ) as `${NostrPrefix}1${string}`;
};
export const decodeFromNostrKey = (nip19: `${NostrPrefix}1${string}`) => {
  const { prefix, words } = bech32.decode(nip19, Bech32MaxSize);
  const data = new Uint8Array(bech32.fromWords(words));

  switch (prefix) {
    case "nsec":
      return { type: prefix, data };
    case "npub":
      return { type: prefix, data: bytesToHex(data) };
  }
};
