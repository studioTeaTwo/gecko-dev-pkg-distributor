import { NostrCredential } from "../../custom.type";

/**
 * Copyset of initial values in StaticPrefList.yaml for the setting UI.
 * Note that master data remains StaticPrefList.yaml because those are shared with other components like browser.ssi as well.
 */
export const DefaultExcludedKindList = {
  13194: { nip: 47, name: "NWC Wallet Info" },
  23194: { nip: 47, name: "NWC Wallet Request" },
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
  dialogicAuthorizedSites: [],
  properties: {
    generationMethod: "import",
    generationFrom: "",
    sharing: [],
    displayName: "",
    memo: "",
  },
};
