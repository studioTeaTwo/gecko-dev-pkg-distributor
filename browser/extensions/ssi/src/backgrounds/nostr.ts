import { bytesToHex } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";
import { log } from "../shared/logger";
import { state } from "./state";
import {
  ERR_MSG_NOT_ENABLED,
  ERR_MSG_NOT_SUPPORTED,
} from "../shared/constants";
import { supported, sendTab } from "./utils";

const MapBetweenPrefAndState = {
  enabled: "enabled",
};

const DialogMessage = {
  "nostr/generate": "App is requesting you.",
  "nostr/getPublicKey": "App is requesting you.",
  "nostr/signEvent": "App is requesting you.",
  "nostr/nip04/encrypt": "App is requesting you.",
  "nostr/nip04/decrypt": "App is requesting you.",
  "nostr/nip44/encrypt": "App is requesting you.",
  "nostr/nip44/decrypt": "App is requesting you.",
};

// Proceed calls from contents
export const doNostrAction = async (
  tabId: number,
  origin: string,
  action: string,
  args: FixMe
) => {
  if (!state.nostr.prefs.enabled) {
    throw new Error(ERR_MSG_NOT_ENABLED("nostr"));
  }
  if (!supported(origin)) {
    throw new Error(ERR_MSG_NOT_SUPPORTED);
  }

  switch (action) {
    case "nostr/generate": {
      if (args.type == null || !["single", "mnemonic"].includes(args.type)) {
        throw new Error(`Invalid type: ${args.type}`);
      }

      // Generate
      const pubkey = await browser.ssi.nostr.generate(
        tabId,
        { type: args.type },
        {
          caption: DialogMessage[action],
        }
      );
      if (!pubkey) {
        throw new Error("Failed to generate");
      }

      return pubkey;
    }
    case "nostr/getPublicKey": {
      const credentials = await browser.ssi.searchCredentials(
        tabId,
        {
          protocolName: "nostr",
          credentialName: state.nostr.credentialName,
          primary: true,
        },
        { caption: DialogMessage[action], submission: "" }
      );
      if (credentials.length === 0) {
        throw new Error(ERR_MSG_NOT_ENABLED("nostr"));
      }
      state.nostr = {
        ...state.nostr,
        npub: credentials[0].identifier,
      };
      return decodeNpub(state.nostr.npub);
    }
    case "nostr/signEvent": {
      if (args.type == null || args.type !== "signEvent") {
        throw new Error(`Invalid type: ${args.type}`);
      }
      if (args.message == null || typeof args.message !== "string") {
        throw new Error("Invalid message");
      }

      // Sign
      const signature = await browser.ssi.nostr.sign(
        tabId,
        args.message,
        { type: args.type },
        {
          caption: DialogMessage[action],
        }
      );
      if (!signature) {
        throw new Error("Failed to sign");
      }

      return signature;
    }
    case "nostr/nip04/encrypt":
    case "nostr/nip44/encrypt": {
      if (args.type == null || !["nip04", "nip44"].includes(args.type)) {
        throw new Error(`Invalid type: ${args.type}`);
      }
      if (args.plaintext == null || typeof args.plaintext !== "string") {
        throw new Error("Invalid plaintext");
      }
      // TODO(ssb): validate in the terms of cryptography. e.g. `function isProbPub` in toolkit/components/ssi/protocols/noble-curves/abstract/weierstrass.sys.mjs
      if (args.pubkey == null || typeof args.pubkey !== "string") {
        throw new window.Error("Invalid partner's pubkey");
      }

      // Encrypt
      const ciphertext = await browser.ssi.nostr.encrypt(
        tabId,
        args.plaintext,
        { type: args.type, pubkey: args.pubkey },
        {
          caption: DialogMessage[action],
        }
      );
      if (!ciphertext) {
        throw new Error("Failed to encrypt");
      }

      return ciphertext;
    }
    case "nostr/nip04/decrypt":
    case "nostr/nip44/decrypt": {
      if (args.type == null || !["nip04", "nip44"].includes(args.type)) {
        throw new Error(`Invalid type: ${args.type}`);
      }
      // TODO(ssb): validate in the terms of cryptography
      if (args.ciphertext == null || typeof args.ciphertext !== "string") {
        throw new Error("Invalid ciphertext");
      }
      // TODO(ssb): validate in the terms of cryptography. e.g. `function isProbPub` in toolkit/components/ssi/protocols/noble-curves/abstract/weierstrass.sys.mjs
      if (args.pubkey == null || typeof args.pubkey !== "string") {
        throw new window.Error("Invalid partner's pubkey");
      }

      // Decrypt
      const plaintext = await browser.ssi.nostr.decrypt(
        tabId,
        args.ciphertext,
        { type: args.type, pubkey: args.pubkey },
        {
          caption: DialogMessage[action],
        }
      );
      if (!plaintext) {
        throw new Error("Failed to decrypt");
      }

      return plaintext;
    }
    default:
      throw new Error("Not implemented");
  }
};

export async function init() {
  log("nostr start...");

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
    prefs: prefs,
  };

  log("nostr inited in background", state.nostr);
}

// The message listener to listen to experimental-apis calls
// After, those calls get passed on to the content scripts.
const onPrimaryChangedCallback = async () => {
  const credentials = await browser.ssi.searchCredentials(
    -1, // FIXME(ssb): Tab context doesn't exist. See also https://gitlab.com/studioteatwo/gecko-dev-for-ssi/-/issues/2
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
  const stateName = MapBetweenPrefAndState[prefKey];
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
