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
  13194: { nip: 47, name: "NWC Wallet Info" },
  23194: { nip: 47, name: "NWC Wallet Request" },
};
export const DefaultExcludedKinds = Object.keys(DefaultExcludedKindList);
export const TrustedMethodOptions = [
  "read",
  "read-passwordOnly",
  "sign",
  "sign-passwordOnly",
  "encrypt",
  "encrypt-passwordOnly",
  "decrypt",
  "decrypt-passwordOnly",
  "custom",
  "custom-passwordOnly",
];
export const DefaultTrustedMethods = [];

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
