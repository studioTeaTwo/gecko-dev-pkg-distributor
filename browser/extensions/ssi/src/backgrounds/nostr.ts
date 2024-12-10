import { sha256 } from "@noble/hashes/sha256"
import { bytesToHex } from "@noble/hashes/utils"
import { bech32 } from "@scure/base"
import { log } from "../shared/logger"
import { state } from "./state"

// NOTE(ssb): Currently firefox does not support externally_connectable.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable
const SafeProtocols = ["http", "https", "moz-extension"]

const MapBetweenPrefAndState = {
  enabled: "enabled",
  usedBuiltInNip07: "builtInNip07.enabled",
  usedAccountChanged: "event.accountChanged.enabled",
}

// TODO(ssb): conceal as much information as possible
const ERR_MSG_NOT_ENABLED =
  "window.nostr is not enabled. The user can confirm and edit it in 'about:selfsovereignidentity'."
const ERR_MSG_NOT_SUPPORTED = `This protocol is not spported. Currently, only supports ${SafeProtocols.join(",")}.`
const ERR_MSG_NOT_TRUSTED =
  "This application is not trusted by the user. The user can confirm and edit it in 'about:selfsovereignidentity'."
const ERR_MSG_NOT_REGISTERED = `The key has not yet been registered. The user can do it in 'about:selfsovereignidentity'.`

// Proceed calls from contents
export const doNostrAction = async (action, args, tabId) => {
  if (!state.nostr.prefs.enabled) {
    throw new Error(ERR_MSG_NOT_ENABLED)
  }
  if (!supported(origin)) {
    throw new Error(ERR_MSG_NOT_SUPPORTED)
  }
  const trusted = await browser.ssi.askPermission("nostr", "nsec", tabId)
  if (!trusted) {
    throw new Error(ERR_MSG_NOT_TRUSTED)
  }
  if (!state.nostr.npub) {
    throw new Error(ERR_MSG_NOT_REGISTERED)
  }

  switch (action) {
    case "nostr/getPublicKey": {
      return decodeNpub(state.nostr.npub)
    }
    case "nostr/signEvent": {
      const event = JSON.parse(args)
      event.pubkey = decodeNpub(state.nostr.npub)

      // Sign
      const eventHash = bytesToHex(
        sha256(new TextEncoder().encode(serializeEvent(event)))
      )
      const signature = await browser.ssi.nostr.sign(eventHash)
      event.id = eventHash
      event.sig = signature

      return event
    }
  }
}

export async function init() {
  log("experimental-api start...")

  // Get the existing credential from the ssi store.
  const credentials = await browser.ssi.searchCredentialsWithoutSecret(
    "nostr",
    "nsec",
    true
  )
  if (credentials.length > 0) {
    state.nostr = {
      ...state.nostr,
      npub: credentials[0].identifier,
    }
  }

  // Get setting values from the prefs.
  const results = await browser.ssi.nostr.getPrefs()
  const prefs = {} as FixMe
  Object.entries(MapBetweenPrefAndState).map(([state, pref]) => {
    prefs[state] = results[pref]
  })
  state.nostr = {
    ...state.nostr,
    prefs: prefs,
  }

  log("nostr inited in background", state.nostr, credentials)
}

// initial action while the webapps are loading
browser.webNavigation.onDOMContentLoaded.addListener(
  async (detail) => {
    // It's only injecting functions and doesn't need trusted.
    const injecting =
      state.nostr.prefs.enabled &&
      state.nostr.prefs.usedBuiltInNip07 &&
      supported(detail.url)
    log("nostr init to tab", injecting)

    // Notify init to the contents
    const tab = await browser.tabs.get(detail.tabId)
    log("send to tab", tab)
    sendTab(tab, "nostr/init", injecting)
  },
  { url: [{ schemes: SafeProtocols }] }
)

// The message listener to listen to experimental-apis calls
// After, those calls get passed on to the content scripts.
const onPrimaryChangedCallback = async () => {
  const credentials = await browser.ssi.searchCredentialsWithoutSecret(
    "nostr",
    "nsec",
    true
  )
  log("primary changed!", credentials)

  // That means it's all been removed
  if (credentials.length === 0) {
    state.nostr = {
      ...state.nostr,
      npub: "",
    }
    return
  }

  state.nostr = {
    ...state.nostr,
    npub: credentials[0].identifier,
  }

  // Send the message to the contents
  // usedBuiltInNip07 doen't need for window.ssi
  // TODO(ssb): coordinate accountChanged between window.ssi and window.nostr
  if (state.nostr.prefs.enabled && state.nostr.prefs.usedAccountChanged) {
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
browser.ssi.nostr.onPrimaryChanged.addListener(onPrimaryChangedCallback)

const onPrefChangedCallback = async (prefKey: string) => {
  const stateName = Object.entries(MapBetweenPrefAndState)
    .filter(([state, pref]) => pref === prefKey)
    .map(([state, pref]) => state)[0]
  const newVal = !state.nostr.prefs[stateName]
  state.nostr.prefs[stateName] = newVal
  log("pref changed!", prefKey, newVal, state.nostr)

  // Send the message to the contents
  // AccountChanged should only be held in the background.
  if (["enabled", "builtInNip07.enabled"].includes(prefKey)) {
    const tabs = await browser.tabs.query({
      status: "complete",
      discarded: false,
    })
    for (const tab of tabs) {
      log("send to tab", tab)
      sendTab(tab, "nostr/providerChanged", state.nostr.prefs[stateName])
    }
  }
}
browser.ssi.nostr.onPrefEnabledChanged.addListener(onPrefChangedCallback)
browser.ssi.nostr.onPrefAccountChanged.addListener(onPrefChangedCallback)
browser.ssi.nostr.onPrefBuiltInNip07Changed.addListener(onPrefChangedCallback)

/**
 * Internal Utils
 *
 */

async function sendTab(tab, action, data) {
  if (!supported(tab.url)) {
    // browser origin event is not sent anything
    return
  }
  if (!(action === "nostr/init")) {
    const trusted = await browser.ssi.askPermission("nostr", "nsec", tab.id)
    if (!trusted) {
      browser.tabs
        .sendMessage(tab.id, {
          action,
          args: { error: ERR_MSG_NOT_TRUSTED },
        })
        .catch()
      return
    }
  }

  browser.tabs
    .sendMessage(tab.id, {
      action,
      args: data,
    })
    .catch()
}

function supported(tabUrl: string): boolean {
  return SafeProtocols.some((protocol) => tabUrl.startsWith(protocol))
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
