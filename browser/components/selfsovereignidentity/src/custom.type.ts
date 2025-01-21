export type MenuItem = ProtocolName | "";

/**
 * Selfsovereignidentity prefs
 * ref: modules/libpref/init/StaticPrefList.yaml
 */
export interface ProtocolDefaultPrefs {
  enabled: boolean; // selfsovereignidentity.[protocolName].enabled
  usedPrimarypasswordToSettings: boolean; // selfsovereignidentity.[protocolName].primarypassword.toSettings.enabled
  expiryTimeForPrimarypasswordToSettings: number; // selfsovereignidentity.[protocolName].primarypassword.toSettings.expiryTime
  usedPrimarypasswordToApps: boolean; // selfsovereignidentity.[protocolName].primarypassword.toApps.enabled
  expiryTimeForPrimarypasswordToApps: number; // selfsovereignidentity.[protocolName].primarypassword.ToApps.expiryTime
  usedTrustedSites: boolean; // selfsovereignidentity.[protocolName].trustedSites.enabled
  usedAccountChanged: boolean; // selfsovereignidentity.[protocolName].event.accountChanged.enabled
}
export interface SelfsovereignidentityPrefs {
  base: {
    menuPin: MenuItem; // selfsovereignidentity.ui.menuPin
    primaryPasswordEnabled: boolean; // SsiHelper.isPrimaryPasswordSet()
    passwordRevealVisible: boolean; // Services.policies.isAllowed("passwordReveal")
    addons: { id: string; name: string; url: string }[]; // built-in addons list
  };
  nostr: {
    tabPin: string; // selfsovereignidentity.nostr.ui.tabPin
    tabPinInNip07: string; // selfsovereignidentity.nostr.ui.nip07.tabPin
    usedBuiltinNip07: boolean; // selfsovereignidentity.nostr.builtinNip07.enabled
  } & ProtocolDefaultPrefs;
}

/**
 * credential info base
 * ref: toolkit/components/ssi/nsICredentialInfo.idl
 */
export type ProtocolName =
  | "bitcoin"
  | "lightning"
  | "ecash"
  | "nostr"
  | "did:dht";
export type CredentialName = "bip39" | "lnc" | "nsec";
type OnlyUsedNsICredentialInfo = Omit<
  nsICredentialInfo,
  "unknownFields" | "init" | "equals" | "matches" | "clone"
> &
  Omit<nsICredentialMetaInfo, keyof nsICredentialMetaInfo>;
export interface Credential
  extends Omit<
    OnlyUsedNsICredentialInfo,
    "trustedSites" | "passwordAuthorizedSites" | "properties"
  > {
  protocolName: ProtocolName;
  credentialName: CredentialName;
  trustedSites: {
    url: string;
    name: string;
    enabled: boolean;
    permissions: Record<string, unknown>;
  }[];
  passwordAuthorizedSites: {
    url: string;
    name: string;
    expiryTime: number;
    permissions: Record<string, unknown>;
  }[];
  properties: object;
  guid?: string;
}
// Pass object type through JSON.stringify for IPC & JSONstorage
export type CredentialForPayload = OnlyUsedNsICredentialInfo;

export interface SelfsovereignidentityDefaultProps {
  prefs: SelfsovereignidentityPrefs;
  credentials: Credential[];
}
