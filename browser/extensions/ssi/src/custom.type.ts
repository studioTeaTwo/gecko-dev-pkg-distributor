type ApplicationName = "ssb";
type ProtocolName = "bitcoin" | "lightning" | "ecash" | "nostr" | "did:dht";
export const availableCalls = [
  "nostr/getPublicKey",
  "nostr/signEvent",
] as const;
type AvailableCalls = (typeof availableCalls)[number];

interface SelfsovereignidentityDefaultPrefs {
  enabled: boolean; // selfsovereignidentity.[protocolName].enabled
  usedAccountChanged: boolean; // selfsovereignidentity.[protocolName].event.accountChanged.enabled
}

type PublicKey = string;
type Signature = string;
type PlainText = string;
export interface WindowSSI extends Omit<EventTarget, "dispatchEvent"> {
  _scope: "ssi";
  _proxy: EventTarget;
  _invoke: (event: CustomEvent) => void;

  readonly nostr: {
    _proxy: EventTarget;
    _invoke: (action, data) => void;
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
  // eslint-disable-next-line @typescript-eslint/ban-types
  function exportFunction(
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
  function callBackground<T>(action: AvailableCalls, option: FixMe): Promise<T>;
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
export interface SelfsovereignidentityPrefs {
  nostr: SelfsovereignidentityDefaultPrefs;
}
