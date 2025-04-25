import { DialogDisplayOption, NallowedMethod } from "../../custom.type";

export const SafeProtocols = ["http", "https", "moz-extension"];
export const SpecialCards = ["*", "<all_urls>"];

/**
 * Copyset of initial values in StaticPrefList.yaml for the setting UI.
 * Note that master data remains StaticPrefList.yaml because those are shared with other components like browser.ssi as well.
 */
export const NallowedMethods: NallowedMethod[] = [
  "read",
  "sign",
  "encrypt",
  "decrypt",
  "generate",
  "custom",
];
export const DefaultNallowedMethods = [];

export const EveryTimeAuthorizedMethods: NallowedMethod[] = [
  "read",
  "sign",
  "encrypt",
  "decrypt",
  "generate",
  "custom",
];
export const DefaultEveryTimeAuthorizedMethods = [];

export const DialogDisplayOptions: DialogDisplayOption[] = [
  "read-confirmOnly",
  "read-passwordOnly",
  "sign-confirmOnly",
  "sign-passwordOnly",
  "encrypt-confirmOnly",
  "encrypt-passwordOnly",
  "decrypt-confirmOnly",
  "decrypt-passwordOnly",
  "generate-confirmOnly",
  "generate-passwordOnly",
  "custom-confirmOnly",
  "custom-passwordOnly",
];
export const DefaultDialogDisplayOptions: DialogDisplayOption[] = [
  "read-confirmOnly",
  "sign-confirmOnly",
  "encrypt-confirmOnly",
  "decrypt-confirmOnly",
  "generate-confirmOnly",
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
