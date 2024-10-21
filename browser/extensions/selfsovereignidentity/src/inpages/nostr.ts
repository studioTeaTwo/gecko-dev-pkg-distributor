// Interface for the web apps to call the extension
// refs: https://github.com/nostr-protocol/nips/blob/master/07.md

import { postMessage } from "./postMessage"

export default class NostrProvider {
  private _scope = "nostr"

  getPublicKey() {
    return postMessage(this._scope, "getPublicKey", undefined)
  }

  signEvent(event: {
    created_at: number
    kind: number
    tags: string[][]
    content: string
  }): Event {
    return
  }

  nip04 = {
    encrypt(pubkey, plaintext): string {
      return
    },
    decrypt(pubkey, ciphertext): string {
      return
    },
  }

  nip44 = {
    encrypt(pubkey, plaintext): string {
      return
    },
    decrypt(pubkey, ciphertext): string {
      return
    },
  }
}
