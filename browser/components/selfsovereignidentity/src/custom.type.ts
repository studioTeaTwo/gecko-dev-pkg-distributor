export type MenuItem = "bitcoin" | "lightning" | "ecash" | "nostr"

/**
 * credential info base
 * ref: toolkit/components/selfsovereignidentity-store/nsICredentialInfo.idl
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
  properties: object
  guid?: string
}
// Pass object type through JSON.stringify for IPC & JSONstorage
export type CredentialForPayload = Omit<Credential, "properties"> & {
  properties: string
}
