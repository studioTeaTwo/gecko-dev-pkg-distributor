// Copyright (c) 2021, The Tor Project, Inc.

import { TorStrings } from "resource://gre/modules/TorStrings.sys.mjs";
import {
  InternetStatus,
  TorConnect,
  TorConnectTopics,
  TorConnectState,
} from "resource://gre/modules/TorConnect.sys.mjs";
import {
  TorSettings,
  TorSettingsTopics,
} from "resource://gre/modules/TorSettings.sys.mjs";

const BroadcastTopic = "about-torconnect:broadcast";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  HomePage: "resource:///modules/HomePage.sys.jsm",
});

const log = console.createInstance({
  maxLogLevel: "Warn",
  prefix: "TorConnectParent",
});

/*
This object is basically a marshalling interface between the TorConnect module
and a particular about:torconnect page
*/

/**
 * Actor parent class for the about:torconnect page.
 * It adapts and relays the messages from and to the TorConnect module.
 */
export class TorConnectParent extends JSWindowActorParent {
  constructor(...args) {
    super(...args);

    const self = this;

    this.state = {
      State: TorConnect.state,
      StateChanged: false,
      PreviousState: TorConnectState.Initial,
      ErrorCode: TorConnect.errorCode,
      ErrorDetails: TorConnect.errorDetails,
      BootstrapProgress: TorConnect.bootstrapProgress,
      InternetStatus: TorConnect.internetStatus,
      DetectedLocation: TorConnect.detectedLocation,
      ShowViewLog: TorConnect.logHasWarningOrError,
      HasEverFailed: TorConnect.hasEverFailed,
      UIState: TorConnect.uiState,
    };

    // Workaround for a race condition, but we should fix it asap.
    // about:torconnect is loaded before TorSettings is actually initialized.
    // The getter might throw and the page not loaded correctly as a result.
    // Silence any warning for now, but we should really fix it.
    // See also tor-browser#41921.
    try {
      this.state.QuickStartEnabled = TorSettings.quickstart.enabled;
    } catch (e) {
      this.state.QuickStartEnabled = false;
    }

    // JSWindowActiveParent derived objects cannot observe directly, so create a
    // member object to do our observing for us.
    //
    // This object converts the various lifecycle events from the TorConnect
    // module, and maintains a state object which we pass down to our
    // about:torconnect page, which uses the state object to update its UI.
    this.torConnectObserver = {
      observe(aSubject, aTopic) {
        let obj = aSubject?.wrappedJSObject;

        // Update our state struct based on received torconnect topics and
        // forward on to aboutTorConnect.js.
        self.state.StateChanged = false;
        switch (aTopic) {
          case TorConnectTopics.StateChange: {
            self.state.PreviousState = self.state.State;
            self.state.State = obj.state;
            self.state.StateChanged = true;
            // Clear any previous error information if we are bootstrapping.
            if (self.state.State === TorConnectState.Bootstrapping) {
              self.state.ErrorCode = null;
              self.state.ErrorDetails = null;
            }
            self.state.BootstrapProgress = TorConnect.bootstrapProgress;
            self.state.ShowViewLog = TorConnect.logHasWarningOrError;
            self.state.HasEverFailed = TorConnect.hasEverFailed;
            break;
          }
          case TorConnectTopics.BootstrapProgress: {
            self.state.BootstrapProgress = obj.progress;
            self.state.ShowViewLog = obj.hasWarnings;
            break;
          }
          case TorConnectTopics.BootstrapComplete: {
            // noop
            break;
          }
          case TorConnectTopics.Error: {
            self.state.ErrorCode = obj.code;
            self.state.ErrorDetails = obj;
            self.state.InternetStatus = TorConnect.internetStatus;
            self.state.DetectedLocation = TorConnect.detectedLocation;
            self.state.ShowViewLog = true;
            break;
          }
          case TorSettingsTopics.Ready: {
            if (
              self.state.QuickStartEnabled !== TorSettings.quickstart.enabled
            ) {
              self.state.QuickStartEnabled = TorSettings.quickstart.enabled;
            } else {
              return;
            }
            break;
          }
          case TorSettingsTopics.SettingsChanged: {
            if (
              aSubject.wrappedJSObject.changes.includes("quickstart.enabled")
            ) {
              self.state.QuickStartEnabled = TorSettings.quickstart.enabled;
            } else {
              // this isn't a setting torconnect cares about
              return;
            }
            break;
          }
          default: {
            log.warn(`TorConnect: unhandled observe topic '${aTopic}'`);
          }
        }

        self.sendAsyncMessage("torconnect:state-change", self.state);
      },
    };

    // Observe all of the torconnect:.* topics.
    for (const key in TorConnectTopics) {
      const topic = TorConnectTopics[key];
      Services.obs.addObserver(this.torConnectObserver, topic);
    }
    Services.obs.addObserver(this.torConnectObserver, TorSettingsTopics.Ready);
    Services.obs.addObserver(
      this.torConnectObserver,
      TorSettingsTopics.SettingsChanged
    );

    this.userActionObserver = {
      observe(aSubject) {
        let obj = aSubject?.wrappedJSObject;
        if (obj) {
          obj.connState = self.state;
          self.sendAsyncMessage("torconnect:user-action", obj);
        }
      },
    };
    Services.obs.addObserver(this.userActionObserver, BroadcastTopic);
  }

  willDestroy() {
    // Stop observing all of our torconnect:.* topics.
    for (const key in TorConnectTopics) {
      const topic = TorConnectTopics[key];
      Services.obs.removeObserver(this.torConnectObserver, topic);
    }
    Services.obs.removeObserver(
      this.torConnectObserver,
      TorSettingsTopics.Ready
    );
    Services.obs.removeObserver(
      this.torConnectObserver,
      TorSettingsTopics.SettingsChanged
    );
    Services.obs.removeObserver(this.userActionObserver, BroadcastTopic);
  }

  async receiveMessage(message) {
    switch (message.name) {
      case "torconnect:should-show":
        return Promise.resolve(TorConnect.shouldShowTorConnect);
      case "torconnect:home-page":
        // If there are multiple home pages, just load the first one.
        return Promise.resolve(TorConnect.fixupURIs(lazy.HomePage.get())[0]);
      case "torconnect:set-quickstart":
        TorSettings.quickstart.enabled = message.data;
        TorSettings.saveToPrefs().applySettings();
        break;
      case "torconnect:open-tor-preferences":
        TorConnect.openTorPreferences();
        break;
      case "torconnect:cancel-bootstrap":
        TorConnect.cancelBootstrap();
        break;
      case "torconnect:begin-bootstrap":
        TorConnect.beginBootstrap();
        break;
      case "torconnect:begin-autobootstrap":
        TorConnect.beginAutoBootstrap(message.data);
        break;
      case "torconnect:view-tor-logs":
        TorConnect.viewTorLogs();
        break;
      case "torconnect:restart":
        Services.startup.quit(
          Ci.nsIAppStartup.eRestart | Ci.nsIAppStartup.eAttemptQuit
        );
        break;
      case "torconnect:set-ui-state":
        TorConnect.uiState = message.data;
        this.state.UIState = TorConnect.uiState;
        break;
      case "torconnect:broadcast-user-action":
        Services.obs.notifyObservers(message.data, BroadcastTopic);
        break;
      case "torconnect:get-init-args":
        // Called on AboutTorConnect.init(), pass down all state data it needs
        // to init.

        // pretend this is a state transition on init
        // so we always get fresh UI
        this.state.StateChanged = true;
        this.state.UIState = TorConnect.uiState;
        return {
          TorStrings,
          TorConnectState,
          InternetStatus,
          Direction: Services.locale.isAppLocaleRTL ? "rtl" : "ltr",
          State: this.state,
          CountryNames: TorConnect.countryNames,
        };
      case "torconnect:get-country-codes":
        return TorConnect.getCountryCodes();
    }
    return undefined;
  }
}
