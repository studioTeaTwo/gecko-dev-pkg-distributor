type ApplicationName = "ssb";
type ProtocolName = "bitcoin" | "lightning" | "ecash" | "nostr" | "did:dht";

interface SelfsovereignidentityDefaultPrefs {
  enabled: boolean; // selfsovereignidentity.[protocolName].enabled
  usedAccountChanged: boolean; // selfsovereignidentity.[protocolName].event.accountChanged.enabled
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
