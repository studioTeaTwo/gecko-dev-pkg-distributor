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
    const surveyDismissVersionPref =
      "torbrowser.homepage.survey.dismiss_version";
    switch (message.name) {
      case "AboutTor:GetInitialData":
        return Promise.resolve({
          torConnectEnabled: lazy.TorConnect.enabled,
          messageData: lazy.AboutTorMessage.getNext(),
          isStable: AppConstants.MOZ_UPDATE_CHANNEL === "release",
          searchOnionize: Services.prefs.getBoolPref(onionizePref, false),
          surveyDismissVersion: Services.prefs.getIntPref(
            surveyDismissVersionPref,
            0
          ),
          appLocale: Services.locale.appLocaleAsBCP47,
        });
      case "AboutTor:SetSearchOnionize":
        Services.prefs.setBoolPref(onionizePref, message.data);
        break;
      case "AboutTor:SurveyDismissed":
        // The message.data contains the version of the current survey.
        // Rather than introduce a new preference for each survey campaign we
        // reuse the same integer preference and increase its value every time
        // a new version of the survey is shown and dismissed by the user.
        // I.e. if the preference value is 2, we will not show survey version 2
        // but will show survey version 3 or higher when they are introduced.
        // It should be safe to overwrite the value since we do not expect more
        // than one active survey campaign at any given time, nor do we expect
        // the version value to decrease.
        Services.prefs.setIntPref(surveyDismissVersionPref, message.data);
        break;
    }
    return undefined;
  }
}
