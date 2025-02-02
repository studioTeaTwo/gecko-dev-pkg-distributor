import { bytesToHex } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";
import { log } from "../shared/logger";
import { state } from "./state";

// NOTE(ssb): Currently firefox does not support externally_connectable.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable
const SafeProtocols = ["http", "https", "moz-extension"];

const MapBetweenPrefAndState = {
  enabled: "enabled",
};

const DialogMessage = {
  "nostr/getPublicKey": "OK?",
  "nostr/signEvent": "OK?",
};

const ERR_MSG_NOT_ENABLED =
  "window.ssi.nostr is not enabled or no key is registered. The user can confirm and edit it in 'about:selfsovereignidentity'.";
const ERR_MSG_NOT_SUPPORTED = `This protocol is not spported. Currently, only supports ${SafeProtocols.join(",")}.`;

// Proceed calls from contents
export const doNostrAction = async (
  action: string,
  args: FixMe,
  origin: string
) => {
  if (!state.nostr.prefs.enabled) {
    throw new Error(ERR_MSG_NOT_ENABLED);
  }
  if (!supported(origin)) {
    throw new Error(ERR_MSG_NOT_SUPPORTED);
  }

  switch (action) {
    case "nostr/getPublicKey": {
      if (!state.nostr.npub) {
        const credentials = await browser.ssi.searchCredentialsWithoutSecret(
          {
            protocolName: "nostr",
            credentialName: state.nostr.credentialName,
            primary: true,
          },
          { caption: DialogMessage[action], submission: "" }
        );
        if (credentials.length === 0) {
          throw new Error(ERR_MSG_NOT_ENABLED);
        }
        state.nostr = {
          ...state.nostr,
          npub: credentials[0].identifier,
        };
      }
      return decodeNpub(state.nostr.npub);
    }
    case "nostr/signEvent": {
      if (typeof args.message !== "string") {
        throw new Error("Invalid message");
      }

      // Sign
      const signature = await browser.ssi.nostr.sign(
        args.message,
        { type: "signEvent" },
        {
          caption: DialogMessage[action],
        }
      );
      if (!signature) {
        throw new Error("Failed to sign");
      }

      return signature;
    }
    default:
      throw new Error("Not implemented");
  }
};

export async function init() {
  log("experimental-api start...");

  state.nostr.credentialName = "nsec";

  // Get setting values from the prefs.
  const results = await browser.ssi.nostr.getPrefs();
  const prefs = {} as FixMe;
  Object.entries(MapBetweenPrefAndState).map(([_state, _pref]) => {
    prefs[_state] =
      results && results[_pref] ? results[_pref] : state.nostr.prefs[_pref];
  });
  state.nostr = {
    ...state.nostr,
    prefs,
  };

  log("nostr inited in background", state.nostr);
}

// The message listener to listen to experimental-apis calls
// After, those calls get passed on to the content scripts.
const onPrimaryChangedCallback = async () => {
  const credentials = await browser.ssi.searchCredentialsWithoutSecret(
    {
      protocolName: "nostr",
      credentialName: state.nostr.credentialName,
      primary: true,
    },
    { caption: DialogMessage["nostr/getPublicKey"], submission: "" }
  );
  log("primary changed!", credentials);

  // That means it's all been removed
  if (credentials.length === 0) {
    state.nostr.npub = "";
    return;
  }

  state.nostr = {
    ...state.nostr,
    npub: credentials[0].identifier,
  };

  // Send the message to the contents
  const tabs = await browser.tabs.query({
    status: "complete",
    discarded: false,
  });
  const pubkey = decodeNpub(state.nostr.npub);
  for (const tab of tabs) {
    log("send to tab", tab);
    sendTab(tab, "nostr/accountChanged", pubkey);
  }
};
browser.ssi.nostr.onPrimaryChanged.addListener(onPrimaryChangedCallback);

const onPrefChangedCallback = async (prefKey: string) => {
  // Update new value
  const results = await browser.ssi.nostr.getPrefs();
  const stateName = Object.entries(MapBetweenPrefAndState)
    .filter(([_state, _pref]) => _pref === prefKey)
    .map(([_state, _pref]) => _state)[0];
  const newVal = results[stateName];
  state.nostr.prefs[stateName] = newVal;
  log("pref changed!", prefKey, newVal, state.nostr);

  // Send the message to the contents
  // AccountChanged should only be held in the background.
  if (["enabled"].includes(prefKey)) {
    const tabs = await browser.tabs.query({
      status: "complete",
      discarded: false,
    });
    for (const tab of tabs) {
      log("send to tab", tab);
      sendTab(tab, "nostr/providerChanged", state.nostr.prefs[stateName]);
    }
  }
};
browser.ssi.nostr.onPrefEnabledChanged.addListener(() =>
  onPrefChangedCallback("enabled")
);

/**
 * Internal Utils
 *
 */

async function sendTab(tab: browser.tabs.Tab, action: string, data: FixMe) {
  if (!supported(tab.url)) {
    // browser origin event is not sent anything
    return;
  }

  browser.tabs
    .sendMessage(tab.id, {
      action,
      args: data,
    })
    .catch();
}

function supported(tabUrl: string): boolean {
  return SafeProtocols.some(protocol => tabUrl.startsWith(protocol));
}

function decodeNpub(npub) {
  const Bech32MaxSize = 5000;
  const { prefix, words } = bech32.decode(
    npub as `${string}1${string}`,
    Bech32MaxSize
  );
  if (prefix !== "npub") {
    throw new Error("Not npub!");
  }
  return bytesToHex(new Uint8Array(bech32.fromWords(words)));
}
