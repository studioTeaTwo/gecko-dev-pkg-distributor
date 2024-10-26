type ApplicationName = "SSB"
type ProtocolName = "bitcoin" | "lightning" | "ecash" | "nostr" | "did:dht"

/**
 * Message Property
 */
interface MessageFromBackToContent {
  action: string
  args: any
}
interface MessageFromContentToBack {
  action: string
  args: any
}
interface MessageFromContentToInpage {
  action: string
  scope: ProtocolName
}
interface MessageFromInpageToContent {
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
