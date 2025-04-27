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
  "bitcoin/generate": "App is requesting you.",
  "bitcoin/shareWith": 'App is requesting you to share your "SECRET".',
};

// Proceed calls from contents
export const doBitcoinAction = async (
  tabId: number,
  origin: string,
  action: string,
  args: FixMe
) => {
  if (!state.bitcoin.prefs.enabled) {
    throw new Error(ERR_MSG_NOT_ENABLED("bitcoin"));
  }
  if (!supported(origin)) {
    throw new Error(ERR_MSG_NOT_SUPPORTED);
  }

  switch (action) {
    case "bitcoin/generate": {
      console.log("bitcoin generate");
      if (
        args.type == null ||
        !["mnemonic", "derivation"].includes(args.type)
      ) {
        throw new Error(`Invalid type: ${args.type}`);
      }

      const identifier = await browser.ssi.bitcoin.generate(tabId, args, {
        caption: DialogMessage[action],
        submission: "",
      });
      if (!identifier) {
        throw new Error("Failed to generate");
      }

      return identifier;
    }
    case "bitcoin/shareWith": {
      if (args.pubkey == null || typeof args.pubkey !== "string") {
        throw new Error("Invalid partner's pubkey");
      }
      if (
        args.type == null ||
        !["mnemonic", "derivation", "xpriv"].includes(args.type)
      ) {
        throw new Error(`Invalid type: ${args.type}`);
      }

      const pubkey = args.pubkey;
      delete args.pubkey; // Delete to pass schema check of built-in API
      const encryptedSecret = await browser.ssi.bitcoin.shareWith(
        tabId,
        pubkey,
        args,
        {
          caption: DialogMessage[action],
          submission:
            "Once you share, you can't take it back. Please check carefully!",
        }
      );
      if (!encryptedSecret) {
        throw new Error("Failed to shareWith");
      }

      return encryptedSecret;
    }
    default:
      throw new Error("Not implemented");
  }
};

export async function init() {
  log("bitcoin start...");

  state.bitcoin.credentialName = "bip39";

  // Get setting values from the prefs.
  const results = await browser.ssi.bitcoin.getPrefs();
  const prefs = {} as FixMe;
  Object.entries(MapBetweenPrefAndState).map(([_state, _pref]) => {
    prefs[_state] =
      results && results[_pref] ? results[_pref] : state.bitcoin.prefs[_pref];
  });
  state.bitcoin = {
    ...state.bitcoin,
    prefs: prefs,
  };

  log("bitcoin inited in background", state.bitcoin);
}

// The message listener to listen to experimental-apis calls
// After, those calls get passed on to the content scripts.
const onPrimaryChangedCallback = async () => {
  const credentials = await browser.ssi.searchCredentials(
    -1, // FIXME(ssb): Tab context doesn't exist. See also https://gitlab.com/studioteatwo/gecko-dev-for-ssi/-/issues/2
    {
      protocolName: "bitcoin",
      credentialName: state.bitcoin.credentialName,
      primary: true,
    }
  );
  log("primary changed!", credentials);
};
browser.ssi.bitcoin.onPrimaryChanged.addListener(onPrimaryChangedCallback);

const onPrefChangedCallback = async (prefKey: string) => {
  // Update new value
  const results = await browser.ssi.bitcoin.getPrefs();
  const stateName = MapBetweenPrefAndState[prefKey];
  const newVal = results[stateName];
  state.bitcoin.prefs[stateName] = newVal;
  log("pref changed!", prefKey, newVal, state.bitcoin);

  // Send the message to the contents
  // AccountChanged should only be held in the background.
  if (["enabled"].includes(prefKey)) {
    const tabs = await browser.tabs.query({
      status: "complete",
      discarded: false,
    });
    for (const tab of tabs) {
      log("send to tab", tab);
      sendTab(tab, "bitcoin/providerChanged", state.bitcoin.prefs[stateName]);
    }
  }
};
browser.ssi.bitcoin.onPrefEnabledChanged.addListener(() =>
  onPrefChangedCallback("enabled")
);

/**
 * Internal Utils
 *
 */
