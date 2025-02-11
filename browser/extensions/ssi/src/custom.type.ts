type ApplicationName = "ssb";
export type ProtocolName =
  | "bitcoin"
  | "lightning"
  | "ecash"
  | "nostr"
  | "did:dht";
export const availableCalls = [
  "nostr/getPublicKey",
  "nostr/signEvent",
  "nostr/nip04/encrypt",
  "nostr/nip04/decrypt",
  "nostr/nip44/encrypt",
  "nostr/nip44/decrypt",
] as const;
export type AvailableCalls = (typeof availableCalls)[number];

export type SignType = "signEvent";
export type EncryptType = "nip04" | "nip44";
export type DecryptType = "nip04" | "nip44";

interface SelfSovereignIndividualDefaultPrefs {
  enabled: boolean; // selfsovereignindividual.[protocolName].enabled
  usedAccountChanged: boolean; // selfsovereignindividual.[protocolName].event.accountChanged.enabled
}

type PublicKey = string;
type Signature = string;
type PlainText = string;
type CipherText = string;
export interface WindowSSI extends Omit<EventTarget, "dispatchEvent"> {
  _scope: "ssi";
  _proxy: EventTarget;
  _invoke: (event: CustomEvent) => void;

  nostr: {
    _proxy: EventTarget;
    _invoke: (action, data) => void;
    generate: (option?) => Promise<PublicKey>;
    getPublicKey: (option?) => Promise<PublicKey>;
    getPublicKeyWithCallback: (
      callback: (...argments) => unknown,
      option?
    ) => PublicKey;
    sign: (
      message: string,
      option: {
        type: SignType;
      }
    ) => Promise<Signature>;
    signWithCallback: (
      message: string,
      callback: (...argments) => unknown,
      option: {
        type: SignType;
      }
    ) => Signature;
    encrypt: (
      plaintext: string,
      option: {
        type: EncryptType;
        pubkey?: string; // Conversation partner's public key. If type is 'nip04' or 'nip44', then this is required.
        version?: string;
      }
    ) => Promise<CipherText>;
    encryptWithCallback: (
      plaintext: string,
      callback: (...argments) => unknown,
      option: {
        type: EncryptType;
        pubkey?: string; // Conversation partner's public key. If type is 'nip04' or 'nip44', then this is required.
        version?: string;
      }
    ) => CipherText;
    decrypt: (
      ciphertext: string,
      option: {
        type: DecryptType;
        pubkey?: string; // Conversation partner's public key. If type is 'nip04' or 'nip44', then this is required.
        version?: string;
      }
    ) => Promise<PlainText>;
    decryptWithCallback: (
      ciphertext: string,
      callback: (...argments) => unknown,
      option: {
        type: DecryptType;
        pubkey?: string; // Conversation partner's public key. If type is 'nip04' or 'nip44', then this is required.
        version?: string;
      }
    ) => PlainText;
    messageBoard?: unknown;
  } & Omit<EventTarget, "dispatchEvent">;
}
declare global {
  // eslint-disable-next-line no-var
  var ssi: WindowSSI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type FixMe = any;

  /**
   * FireFox only methods
   */
  function cloneInto(
    obj: object,
    scope: Window,
    option?: { cloneFunctions?: boolean; wrapReflectors?: boolean }
  );
  function exportFunction(
    // eslint-disable-next-line @typescript-eslint/ban-types
    func: Function,
    scope: Window,
    option?: { defineAs?: string; allowCrossOriginArguments?: boolean }
  );
  function XPCNativeWrapper(obj: object);
  interface WrappedJSObject {
    ssi: WindowSSI;
  }
  // eslint-disable-next-line no-var
  var wrappedJSObject: WrappedJSObject;
}

/**
 * Message Property
 */
export interface MessageBetweenBackAndContent {
  action: string;
  args: FixMe;
  origin: string;
  application: ApplicationName;
}

const verifiedSymbol = Symbol("verified");
export type NostrEvent = {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey?: string;
  id?: string;
  sig?: string;
  [verifiedSymbol]?: boolean;
};

/**
 * Nostr
 */
export interface SelfSovereignIndividualPrefs {
  nostr: SelfSovereignIndividualDefaultPrefs;
}
