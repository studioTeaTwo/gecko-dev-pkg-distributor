// experiment api
// refs: browser/extensions/selfsovereignidentity/experiment-apis/addonsSelfsovereignidentity.json
declare namespace browser.addonsSelfsovereignidentity {
  interface Credential {
    protocolName: ProtocolName
    credentialName: string
    primary: boolean
    secret: string
    identifier: string
    trustedSites: object[]
    properties: object
    guid?: string
  }

  const searchCredentialsWithoutSecret: (
    protocolName: ProtocolName,
    credentialName: string,
    primary: boolean,
    guid: string
  ) => Credential[]
  const signByNostrKey: (guid: string, serializedEvent: string) => string
  const getPrefs: (protocolName: ProtocolName) => {
    enabled: boolean
    trusted: boolean
  }
  const onPrimaryChanged: {
    addListener: (
      callback: (newGuid: string) => void,
      protocolName: ProtocolName
    ) => {}
    rmoveListener: () => void
    hadListener: Function
  }
  const onPrefChanged: {
    addListener: (
      callback: (prefKey: string) => void,
      protocolName: ProtocolName,
      prefKey: string
    ) => {}
    rmoveListener: () => void
    hadListener: Function
  }
}

// Window incompatible types
interface Window {
  ssi: WindowSSI
  nostr: object
  emit: (action: string) => void
}
// eslint-disable-next-line no-var
declare var window: Window

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type FixMe = any
