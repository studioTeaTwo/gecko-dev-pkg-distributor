// Copyright (c) 2022, The Tor Project, Inc.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

function getLocale() {
  const locale = Services.locale.appLocaleAsBCP47;
  return locale === "ja-JP-macos" ? "ja" : locale;
}

/*
  Tor Property String Bundle

  Property strings loaded from torbutton/tor-launcher, but provide a fallback in case they aren't available
*/
class TorPropertyStringBundle {
  constructor(aBundleURL, aPrefix) {
    try {
      this._bundle = Services.strings.createBundle(aBundleURL);
      this._bundleURL = aBundleURL;
    } catch (e) {
      console.error(`[TorStrings] Cannot load ${aBundleURL}`, e);
    }

    this._prefix = aPrefix;
  }

  getString(key, fallback) {
    const reportError =
      AppConstants.BASE_BROWSER_VERSION === "dev-build" && !!this._bundle;
    if (key) {
      try {
        return this._bundle.GetStringFromName(`${this._prefix}${key}`);
      } catch (e) {
        if (reportError) {
          console.warn(
            `[TorStrings] Cannot get ${this._prefix}${key} from ${this._bundleURL}`,
            e
          );
        }
      }
    }

    // on failure, assign the fallback if it exists
    if (fallback) {
      return fallback;
    }
    // otherwise return string key
    return `$(${key})`;
  }

  getStrings(strings, additionalPrefix = "") {
    return Object.fromEntries(
      Object.entries(strings).map(([key, fallback]) => [
        key,
        this.getString(additionalPrefix + key, fallback),
      ])
    );
  }
}

const Loader = {
  /*
    Tor about:preferences#connection Strings
  */
  settings() {
    const strings = {
      // Message box
      torPreferencesDescription:
        "Tor Browser routes your traffic over the Tor Network, run by thousands of volunteers around the world.",
      // Quickstart
      quickstartCheckbox: "Always connect automatically",
      bridgeLocation: "Your location",
      bridgeLocationAutomatic: "Automatic",
      bridgeLocationFrequent: "Frequently selected locations",
      bridgeLocationOther: "Other locations",
      bridgeChooseForMe: "Choose a Bridge For Me…",
    };

    const tsb = new TorPropertyStringBundle(
      "chrome://torbutton/locale/settings.properties",
      "settings."
    );
    return tsb.getStrings(strings);
  } /* Tor Network Settings Strings */,

  torConnect() {
    const strings = {
      torConnect: "Connect to Tor",

      torConnecting: "Establishing a Connection",

      tryingAgain: "Trying again…",

      noInternet: "Tor Browser couldn’t reach the Internet",
      noInternetDescription:
        "This could be due to a connection issue rather than Tor being blocked. Check your Internet connection, proxy and firewall settings before trying again.",
      torBootstrapFailed: "Tor failed to establish a Tor network connection.",
      couldNotConnect: "Tor Browser could not connect to Tor",
      configureConnection: "configure your connection",
      assistDescription:
        "If Tor is blocked in your location, trying a bridge may help. Connection assist can choose one for you using your location, or you can %S manually instead.",
      tryingBridge: "Trying a bridge…",

      tryingBridgeAgain: "Trying one more time…",
      errorLocation: "Tor Browser couldn’t locate you",
      errorLocationDescription:
        "Tor Browser needs to know your location in order to choose the right bridge for you. If you’d rather not share your location, %S manually instead.",
      isLocationCorrect: "Are these location settings correct?",
      isLocationCorrectDescription:
        "Tor Browser still couldn’t connect to Tor. Please check your location settings are correct and try again, or %S instead.",
      finalError: "Tor Browser still cannot connect",

      finalErrorDescription:
        "Despite its best efforts, connection assist was not able to connect to Tor. Try troubleshooting your connection and adding a bridge manually instead.",
      breadcrumbAssist: "Connection assist",
      breadcrumbLocation: "Location settings",
      breadcrumbTryBridge: "Try a bridge",

      restartTorBrowser: "Restart Tor Browser",

      torConfigure: "Configure Connection…",

      viewLog: "View logs…",

      torConnectButton: "Connect",

      cancel: "Cancel",

      torConnected: "Connected to the Tor network",

      tryAgain: "Try Again",

      yourLocation: "Your Location",
      unblockInternetIn: "Unblock the Internet in",

      tryBridge: "Try a Bridge",

      automatic: "Automatic",
      selectCountryRegion: "Select Country or Region",
      frequentLocations: "Frequently selected locations",
      otherLocations: "Other locations",

      // TorConnect error messages
      offline: "Internet not reachable",
      autoBootstrappingFailed: "Automatic configuration failed",
      autoBootstrappingAllFailed: "None of the configurations we tried worked",
      cannotDetermineCountry: "Unable to determine user country",
      noSettingsForCountry: "No settings available for your location",

      // Titlebar status.
      titlebarStatusName: "Tor connection",
      titlebarStatusNotConnected: "Not connected",
      titlebarStatusConnecting: "Connecting…",
      titlebarStatusPotentiallyBlocked: "Potentially blocked",
      titlebarStatusConnected: "Connected",
    };

    // Some strings were used through TorLauncherUtils.
    // However, we need to use them in about:torconnect, which cannot access
    // privileged code.
    const bootstrapStatus = {
      starting: "Starting",
      conn_pt: "Connecting to bridge",
      conn_done_pt: "Connected to bridge",
      conn_proxy: "Connecting to proxy",
      conn_done_proxy: "Connected to proxy",
      conn: "Connecting to a Tor relay",
      conn_done: "Connected to a Tor relay",
      handshake: "Negotiating with a Tor relay",
      handshake_done: "Finished negotiating with a Tor relay",
      onehop_create: "Establishing an encrypted directory connection",
      requesting_status: "Retrieving network status",
      loading_status: "Loading network status",
      loading_keys: "Loading authority certificates",
      requesting_descriptors: "Requesting relay information",
      loading_descriptors: "Loading relay information",
      enough_dirinfo: "Finished loading relay information",
      ap_conn_pt: "Building circuits: Connecting to bridge",
      ap_conn_done_pt: "Building circuits: Connected to bridge",
      ap_conn_proxy: "Building circuits: Connecting to proxy",
      ap_conn_done_proxy: "Building circuits: Connected to proxy",
      ap_conn: "Building circuits: Connecting to a Tor relay",
      ap_conn_done: "Building circuits: Connected to a Tor relay",
      ap_handshake: "Building circuits: Negotiating with a Tor relay",
      ap_handshake_done:
        "Building circuits: Finished negotiating with a Tor relay",
      circuit_create: "Building circuits: Establishing a Tor circuit",
      done: "Connected to the Tor network!",
    };
    const bootstrapWarning = {
      done: "done",
      connectrefused: "connection refused",
      misc: "miscellaneous",
      resourcelimit: "insufficient resources",
      identity: "identity mismatch",
      timeout: "connection timeout",
      noroute: "no route to host",
      ioerror: "read/write error",
      pt_missing: "missing pluggable transport",
    };

    const tsb = new TorPropertyStringBundle(
      "chrome://torbutton/locale/torConnect.properties",
      "torConnect."
    );
    const tlsb = new TorPropertyStringBundle(
      "chrome://torbutton/locale/torlauncher.properties",
      "torlauncher."
    );
    return {
      ...tsb.getStrings(strings),
      bootstrapFailedDetails: tlsb.getString(
        "tor_bootstrap_failed_details",
        "%1$S failed (%2$S)."
      ),
      bootstrapStatus: tlsb.getStrings(bootstrapStatus, "bootstrapStatus."),
      bootstrapWarning: tlsb.getStrings(bootstrapWarning, "bootstrapWarning."),
    };
  },

  /*
    OnionLocation
  */
  onionLocation() {
    const strings = {
      learnMore: "Learn more…",
      loadOnion: "Visit the .onion",
      loadOnionAccessKey: "V",
      notNow: "Not Now",
      notNowAccessKey: "n",
      description:
        "There's a more private and secure version of this site available over the Tor network via onion services. Onion services help website publishers and their visitors defeat surveillance and censorship.",
      tryThis: "Try Onion Services",
      onionAvailable: ".onion available",
    };

    const tsb = new TorPropertyStringBundle(
      ["chrome://torbutton/locale/onionLocation.properties"],
      "onionLocation."
    );
    return {
      ...tsb.getStrings(strings),
      learnMoreURL: "about:manual#onion-services",
      // XUL popups cannot open about: URLs, but we are online when showing the notification, so just use the online version
      learnMoreURLNotification: `https://tb-manual.torproject.org/${getLocale()}/onion-services/`,
    };
  } /* OnionLocation */,
};

export const TorStrings = {
  get settings() {
    if (!this._settings) {
      this._settings = Loader.settings();
    }
    return this._settings;
  },

  get torConnect() {
    if (!this._torConnect) {
      this._torConnect = Loader.torConnect();
    }
    return this._torConnect;
  },

  get onionLocation() {
    if (!this._onionLocation) {
      this._onionLocation = Loader.onionLocation();
    }
    return this._onionLocation;
  },
};
