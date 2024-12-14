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
  nostr: WindowNostr & EventTarget
  nip07Loaded: { [provider: string]: boolean }[]
  emit: (action: string) => void
}
// eslint-disable-next-line no-var
declare var window: Window
