import { BitcoinCredential } from "../../custom.type";

/**
 * Copyset of initial values in StaticPrefList.yaml for the setting UI.
 * Note that master data remains StaticPrefList.yaml because those are shared with other components like browser.ssi as well.
 */

// "guid", "timeCreated" are generated on services.ssi.
export const BitcoinTemplate: Omit<BitcoinCredential, "guid" | "timeCreated"> =
  {
    protocolName: "bitcoin",
    credentialName: "bip39",
    identifier: "", // xpub
    secret: "", // mnemonic
    primary: false,
    trustedSites: [],
    dialogicAuthorizedSites: [],
    properties: {
      passphrase: "",
      xpriv: "",
      displayName: "",
      generationMethod: "new",
      generationFrom: "about",
      memo: "",
    },
  };
