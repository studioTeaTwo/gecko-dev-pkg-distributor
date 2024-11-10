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

  /**
   * Selfsovereignidentity prefs
   * ref: modules/libpref/init/StaticPrefList.yaml
   */
  interface SelfsovereignidentityDefaultPrefs {
    enabled: boolean // selfsovereignidentity.[protocolName].enabled
    usedPrimarypasswordToSettings: boolean // selfsovereignidentity.[protocolName].primarypassword.toSettings.enabled
    usedPrimarypasswordToApps: boolean // selfsovereignidentity.[protocolName].primarypassword.toApps.enabled
    usedTrustedSites: boolean // selfsovereignidentity.[protocolName].trustedSites.enabled
    usedAccountChanged: boolean // selfsovereignidentity.[protocolName].event.accountChanged.enabled
  }
  interface SelfsovereignidentityPrefs {
    nostr: {
      usedBuiltInNip07: boolean // selfsovereignidentity.nostr.builtInNip07.enabled
    } & SelfsovereignidentityDefaultPrefs
  }

  const searchCredentialsWithoutSecret: (
    protocolName: ProtocolName,
    credentialName: string,
    primary: boolean,
    guid: string
  ) => Promise<Credential[] | null>
  const signByNostrKey: (
    guid: string,
    serializedEvent: string
  ) => Promise<string | null>
  const getPrefs: (protocolName: ProtocolName) => Promise<{
    enabled: boolean
    "trustedSites.enabled": boolean
    "event.accountChanged.enabled": boolean
    "builtInNip07.enabled": boolean
  } | null>
  const askPermission: (protocolName: ProtocolName) => Promise<boolean>
  const onPrimaryChanged: {
    addListener: (
      callback: (newGuid: string) => void,
      protocolName: ProtocolName
    ) => {}
    rmoveListener: () => void
    hadListener: Function
  }
  const onPrefEnabledChanged: {
    addListener: (
      callback: (prefKey: string) => void,
      protocolName: ProtocolName
    ) => {}
    rmoveListener: () => void
    hadListener: Function
  }
  const onPrefTrustedSitesChanged: {
    addListener: (
      callback: (prefKey: string) => void,
      protocolName: ProtocolName
    ) => {}
    rmoveListener: () => void
    hadListener: Function
  }
  const onPrefBuiltInNip07Changed: {
    addListener: (
      callback: (prefKey: string) => void,
      protocolName: ProtocolName
    ) => {}
    rmoveListener: () => void
    hadListener: Function
  }
  const onPrefAccountChanged: {
    addListener: (
      callback: (prefKey: string) => void,
      protocolName: ProtocolName
    ) => {}
    rmoveListener: () => void
    hadListener: Function
  }
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
