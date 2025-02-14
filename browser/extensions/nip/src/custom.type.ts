import { WindowSSI } from "./window.ssi.type";

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

interface SelfSovereignIndividualDefaultPrefs {
  enabled: boolean; // selfsovereignindividual.[protocolName].enabled
  usedAccountChanged: boolean; // selfsovereignindividual.[protocolName].event.accountChanged.enabled
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any;
  function exportFunction(
    // eslint-disable-next-line @typescript-eslint/ban-types
    func: Function,
    scope: Window,
    option?: { defineAs?: string; allowCrossOriginArguments?: boolean }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): (...args) => any;
  function XPCNativeWrapper(obj: object): void;
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
