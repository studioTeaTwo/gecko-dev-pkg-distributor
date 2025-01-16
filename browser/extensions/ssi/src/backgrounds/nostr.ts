import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";
import { log } from "../shared/logger";
import { state } from "./state";
import { type NostrEvent } from "../custom.type";

// NOTE(ssb): Currently firefox does not support externally_connectable.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable
const SafeProtocols = ["http", "https", "moz-extension"];

const MapBetweenPrefAndState = {
  enabled: "enabled",
  usedAccountChanged: "event.accountChanged.enabled",
};

const DialogMessage = {
  "nostr/getPublicKey": "read Nostr public key",
  "nostr/signEvent": "sign with Nostr",
  "nostr/accountChanged": "notify account changed",
  "nostr/providerChanged": "notify provider changed",
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
      return decodeNpub(state.nostr.npub);
    }
    case "nostr/signEvent": {
      if (typeof args.message !== "string") {
        throw new Error("Invalid message");
      }
      if (!validateEvent(args.event)) {
        throw new Error("Invalid event");
      }

      const message = args.message;
      const event = args.event;
      event.pubkey = decodeNpub(state.nostr.npub); // override to verify
      const eventHash = bytesToHex(
        sha256(new TextEncoder().encode(serializeEvent(event)))
      );
      if (message !== eventHash) {
        throw new Error("Invalid message");
      }

      // Sign
      const signature = await browser.ssi.nostr.sign(message, {
        caption: DialogMessage[action],
        submission: JSON.stringify(args.event, null, 1),
      });
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
    prefs[_state] = results[_pref];
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
  const stateName = Object.entries(MapBetweenPrefAndState)
    .filter(([_state, _pref]) => _pref === prefKey)
    .map(([_state, _pref]) => _state)[0];
  const newVal = !state.nostr.prefs[stateName];
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
browser.ssi.nostr.onPrefEnabledChanged.addListener(onPrefChangedCallback);

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

// based upon : https://github.com/nbd-wtf/nostr-tools/blob/master/core.ts#L33
function validateEvent(event: NostrEvent): boolean {
  if (!(event instanceof Object)) {
    return false;
  }
  if (typeof event.kind !== "number") {
    return false;
  }
  if (typeof event.content !== "string") {
    return false;
  }
  if (typeof event.created_at !== "number") {
    return false;
  }
  if (typeof event.pubkey !== "string") {
    return false;
  }
  if (!event.pubkey.match(/^[a-f0-9]{64}$/)) {
    return false;
  }

  if (!Array.isArray(event.tags)) {
    return false;
  }
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i];
    if (!Array.isArray(tag)) {
      return false;
    }
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === "object") {
        return false;
      }
    }
  }

  return true;
}

// from: https://github.com/nbd-wtf/nostr-tools/blob/master/pure.ts#L43
function serializeEvent(event: NostrEvent): string {
  if (!validateEvent(event)) {
    throw new Error("can't serialize event with wrong or missing properties");
  }

  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}
