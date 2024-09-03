import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AboutTorMessage: "resource:///modules/AboutTorMessage.sys.mjs",
  TorConnect: "resource://gre/modules/TorConnect.sys.mjs",
});

/**
 * Whether we should hide the Year end campaign (YEC) 2024 donation banner for
 * new about:tor pages. Applied to all future about:tor pages within this
 * session (i.e. new tabs, new windows, and after new identity).
 *
 * Will reset at the next full restart.
 *
 * See tor-browser#43098 and tor-browser#42188.
 *
 * @type {boolean}
 */
let hideYEC = AppConstants.MOZ_UPDATE_CHANNEL !== "release";

/**
 * The YEC 2024 start date.
 *
 * @type {integer}
 */
const yecStart = Date.UTC(2024, 9, 14, 15); // 2024 October 14th 15:00.

/**
 * The YEC 2024 end date.
 *
 * @type {integer}
 */
const yecEnd = Date.UTC(2025, 0, 2); // 2025 January 2nd 00:00.

/**
 * Actor parent class for the about:tor page.
 */
export class AboutTorParent extends JSWindowActorParent {
  receiveMessage(message) {
    const onionizePref = "torbrowser.homepage.search.onionize";
    const yecMessagePref = "torbrowser.homepage.yec2024.message";
    let yecMessageNumber = null;
    let now;
    switch (message.name) {
      case "AboutTor:GetInitialData":
        now = Date.now();
        if (!hideYEC && now >= yecStart && now < yecEnd) {
          // Will show the banner.
          yecMessageNumber = Services.prefs.getIntPref(yecMessagePref, 0);
          // Increase the preference for the next about:tor load.
          Services.prefs.setIntPref(yecMessagePref, (yecMessageNumber + 1) % 3);
        }
        return Promise.resolve({
          torConnectEnabled: lazy.TorConnect.enabled,
          messageData: lazy.AboutTorMessage.getNext(),
          isStable: AppConstants.MOZ_UPDATE_CHANNEL === "release",
          searchOnionize: Services.prefs.getBoolPref(onionizePref, false),
          // Locale for YEC 2024. See tor-browser#43098.
          yecMessageNumber,
          appLocale:
            Services.locale.appLocaleAsBCP47 === "ja-JP-macos"
              ? "ja"
              : Services.locale.appLocaleAsBCP47,
        });
      case "AboutTor:SetSearchOnionize":
        Services.prefs.setBoolPref(onionizePref, message.data);
        break;
      case "AboutTor:HideYEC":
        hideYEC = true;
        break;
    }
    return undefined;
  }
}
