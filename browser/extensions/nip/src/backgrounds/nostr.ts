import { log } from "../shared/logger"
import { state } from "./state"

// NOTE(ssb): Currently firefox does not support externally_connectable.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable
const SafeProtocols = ["http", "https", "moz-extension"]

const MapBetweenPrefAndState = {
  usedBuiltinNip07: "builtinNip07.enabled",
}

export async function init() {
  log("experimental-api start...")

  // Get setting values from the prefs.
  const results = await browser.builtinNip.getPrefs()
  const prefs = {} as FixMe
  Object.entries(MapBetweenPrefAndState).map(([_state, _pref]) => {
    prefs[_state] = results[_pref]
  })
  state.nostr = {
    ...state.nostr,
    prefs,
  }

  log("nostr inited in background", state.nostr)
}

// initial action while the webapps are loading
browser.webNavigation.onDOMContentLoaded.addListener(
  async (detail) => {
    // It's only injecting functions and doesn't need trusted.
    const injecting =
      state.nostr.prefs.usedBuiltinNip07 && supported(detail.url)
    log("nostr init to tab", injecting)

    // Notify init to the contents
    const tab = await browser.tabs.get(detail.tabId)
    log("send to tab", tab)
    sendTab(tab, "nostr/builtinNip07Init", injecting)
  },
  { url: [{ schemes: SafeProtocols }] }
)

const onPrefChangedCallback = async (prefKey: string) => {
  const stateName = Object.entries(MapBetweenPrefAndState)
    .filter(([_state, _pref]) => _pref === prefKey)
    .map(([_state, _pref]) => _state)[0]
  const newVal = !state.nostr.prefs[stateName]
  state.nostr.prefs[stateName] = newVal
  log("pref changed!", prefKey, newVal, state.nostr)

  // Send the message to the contents
  if (["builtinNip07.enabled"].includes(prefKey)) {
    const tabs = await browser.tabs.query({
      status: "complete",
      discarded: false,
    })
    for (const tab of tabs) {
      log("send to tab", tab)
      sendTab(tab, "nostr/builtinNip07Changed", state.nostr.prefs[stateName])
    }
  }
}
browser.builtinNip.onPrefBuiltinNip07Changed.addListener(onPrefChangedCallback)

/**
 * Internal Utils
 *
 */

async function sendTab(tab, action, data) {
  if (!supported(tab.url)) {
    // browser origin event is not sent anything
    return
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
