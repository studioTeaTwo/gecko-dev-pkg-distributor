// experiment api
// refs: browser/extensions/selfsovereignidentity/experiment-apis/addonsSelfsovereignidentity.json
declare namespace browser.ssi {
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
    primary: boolean
  ) => Promise<Credential[] | null>
  const askPermission: (
    protocolName: ProtocolName,
    credentialName: string,
    tabId: number,
    message?: string
  ) => Promise<boolean>
  const askPermissionChild: (protocolName: ProtocolName) => Promise<boolean>

  type commonApis = {
    getPrefs: () => Promise<{
      enabled: boolean
      "event.accountChanged.enabled": boolean
      "builtInNip07.enabled": boolean
    } | null>
    onPrimaryChanged: {
      addListener: (callback: (newGuid: string) => void) => {}
      rmoveListener: () => void
      hadListener: Function
    }
    onPrefEnabledChanged: {
      addListener: (callback: (prefKey: string) => void) => {}
      rmoveListener: () => void
      hadListener: Function
    }
    onPrefAccountChanged: {
      addListener: (callback: (prefKey: string) => void) => {}
      rmoveListener: () => void
      hadListener: Function
    }
  }

  const nostr: {
    sign: (serializedEvent: string) => Promise<string | null>
    onPrefBuiltInNip07Changed: {
      addListener: (callback: (prefKey: string) => void) => {}
      rmoveListener: () => void
      hadListener: Function
    }
  } & commonApis
}

type PublicKey = string
type Signature = any
type PlainText = string
interface WindowSSI extends EventTarget {
  _scope: "ssi"
  _proxy: EventTarget

  readonly nostr: {
    _proxy: EventTarget
    generate: (option?) => Promise<PublicKey>
    getPublicKey: (option?) => Promise<PublicKey>
    sign: (message: string, option?) => Promise<Signature>
    decrypt: (ciphertext: string, option?) => Promise<PlainText>
    messageBoard?: {}
  } & EventTarget
}
interface WindowNostr {
  getPublicKey: () => Promise<string>
  signEvent: (event: EventTemplate) => Promise<NostrEvent>
  getRelays?: () => Promise<RelayRecord>
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>
    decrypt(pubkey: string, ciphertext: string): Promise<string>
  }
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>
    decrypt(pubkey: string, ciphertext: string): Promise<string>
  }
}
// Window incompatible types
interface Window {
  ssi: Readonly<WindowSSI>
  nostr: WindowNostr & EventTarget
  nip07Loaded: { [provider: string]: boolean }[]
  emit: (action: string) => void
}
// eslint-disable-next-line no-var
declare var window: Window

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type FixMe = any
