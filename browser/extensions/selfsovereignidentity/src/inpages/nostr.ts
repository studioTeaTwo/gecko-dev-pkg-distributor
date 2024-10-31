// Interface for the web apps to call the extension
// refs: https://github.com/nostr-protocol/nips/blob/master/07.md

import { log } from "../shared/logger"
import { shouldInject } from "../shared/shouldInject"
import { postMessage } from "./postMessage"

export function init() {
  if (!shouldInject()) {
    return
  }

  // Injection for until browser.tabs is established in background.
  // After the web navigation completed, this will be overrided.
  window.nostr = new NostrProvider()

  // The message listener to listen to content calls
  // After, emit event to return the reponse to the web apps.
  window.addEventListener("message", (event) => {
    if (event.source === window && event.data.scope === "nostr") {
      if (
        event.data.action === "init" ||
        event.data.action === "providerChanged"
      ) {
        // TODO(ssb): It depends on the spec with other providers.
        if (event.data.data.enabled) {
          // Inject
          window.nostr = new NostrProvider()
        } else {
          // Dispose
          window.nostr && delete window.nostr
        }
        log(`inpage ${event.data.action} emit!`, event)
        window.dispatchEvent(
          new CustomEvent(`nostr:${event.data.action.toLowerCase()}`, {
            detail: event.data.data,
          })
        )
      } else if (event.data.action === "accountChanged") {
        log("inpage accountChanged emit!", event)
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
  private _provider = "ssb"

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
