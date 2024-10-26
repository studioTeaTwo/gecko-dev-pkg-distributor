// experiment api
// refs: browser/extensions/selfsovereignidentity/experiment-apis/addonsSelfsovereignidentity.json
declare namespace browser.addonsSelfsovereignidentity {
  interface Credential {
    protocolName: ProtocolName
    credentialName: string
    primary: boolean
    secret: string
    identifier: string
    properties: object
    guid?: string
  }

  const searchCredentialsAsync: (
    protocolName: ProtocolName,
    credentialName: string,
    primary: boolean,
    guid: string
  ) => Credential[]
  const onPrimaryChange: {
    addListener: (
      callback: (newGuid: string) => void,
      protocolName: ProtocolName
    ) => {}
    rmoveListener: () => void
    hadListener: Function
  }
}

// Window incompatible types
interface Window {
  nostr: object
  emit: (action: string) => void
}
// eslint-disable-next-line no-var
declare var window: Window

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type FixMe = any
