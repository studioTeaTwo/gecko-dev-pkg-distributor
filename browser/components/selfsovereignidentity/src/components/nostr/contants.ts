import { NostrCredential } from "../../custom.type";

export const SafeProtocols = ["http", "https", "moz-extension"];
export const SpecialCards = ["*", "<all_urls>"];
export const DefaultTrustedSites = [
  {
    url: "http://localhost",
    name: "",
    enabled: true,
    permissions: {},
  },
];

export const DefaultExcludedKindList = {
  13194: { nip: 47, name: "Wallet Info" },
  23194: { nip: 47, name: "Wallet Request" },
  9734: { nip: 57, name: "Zap Request" },
  9321: { nip: 61, name: "Nutzap" },
};
export const DefaultExcludedKinds = Object.keys(DefaultExcludedKindList);

// "guid", "timeCreated" are generated on services.ssi.
export const NostrTemplate: Omit<NostrCredential, "guid" | "timeCreated"> = {
  protocolName: "nostr",
  credentialName: "nsec",
  identifier: "", // npubkey
  secret: "", // raw seckey
  primary: false,
  trustedSites: [],
  passwordAuthorizedSites: [],
  properties: {
    displayName: "",
  },
};
