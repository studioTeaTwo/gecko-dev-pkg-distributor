export type MenuItem = "bitcoin" | "lightning" | "ecash" | "nostr";

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
export interface Credential {
  protocolName: ProtocolName;
  credentialName: CredentialName;
  primary: boolean;
  secret: string;
  identifier: string;
  trustedSites: {
    url: string;
    name: string;
    permissions: {
      read: boolean;
      write: boolean;
      admin: boolean;
    };
  }[];
  passwordAuthorizedSites: {
    url: string;
    name: string;
    expiryTime: number;
    permissions: {
      read: boolean;
      write: boolean;
      admin: boolean;
    };
  }[];
  properties: object;
  guid?: string;
}
// Pass object type through JSON.stringify for IPC & JSONstorage
export type CredentialForPayload = Omit<
  Credential,
  "trustedSites" | "passwordAuthorizedSites" | "properties"
> & {
  trustedSites: string;
  passwordAuthorizedSites: string;
  properties: string;
};

export interface SelfsovereignidentityDefaultProps {
  prefs: SelfsovereignidentityPrefs;
  credentials: Credential[];
}
