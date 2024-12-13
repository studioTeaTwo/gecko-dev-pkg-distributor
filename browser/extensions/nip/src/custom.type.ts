type ApplicationName = "ssb"
type ProtocolName = "nostr"

/**
 * Message Property
 */
interface MessageBetweenBackAndContent {
  action: string
  args: any
  origin: string
  application: string
}
interface MessageBetweenContentAndInpage {
  id
  application: string
  action: `${ProtocolName}/action`
  scope: ProtocolName
  args: any
}
// on sendResponse
interface MessageBag {
  data: any
}

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

/**
 * Nostr
 */
interface SelfsovereignidentityPrefs {
  nostr: {
    usedBuiltinNip07: boolean // selfsovereignidentity.nostr.builtinNip07.enabled
  }
}
