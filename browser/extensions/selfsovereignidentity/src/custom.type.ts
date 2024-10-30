type ApplicationName = "ssb"
type ProtocolName = "bitcoin" | "lightning" | "ecash" | "nostr" | "did:dht"

/**
 * Message Property
 */
interface MessageBetweenBackAndContent {
  action: string
  args: any
}
interface MessageBetweenContentAndInpage {
  id
  application: ApplicationName
  action: `${ProtocolName}/action`
  scope: ProtocolName
  args: any
}
// on sendResponse
interface MessageBag {
  data: any
}

/**
 * Nostr
 */

const verifiedSymbol = Symbol("verified")
type NostrEvent = {
  kind: number
  tags: string[][]
  content: string
  created_at: number
  pubkey?: string
  id?: string
  sig?: string
  [verifiedSymbol]?: boolean
}
