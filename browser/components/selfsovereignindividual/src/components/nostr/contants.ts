import { NostrCredential } from "../../custom.type";

export const SafeProtocols = ["http", "https", "moz-extension"];
export const SpecialCards = ["*", "<all_urls>"];

/**
 * Copyset of initial values in StaticPrefList.yaml for the setting UI.
 * Note that master data remains StaticPrefList.yaml because those are shared with other components like browser.ssi as well.
 */
export const DefaultExcludedKindList = {
  13194: { nip: 47, name: "NWC Wallet Info" },
  23194: { nip: 47, name: "NWC Wallet Request" },
};
export const DefaultExcludedKinds = Object.keys(DefaultExcludedKindList);

export const NallowedMethods = ["read", "sign", "encrypt", "decrypt", "custom"];
export const DefaultNallowedMethods = [];

export const EveryTimeAuthorizedMethods = [
  "read",
  "sign",
  "encrypt",
  "decrypt",
  "custom",
];
export const DefaultEveryTimeAuthorizedMethods = [];

export const DialogDisplayOptions = [
  "read-confirmOnly",
  "read-passwordOnly",
  "sign-confirmOnly",
  "sign-passwordOnly",
  "encrypt-confirmOnly",
  "encrypt-passwordOnly",
  "decrypt-confirmOnly",
  "decrypt-passwordOnly",
  "custom-confirmOnly",
  "custom-passwordOnly",
];
export const DefaultDialogDisplayOptions = [
  "read-confirmOnly",
  "sign-confirmOnly",
  "encrypt-confirmOnly",
  "decrypt-confirmOnly",
  "custom-confirmOnly",
];

/**
 * Initial values for key generation
 */

export const DefaultTrustedSites = [
  {
    url: "http://localhost",
    name: "",
    enabled: true,
    permissions: { nallowedMethod: DefaultNallowedMethods },
  },
];

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
    generationMethod: "import",
    memo: "",
  },
};
