// Window incompatible types
interface Window {
  nostr: object
  emit: (action: string) => void
}
// eslint-disable-next-line no-var
declare var window: Window

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type FixMe = any

// experiment api
// TODO: (ssb)
declare namespace browser.addonsSelfsovereignidentity {
  type searchCredentialsAsync = Function
}

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
  action: `${scope}/${action}`
  scope: ProtocolName
  args: any
}

// on sendResponse
interface MessageBag {
  data: any
}
