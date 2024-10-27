import { sha256 } from "@noble/hashes/sha256"
import { bytesToHex } from "@noble/hashes/utils"
import { bech32 } from "@scure/base"
import { state } from "./state"

// Proceed calls from contents
export const doNostrAction = async (action, args) => {
  switch (action) {
    case "nostr/getPublicKey": {
      return decodeNpub(state.nostr.npub)
    }
    case "nostr/signEvent": {
      const event = args
      event.pubkey = decodeNpub(state.nostr.npub)

      // Sign
      const eventHash = bytesToHex(
        sha256(new TextEncoder().encode(serializeEvent(event)))
      )
      const signature =
        await browser.addonsSelfsovereignidentity.signByNostrKey(
          eventHash,
          state.nostr.guid
        )
      event.id = eventHash
      event.sig = signature

      return event
    }
  }
}

export async function init() {
  console.info("experimental-api start...")

  // Get the existing credential from the ssi store.
  const credentials =
    await browser.addonsSelfsovereignidentity.searchCredentialsWithoutSecret(
      "nostr",
      "nsec",
      true,
      ""
    )
  console.info("background init!", credentials)
  if (credentials.length === 0) return

  state.nostr = {
    guid: credentials[0].guid,
    npub: credentials[0].identifier,
  }

  // The message listener to listen to experimental-apis calls
  // After, those calls get passed on to the content scripts.
  const onPrimaryChangeCallback = async (newGuid: string) => {
    const credentials =
      await browser.addonsSelfsovereignidentity.searchCredentialsWithoutSecret(
        "nostr",
        "nsec",
        true,
        newGuid
      )
    if (credentials.length === 0) return
    console.info("primary changed!", newGuid, credentials)
    state.nostr = {
      guid: credentials[0].guid,
      npub: credentials[0].identifier,
    }

    // Send the message to the contents

    browser.tabs
      .query({ status: "complete", discarded: false })
      .then((tabs) => {
        const pubkey = decodeNpub(state.nostr.npub)
        for (const tab of tabs) {
          console.info("send to tab: ", tab)
          if (tab.url.startsWith("http")) {
            browser.tabs
              .sendMessage(tab.id, {
                action: "nostr/accountChanged",
                args: { data: pubkey },
              })
              .catch()
          }
        }
      })
  }
  browser.addonsSelfsovereignidentity.onPrimaryChange.addListener(
    onPrimaryChangeCallback,
    "nostr"
  )
}

function decodeNpub(npub) {
  const Bech32MaxSize = 5000
  const { prefix, words } = bech32.decode(
    npub as `${string}1${string}`,
    Bech32MaxSize
  )
  return bytesToHex(new Uint8Array(bech32.fromWords(words)))
}

// based upon : https://github.com/nbd-wtf/nostr-tools/blob/b9a7f814aaa08a4b1cec705517b664390abd3f69/event.ts#L95
function validateEvent(event: NostrEvent): boolean {
  if (!(event instanceof Object)) return false
  if (typeof event.kind !== "number") return false
  if (typeof event.content !== "string") return false
  if (typeof event.created_at !== "number") return false
  // ignore pubkey checks because if the pubkey is not set we add it to the event. same for the ID.

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

// from: https://github.com/nbd-wtf/nostr-tools/blob/160987472fd4922dd80c75648ca8939dd2d96cc0/event.ts#L42
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
