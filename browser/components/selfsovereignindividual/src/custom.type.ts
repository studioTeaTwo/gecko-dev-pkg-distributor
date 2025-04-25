/**
 * SelfSovereignIndividual prefs
 * ref: modules/libpref/init/StaticPrefList.yaml
 */
export type MenuItem = ProtocolName | "settings" | "";
export interface ProtocolDefaultPrefs {
  enabled: boolean; // selfsovereignindividual.[protocolName].enabled
  usedTrustedSites: boolean; // selfsovereignindividual.[protocolName].trustedSites.enabled
  nallowedMethodPreset: string; // selfsovereignindividual.[protocolName].trustedSites.nallowedMethodPreset
  usedPrimarypasswordToSettings: boolean; // selfsovereignindividual.[protocolName].primarypassword.toSettings.enabled
  expirationTimeForPrimarypasswordToSettings: number; // selfsovereignindividual.[protocolName].primarypassword.toSettings.expirationTime
  usedPrimarypasswordToApps: boolean; // selfsovereignindividual.[protocolName].primarypassword.toApps.enabled
  expirationTimeForPrimarypasswordToApps: number; // selfsovereignindividual.[protocolName].primarypassword.ToApps.expirationTime
  dialogDisplayOptionPreset: string; // selfsovereignindividual.[protocolName].primarypassword.toApps.dialogDisplayOptionPreset
  usedAccountChanged: boolean; // selfsovereignindividual.[protocolName].event.accountChanged.enabled
}
export interface SelfSovereignIndividualPrefs {
  base: {
    menuPin: MenuItem; // selfsovereignindividual.ui.menuPin
    primaryPasswordEnabled: boolean; // SsiHelper.isPrimaryPasswordSet()
    passwordRevealVisible: boolean; // Services.policies.isAllowed("passwordReveal")
    platform: string; // AppConstants.platform
    addons: { id: string; name: string; url: string }[]; // built-in addons list
  };
  bitcoin: {
    tabPin: string; // selfsovereignindividual.bitcoin.ui.tabPin
  } & ProtocolDefaultPrefs;
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
  bitcoin: {
    editingNo: number; // Key number being edited
    editingUrl: string; // TrustedSite URL being edited
  };
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
export type CredentialName = "bip39" | "nsec";
interface TrustedSites {
  url: string;
  name: string;
  enabled: boolean;
  permissions: { nallowedMethod: string[] };
}
interface DialogicAuthorizedSites {
  url: string;
  name: string;
  expirationTime: number;
  permissions: Record<string, unknown>;
}
export interface BaseCredential
  extends Omit<
    OnlyUsedNsICredentialInfo,
    | "trustedSites"
    | "dialogicAuthorizedSites"
    | "properties"
    | "guid"
    | "timeCreated"
  > {
  protocolName: ProtocolName;
  credentialName: CredentialName;
  trustedSites: TrustedSites[];
  dialogicAuthorizedSites: DialogicAuthorizedSites[];
  properties: {
    displayName: string;
    memo?: string;
    generationFrom: string; // generated `location.href.origin`
    sharing: {
      url: string;
      guid: string;
      identifier: string; // xpub
      sender: string; // npub
      receiver: string; // npub
      date: number;
    }[];
  };
  guid?: string;
  timeCreated?: number;
}

export interface BitcoinCredential extends BaseCredential {
  properties: {
    passphrase: string;
    xpriv: string;
    generationMethod: "new" | "import";
  } & BaseCredential["properties"];
}

export interface DialogicAuthorizedSitesForNostr
  extends DialogicAuthorizedSites {
  permissions: {
    everyTimeAuthorizedMethods: string[];
    skippedDialog: string[];
    excludedKinds: string[];
  };
}
export interface NostrCredential extends BaseCredential {
  dialogicAuthorizedSites: DialogicAuthorizedSitesForNostr[];
  properties: {
    generationMethod: "bip340" | "import";
  } & BaseCredential["properties"];
}

export type Credential = BitcoinCredential | NostrCredential;

// Pass object type through JSON.stringify for IPC & JSONstorage
export interface CredentialForPayload extends OnlyUsedNsICredentialInfo {
  protocolName: ProtocolName;
  credentialName: CredentialName;
}
