// experiment api
declare namespace browser.builtinNip {
  const getPrefs = () =>
    Promise<{
      "builtinNip07.enabled": boolean
    } | null>
  const onPrefBuiltinNip07Changed: {
    addListener: (callback: (prefKey: string) => void) => {}
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
  getPublicKey: () => Promise<PublicKey>
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
