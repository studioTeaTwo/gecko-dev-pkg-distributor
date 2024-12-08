export type MenuItem = "bitcoin" | "lightning" | "ecash" | "nostr"

/**
 * Selfsovereignidentity prefs
 * ref: modules/libpref/init/StaticPrefList.yaml
 */
export interface SelfsovereignidentityDefaultPrefs {
  enabled: boolean // selfsovereignidentity.[protocolName].enabled
  usedPrimarypasswordToSettings: boolean // selfsovereignidentity.[protocolName].primarypassword.toSettings.enabled
  expiryTimeForPrimarypasswordToSettings: number // selfsovereignidentity.[protocolName].primarypassword.toSettings.expiryTime
  usedPrimarypasswordToApps: boolean // selfsovereignidentity.[protocolName].primarypassword.toApps.enabled
  expiryTimeForPrimarypasswordToApps: number // selfsovereignidentity.[protocolName].primarypassword.ToApps.expiryTime
  usedTrustedSites: boolean // selfsovereignidentity.[protocolName].trustedSites.enabled
  usedAccountChanged: boolean // selfsovereignidentity.[protocolName].event.accountChanged.enabled
}
export interface SelfsovereignidentityPrefs {
  nostr: {
    usedBuiltInNip07: boolean // selfsovereignidentity.nostr.builtInNip07.enabled
  } & SelfsovereignidentityDefaultPrefs
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
  | "did:dht"
export type CredentialName = "bip39" | "lnc" | "nsec"
export interface Credential {
  protocolName: ProtocolName
  credentialName: CredentialName
  primary: boolean
  secret: string
  identifier: string
  trustedSites: {
    url: string
    permissions: {
      read: boolean
      write: boolean
      admin: boolean
    }
  }[]
  properties: object
  guid?: string
}
// Pass object type through JSON.stringify for IPC & JSONstorage
export type CredentialForPayload = Omit<
  Credential,
  "properties" | "trustedSites"
> & {
  trustedSites: string
  properties: string
}
