// Interface for the web apps to call the extension
// refs: https://github.com/nostr-protocol/nips/blob/master/07.md

import { shouldInject } from "../shared/shouldInject"
import { postMessage } from "./postMessage"

export function init() {
  if (!shouldInject()) {
    return
  }

  // Inject
  if (window.nostr == null) {
    window.nostr = new NostrProvider()
    console.info("inages nostr injected!", window.nostr)
    const readyEvent = new Event("nostr:ready")
    window.dispatchEvent(readyEvent)
  }

  // The message listener to listen to content calls
  // After, emit event to return the reponse to the web apps.
  window.addEventListener("message", (event) => {
    if (event.source === window && event.data.scope === "nostr") {
      if (event.data.action === "accountChanged") {
        console.info("accountChanged emit!", event)
        window.dispatchEvent(
          new CustomEvent("nostr:accountchanged", {
            detail: event.data.data,
          })
        )
      }
    }
  })
}

// ref: https://github.com/nostr-protocol/nips/blob/master/07.md
export class NostrProvider {
  private _scope = "nostr"

  getPublicKey() {
    return postMessage(this._scope, "getPublicKey", undefined)
  }

  signEvent(event: {
    created_at: number
    kind: number
    tags: string[][]
    content: string
  }) {
    return postMessage<NostrEvent>(this._scope, "signEvent", event)
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
