export type MenuItem = "bitcoin" | "lightning" | "ecash" | "nostr"

/**
 * Selfsovereignidentity prefs
 * ref: modules/libpref/init/StaticPrefList.yaml
 */
export interface SelfsovereignidentityPrefs {
  nostr: {
    enabled: boolean // browser.selfsovereignidentity.nostr.enabled
    trusted: boolean // browser.selfsovereignidentity.nostr.trusted
  }
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
