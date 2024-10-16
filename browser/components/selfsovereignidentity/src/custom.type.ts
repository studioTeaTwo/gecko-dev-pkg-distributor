
/**
 * credential info base
 * ref: toolkit/components/selfsovereignidentity-store/nsICredentialInfo.idl
 */
export type ProtocolName = "bitcoin" | "lightning" | "ecash" | "nostr" | "did:dht"
export type CredentialName = "bip39" | "lnc" | "nsec"
export interface CredentialInfo {
  protocolName: ProtocolName
  credentialName: CredentialName
  primary: boolean
  secret: string
  identifier: string
  password: string
  properties: object
  guid?: string
}
// Pass object type through JSON.stringify for IPC & JSONstorage
export type CredentialInfoPayload = Omit<CredentialInfo, "properties"> & {
  properties: string
}
