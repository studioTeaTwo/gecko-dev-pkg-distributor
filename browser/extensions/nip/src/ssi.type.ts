type ApplicationName = "ssb";
type ProtocolName = "bitcoin" | "lightning" | "ecash" | "nostr" | "did:dht";

interface SelfsovereignidentityDefaultPrefs {
  enabled: boolean; // selfsovereignidentity.[protocolName].enabled
  usedAccountChanged: boolean; // selfsovereignidentity.[protocolName].event.accountChanged.enabled
}

type PublicKey = string;
type Signature = string;
type PlainText = string;
export interface WindowSSI extends EventTarget {
  _scope: "ssi";
  _proxy: EventTarget;

  readonly nostr: {
    _proxy: EventTarget;
    generate: (option?) => Promise<PublicKey>;
    getPublicKey: (option?) => Promise<PublicKey>;
    sign: (
      message: string,
      option: {
        type: "signEvent";
      }
    ) => Promise<Signature>;
    decrypt: (ciphertext: string, option?) => Promise<PlainText>;
    messageBoard?: unknown;
  } & EventTarget;
}
declare global {
  // eslint-disable-next-line no-var
  var ssi: WindowSSI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type FixMe = any;
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
export interface MessageBetweenContentAndInpage {
  id;
  application: ApplicationName;
  action: `${ProtocolName}/action`;
  scope: ProtocolName;
  args: FixMe;
}
// on sendResponse
export interface MessageBag {
  data: FixMe;
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
export interface SelfsovereignidentityPrefs {
  nostr: SelfsovereignidentityDefaultPrefs;
}
