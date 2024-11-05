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

  /**
   * Selfsovereignidentity prefs
   * ref: modules/libpref/init/StaticPrefList.yaml
   */
  interface SelfsovereignidentityDefaultPrefs {
    enabled: boolean // selfsovereignidentity.[protocolName].enabled
    usedPrimarypassword: boolean // selfsovereignidentity.[protocolName].primarypassword.toWebsite.enabled
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
  ) => Credential[] | null
  const signByNostrKey: (guid: string, serializedEvent: string) => string | null
  const getPrefs: (
    protocolName: ProtocolName
  ) => Omit<
    SelfsovereignidentityPrefs[keyof SelfsovereignidentityPrefs],
    "usedPrimarypassword"
  > | null
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

declare namespace browser.tabExtras {
  const getWebcompatInfo = {}
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
