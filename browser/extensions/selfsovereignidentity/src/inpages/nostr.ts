// Interface for the web apps to call the extension
// refs: https://github.com/nostr-protocol/nips/blob/master/07.md

import { log } from "../shared/logger"
import { shouldInject } from "../shared/shouldInject"
import { postMessage } from "./postMessage"

export function init() {
  if (!shouldInject()) {
    return
  }

  // The message listener to listen to content calls
  // After, emit event to return the reponse to the web apps.
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data.id !== "native") {
      return
    }

    const action = event.data.data.action
    const data = event.data.data.data
    if (event.data.scope === "nostr") {
      if (action === "init" || action === "providerChanged") {
        // TODO(ssb): It depends on the standard spec with other providers.
        if (data) {
          // Inject
          window.nostr = new NostrProvider()
          window.nip07Loaded = Array.isArray(window.nip07Loaded)
            ? window.nip07Loaded.concat({ ssb: true })
            : [{ ssb: true }]
        } else {
          // Dispose
          window.nostr && delete window.nostr
          window.nip07Loaded = Array.isArray(window.nip07Loaded)
            ? window.nip07Loaded.concat({ ssb: false })
            : [{ ssb: false }]
        }
        log(`inpage ${action} emit`, event)
        window.dispatchEvent(
          new CustomEvent(`nostr:${action.toLowerCase()}`, {
            detail: data,
          })
        )
      } else if (action === "accountChanged") {
        log(`inpage accountChanged emit`, event)
        window.nostr.dispatchEvent(
          new CustomEvent(action, {
            detail: data,
            bubbles: false,
          })
        )
      }
    }
  })
}

// ref: https://github.com/nostr-protocol/nips/blob/master/07.md
export class NostrProvider {
  _scope = "nostr"
  _provider = "ssb"
  #proxy

  constructor() {
    this.#proxy = new EventTarget()
    this.#proxy.proxied = this
  }

  getPublicKey() {
    return window.ssi.nostr.getPublicKey()
  }

  async signEvent(event: {
    created_at: number
    kind: number
    tags: string[][]
    content: string
  }) {
    return window.ssi.nostr.sign(JSON.stringify(event), { type: "signEvent" })
  }

  nip04 = {
    encrypt(pubkey, plaintext): Promise<string> {
      return
    },
    decrypt(pubkey, ciphertext): Promise<string> {
      return
    },
  }

  nip44 = {
    encrypt(pubkey, plaintext): Promise<string> {
      return
    },
    decrypt(pubkey, ciphertext): Promise<string> {
      return
    },
  }

  dispatchEvent(...args) {
    return this.#proxy.dispatchEvent(...args)
  }
  addEventListener(...args) {
    return this.#proxy.addEventListener(...args)
  }
  removeEventListener(...args) {
    return this.#proxy.removeEventListener(...args)
  }
}
