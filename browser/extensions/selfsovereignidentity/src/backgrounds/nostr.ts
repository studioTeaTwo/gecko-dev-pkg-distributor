import { sha256 } from "@noble/hashes/sha256"
import { bytesToHex } from "@noble/hashes/utils"
import { bech32 } from "@scure/base"
import { log } from "../shared/logger"
import { state } from "./state"

// NOTE(ssb): Currently firefox does not support externally_connectable.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable
const SafeProtocols = ["http", "moz-extension"]

// Proceed calls from contents
export const doNostrAction = async (origin, application, action, args) => {
  if (!state.nostr.enabled && application === "ssb") {
    throw new Error(
      "window.nostr are not enabled. The user can confirm and edit it in 'about:selfsovereignidentity'."
    )
  }
  if (!trusted(origin)) {
    throw new Error(
      "This application are not trusted by the user. The user can confirm and edit it in 'about:selfsovereignidentity'."
    )
  }

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
  log("experimental-api start...")

  // Get the existing credential from the ssi store.
  const credentials =
    await browser.addonsSelfsovereignidentity.searchCredentialsWithoutSecret(
      "nostr",
      "nsec",
      true,
      ""
    )
  if (credentials.length > 0) {
    state.nostr = {
      ...state.nostr,
      npub: credentials[0].identifier,
      trustedSites: credentials[0].trustedSites,
      guid: credentials[0].guid,
    }
  }

  // Get setting values from the prefs.
  const prefs = await browser.addonsSelfsovereignidentity.getPrefs("nostr")
  state.nostr = {
    ...state.nostr,
    enabled: prefs.enabled,
    trusted: prefs.trusted,
  }

  log("background init!", prefs, credentials)
}

// initial action when the webapps are loaded
browser.webNavigation.onCompleted.addListener(async () => {
  // Notify init to the contents
  const tabs = await browser.tabs.query({
    status: "complete",
    discarded: false,
  })
  for (const tab of tabs) {
    log("send to tab", tab)
    sendTab(tab, "nostr/init", state.nostr.enabled)
  }
})

// The message listener to listen to experimental-apis calls
// After, those calls get passed on to the content scripts.
const onPrimaryChangedCallback = async (newGuid: string) => {
  const credentials =
    await browser.addonsSelfsovereignidentity.searchCredentialsWithoutSecret(
      "nostr",
      "nsec",
      true,
      newGuid
    )
  if (credentials.length === 0) return
  log("primary changed!", newGuid, credentials)
  state.nostr = {
    ...state.nostr,
    guid: credentials[0].guid,
    npub: credentials[0].identifier,
  }

  // Send the message to the contents
  if (state.nostr.enabled) {
    const tabs = await browser.tabs.query({
      status: "complete",
      discarded: false,
    })
    const pubkey = decodeNpub(state.nostr.npub)
    for (const tab of tabs) {
      log("send to tab", tab)
      sendTab(tab, "nostr/accountChanged", pubkey)
    }
  }
}
browser.addonsSelfsovereignidentity.onPrimaryChanged.addListener(
  onPrimaryChangedCallback,
  "nostr"
)
const onPrefChangedCallback = async (prefKey: string) => {
  log("pref changed!", prefKey)
  state.nostr[prefKey] = !state.nostr[prefKey]

  // Send the message to the contents
  const tabs = await browser.tabs.query({
    status: "complete",
    discarded: false,
  })
  for (const tab of tabs) {
    log("send to tab", tab)
    sendTab(tab, "nostr/providerChanged", state.nostr.enabled)
  }
}
browser.addonsSelfsovereignidentity.onPrefChanged.addListener(
  onPrefChangedCallback,
  "nostr",
  "enabled"
)
browser.addonsSelfsovereignidentity.onPrefChanged.addListener(
  onPrefChangedCallback,
  "nostr",
  "trusted"
)

/**
 * Internal Utils
 *
 */

function sendTab(tab, action, data) {
  if (!trusted(tab.url)) {
    if (!SafeProtocols.some((protocol) => tab.url.startsWith(protocol))) return
    browser.tabs
      .sendMessage(tab.id, {
        action,
        args: {
          error:
            "This application are not trusted by the user. The user can confirm and edit it in 'about:selfsovereignidentity'.",
        },
      })
      .catch()
    return
  }

  browser.tabs
    .sendMessage(tab.id, {
      action,
      args: { data },
    })
    .catch()
}

function trusted(tabUrl: string): boolean {
  // Return true unconditionally
  if (!state.nostr.trusted) return true

  if (!SafeProtocols.some((protocol) => tabUrl.startsWith(protocol)))
    return false

  // FIXME(ssb): improve the match method, such as supporting glob.
  return state.nostr.trustedSites.some((site) => tabUrl.includes(site.url))
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
