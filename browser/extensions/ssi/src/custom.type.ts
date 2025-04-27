import { WindowSSI } from "./window.ssi.type";

type ApplicationName = "ssb";
export type ProtocolName = "bitcoin" | "nostr";
export const availableCallsBitcoin = [
  "bitcoin/generate",
  "bitcoin/shareWith",
] as const;
export const availableCallsNostr = [
  "nostr/getPublicKey",
  "nostr/signEvent",
  "nostr/nip04/encrypt",
  "nostr/nip04/decrypt",
  "nostr/nip44/encrypt",
  "nostr/nip44/decrypt",
] as const;
export const availableCalls = [
  ...availableCallsBitcoin,
  ...availableCallsNostr,
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
  function cloneInto<T>(
    obj: object,
    scope: Window,
    options?: { cloneFunctions?: boolean; wrapReflectors?: boolean }
  ): T;
  function exportFunction(
    // eslint-disable-next-line @typescript-eslint/ban-types
    func: Function,
    scope: Window,
    options?: { defineAs?: string; allowCrossOriginArguments?: boolean }
  ): (...args) => FixMe;
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
  bitcoin: SelfSovereignIndividualDefaultPrefs;
  nostr: SelfSovereignIndividualDefaultPrefs;
}
