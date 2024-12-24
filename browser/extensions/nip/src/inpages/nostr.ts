// Interface for the web apps to call the extension
// refs: https://github.com/nostr-protocol/nips/blob/master/07.md

import { sha256 } from "@noble/hashes/sha256"
import { bytesToHex } from "@noble/hashes/utils"
import { log } from "../shared/logger"
import { shouldInject } from "../shared/shouldInject"

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
      if (action === "builtinNip07Init" || action === "builtinNip07Changed") {
        // TODO(ssb): It depends on the standard spec with other providers.
        if (data) {
          // Inject
          window.nostr = new NostrProvider()
          window.nip07Loaded = Array.isArray(window.nip07Loaded)
            ? window.nip07Loaded.concat({ ssb: true })
            : [{ ssb: true }]
          window.ssi.nostr.addEventListener(
            "accountChanged",
            accountChangedHandler
          )
        } else {
          // Dispose
          window.nostr && delete window.nostr
          window.nip07Loaded = Array.isArray(window.nip07Loaded)
            ? window.nip07Loaded.concat({ ssb: false })
            : [{ ssb: false }]
          window.ssi.nostr.removeEventListener(
            "accountChanged",
            accountChangedHandler
          )
        }

        log(`inpage ${action} emit`, event)
        window.dispatchEvent(
          new CustomEvent(action, {
            detail: data,
          })
        )
      }
    }
  })
}

const accountChangedHandler = (event: CustomEvent<PublicKey>) => {
  const newPublicKey = event.detail

  log(`inpage accountChanged emit`, event)
  window.nostr.dispatchEvent(
    new CustomEvent("accountChanged", {
      detail: newPublicKey,
      bubbles: true,
    })
  )
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

  async getPublicKey() {
    return window.ssi.nostr.getPublicKey()
  }

  async signEvent(event: {
    created_at: number
    kind: number
    tags: string[][]
    content: string
  }) {
    const signedEvent: NostrEvent = { ...event }

    signedEvent.pubkey = await this.getPublicKey()
    const eventHash = bytesToHex(
      sha256(new TextEncoder().encode(serializeEvent(signedEvent)))
    )
    const signature = await window.ssi.nostr.sign(eventHash, {
      type: "signEvent",
      event,
    })
    signedEvent.id = eventHash
    signedEvent.sig = signature

    return signedEvent
  }

  nip04 = {
    encrypt(pubkey, plaintext): Promise<string> {
      return Promise.resolve("Not implemented")
    },
    decrypt(pubkey, ciphertext): Promise<string> {
      return Promise.resolve("Not implemented")
    },
  }

  nip44 = {
    encrypt(pubkey, plaintext): Promise<string> {
      return Promise.resolve("Not implemented")
    },
    decrypt(pubkey, ciphertext): Promise<string> {
      return Promise.resolve("Not implemented")
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

// based upon : https://github.com/nbd-wtf/nostr-tools/blob/master/core.ts#L33
function validateEvent(event: NostrEvent): boolean {
  if (!(event instanceof Object)) return false
  if (typeof event.kind !== "number") return false
  if (typeof event.content !== "string") return false
  if (typeof event.created_at !== "number") return false
  if (typeof event.pubkey !== "string") return false
  if (!event.pubkey.match(/^[a-f0-9]{64}$/)) return false

  if (!Array.isArray(event.tags)) return false
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i]
    if (!Array.isArray(tag)) return false
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === "object") return false
    }
  }

  return true
}

// from: https://github.com/nbd-wtf/nostr-tools/blob/master/pure.ts#L43
function serializeEvent(event: NostrEvent): string {
  if (!validateEvent(event))
    throw new Error("can't serialize event with wrong or missing properties")

  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ])
}
