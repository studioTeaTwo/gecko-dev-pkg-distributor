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

export interface SelfsovereignidentityDefaultProps {
  prefs: SelfsovereignidentityPrefs;
  credentials: Credential[];
}

/**
 * CredentialInfo
 * ref: toolkit/components/ssi/nsICredentialInfo.idl
 */
type OnlyUsedNsICredentialInfo = Omit<
  nsICredentialInfo,
  "unknownFields" | "init" | "equals" | "matches" | "clone"
> &
  Pick<nsICredentialMetaInfo, "guid" | "timeCreated">;

// ViewEntity to use in about:selfsovereignidentity
export type ProtocolName =
  | "bitcoin"
  | "lightning"
  | "ecash"
  | "nostr"
  | "did:dht";
export type CredentialName = "bip39" | "lnc" | "nsec";
interface TrustedSites {
  url: string;
  name: string;
  enabled: boolean;
  permissions: Record<string, unknown>;
}
interface PasswordAuthorizedSites {
  url: string;
  name: string;
  expiryTime: number;
  permissions: Record<string, unknown>;
}
export interface Credential
  extends Omit<
    OnlyUsedNsICredentialInfo,
    | "trustedSites"
    | "passwordAuthorizedSites"
    | "properties"
    | "guid"
    | "timeCreated"
  > {
  protocolName: ProtocolName;
  credentialName: CredentialName;
  trustedSites: TrustedSites[];
  passwordAuthorizedSites: PasswordAuthorizedSites[];
  properties: {
    displayName: string;
    memo?: string;
  };
  guid?: string;
  timeCreated?: number;
}
interface PasswordAuthorizedSitesForNostr extends PasswordAuthorizedSites {
  permissions: {
    excludedKinds: string[];
  };
}
export interface NostrCredential extends Credential {
  passwordAuthorizedSites: PasswordAuthorizedSitesForNostr[];
}

// Pass object type through JSON.stringify for IPC & JSONstorage
export interface CredentialForPayload extends OnlyUsedNsICredentialInfo {
  protocolName: ProtocolName;
  credentialName: CredentialName;
}
