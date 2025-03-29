/**
 * SelfSovereignIndividual prefs
 * ref: modules/libpref/init/StaticPrefList.yaml
 */
export type MenuItem = ProtocolName | "";
export interface ProtocolDefaultPrefs {
  enabled: boolean; // selfsovereignindividual.[protocolName].enabled
  usedPrimarypasswordToSettings: boolean; // selfsovereignindividual.[protocolName].primarypassword.toSettings.enabled
  expiryTimeForPrimarypasswordToSettings: number; // selfsovereignindividual.[protocolName].primarypassword.toSettings.expiryTime
  usedPrimarypasswordToApps: boolean; // selfsovereignindividual.[protocolName].primarypassword.toApps.enabled
  expiryTimeForPrimarypasswordToApps: number; // selfsovereignindividual.[protocolName].primarypassword.ToApps.expiryTime
  trustedMethodsPreset: string; // selfsovereignindividual.[protocolName].primarypassword.toApps.excludedKindsPreset
  usedTrustedSites: boolean; // selfsovereignindividual.[protocolName].trustedSites.enabled
  usedAccountChanged: boolean; // selfsovereignindividual.[protocolName].event.accountChanged.enabled
}
export interface SelfSovereignIndividualPrefs {
  base: {
    menuPin: MenuItem; // selfsovereignindividual.ui.menuPin
    primaryPasswordEnabled: boolean; // SsiHelper.isPrimaryPasswordSet()
    passwordRevealVisible: boolean; // Services.policies.isAllowed("passwordReveal")
    addons: { id: string; name: string; url: string }[]; // built-in addons list
  };
  nostr: {
    tabPin: string; // selfsovereignindividual.nostr.ui.tabPin
    tabPinInNip07: string; // selfsovereignindividual.nostr.ui.nip07.tabPin
    usedBuiltinNip07: boolean; // selfsovereignindividual.nostr.builtinNip07.enabled
    excludedKindsPreset: string; // selfsovereignindividual.nostr.primarypassword.toApps.excludedKindsPreset
  } & ProtocolDefaultPrefs;
}

// States provided from internal actor
export interface SelfSovereignIndividualDefaultProps {
  prefs: SelfSovereignIndividualPrefs;
  credentials: Credential[];
}
// States only in about:selfsovereignindividual
export interface AboutSelfSovereignIndividualStates {
  nostr: {
    editingNo: number; // Key number being edited
    editingUrl: string; // TrustedSite URL being edited
  };
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

// ViewEntity in about:selfsovereignindividual
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
export interface PasswordAuthorizedSitesForNostr
  extends PasswordAuthorizedSites {
  permissions: {
    trustedMethods: string[];
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
