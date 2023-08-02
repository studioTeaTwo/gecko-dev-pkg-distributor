import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AboutTorMessage: "resource:///modules/AboutTorMessage.sys.mjs",
  TorConnect: "resource://gre/modules/TorConnect.sys.mjs",
});

/**
 * Actor parent class for the about:tor page.
 */
export class AboutTorParent extends JSWindowActorParent {
  receiveMessage(message) {
    const onionizePref = "torbrowser.homepage.search.onionize";
    switch (message.name) {
      case "AboutTor:GetInitialData":
        return Promise.resolve({
          torConnectEnabled: lazy.TorConnect.enabled,
          messageData: lazy.AboutTorMessage.getNext(),
          isStable: AppConstants.MOZ_UPDATE_CHANNEL === "release",
          searchOnionize: Services.prefs.getBoolPref(onionizePref, false),
        });
      case "AboutTor:SetSearchOnionize":
        Services.prefs.setBoolPref(onionizePref, message.data);
        break;
    }
    return undefined;
  }
}
