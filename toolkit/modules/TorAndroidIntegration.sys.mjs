/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  EventDispatcher: "resource://gre/modules/Messaging.sys.mjs",
  TorConnect: "resource://gre/modules/TorConnect.sys.mjs",
  TorConnectTopics: "resource://gre/modules/TorConnect.sys.mjs",
  TorSettingsTopics: "resource://gre/modules/TorSettings.sys.mjs",
  TorProviderBuilder: "resource://gre/modules/TorProviderBuilder.sys.mjs",
  TorProviderTopics: "resource://gre/modules/TorProviderBuilder.sys.mjs",
  TorSettings: "resource://gre/modules/TorSettings.sys.mjs",
});

const Prefs = Object.freeze({
  logLevel: "browser.tor_android.log_level",
});

const logger = console.createInstance({
  maxLogLevelPref: Prefs.logLevel,
  prefix: "TorAndroidIntegration",
});

const EmittedEvents = Object.freeze({
  settingsReady: "GeckoView:Tor:SettingsReady",
  settingsChanged: "GeckoView:Tor:SettingsChanged",
  connectStateChanged: "GeckoView:Tor:ConnectStateChanged",
  connectError: "GeckoView:Tor:ConnectError",
  bootstrapProgress: "GeckoView:Tor:BootstrapProgress",
  bootstrapComplete: "GeckoView:Tor:BootstrapComplete",
  torLogs: "GeckoView:Tor:Logs",
});

const ListenedEvents = Object.freeze({
  settingsGet: "GeckoView:Tor:SettingsGet",
  // The data is passed directly to TorSettings.
  settingsSet: "GeckoView:Tor:SettingsSet",
  settingsApply: "GeckoView:Tor:SettingsApply",
  settingsSave: "GeckoView:Tor:SettingsSave",
  bootstrapBegin: "GeckoView:Tor:BootstrapBegin",
  // Optionally takes a countryCode, as data.countryCode.
  bootstrapBeginAuto: "GeckoView:Tor:BootstrapBeginAuto",
  bootstrapCancel: "GeckoView:Tor:BootstrapCancel",
  bootstrapGetState: "GeckoView:Tor:BootstrapGetState",
});

class TorAndroidIntegrationImpl {
  #initialized = false;

  async init() {
    if (this.#initialized) {
      logger.warn("Something tried to initilize us again.");
      return;
    }
    this.#initialized = true;

    lazy.EventDispatcher.instance.registerListener(
      this,
      Object.values(ListenedEvents)
    );

    Services.obs.addObserver(this, lazy.TorProviderTopics.TorLog);

    for (const topic in lazy.TorConnectTopics) {
      Services.obs.addObserver(this, lazy.TorConnectTopics[topic]);
    }

    for (const topic in lazy.TorSettingsTopics) {
      Services.obs.addObserver(this, lazy.TorSettingsTopics[topic]);
    }

    lazy.TorProviderBuilder.init().finally(() => {
      lazy.TorProviderBuilder.firstWindowLoaded();
    });
    try {
      await lazy.TorSettings.init();
      await lazy.TorConnect.init();
    } catch (e) {
      logger.error("Cannot initialize TorSettings or TorConnect", e);
    }
  }

  observe(subj, topic) {
    switch (topic) {
      case lazy.TorConnectTopics.StateChange:
        lazy.EventDispatcher.instance.sendRequest({
          type: EmittedEvents.connectStateChanged,
          state: subj.wrappedJSObject.state ?? "",
        });
        break;
      case lazy.TorConnectTopics.BootstrapProgress:
        lazy.EventDispatcher.instance.sendRequest({
          type: EmittedEvents.bootstrapProgress,
          progress: subj.wrappedJSObject.progress ?? 0,
          hasWarnings: subj.wrappedJSObject.hasWarnings ?? false,
        });
        break;
      case lazy.TorConnectTopics.BootstrapComplete:
        lazy.EventDispatcher.instance.sendRequest({
          type: EmittedEvents.bootstrapComplete,
        });
        break;
      case lazy.TorConnectTopics.Error:
        lazy.EventDispatcher.instance.sendRequest({
          type: EmittedEvents.connectError,
          code: subj.wrappedJSObject.code ?? "",
          message: subj.wrappedJSObject.message ?? "",
          phase: subj.wrappedJSObject.cause?.phase ?? "",
          reason: subj.wrappedJSObject.cause?.reason ?? "",
        });
        break;
      case lazy.TorProviderTopics.TorLog:
        lazy.EventDispatcher.instance.sendRequest({
          type: EmittedEvents.torLogs,
          logType: subj.wrappedJSObject.type ?? "",
          message: subj.wrappedJSObject.msg ?? "",
        });
        break;
      case lazy.TorSettingsTopics.Ready:
        lazy.EventDispatcher.instance.sendRequest({
          type: EmittedEvents.settingsReady,
          settings: lazy.TorSettings.getSettings(),
        });
        break;
      case lazy.TorSettingsTopics.SettingsChanged:
        // For Android we push also the settings object to avoid a round trip on
        // the event dispatcher.
        lazy.EventDispatcher.instance.sendRequest({
          type: EmittedEvents.settingsChanged,
          changes: subj.wrappedJSObject.changes ?? [],
          settings: lazy.TorSettings.getSettings(),
        });
        break;
    }
  }

  async onEvent(event, data, callback) {
    logger.debug(`Received event ${event}`, data);
    try {
      switch (event) {
        case ListenedEvents.settingsGet:
          callback?.onSuccess(lazy.TorSettings.getSettings());
          return;
        case ListenedEvents.settingsSet:
          // This does not throw, so we do not have any way to report the error!
          lazy.TorSettings.setSettings(data.settings);
          if (data.save) {
            lazy.TorSettings.saveToPrefs();
          }
          if (data.apply) {
            await lazy.TorSettings.applySettings();
          }
          break;
        case ListenedEvents.settingsApply:
          await lazy.TorSettings.applySettings();
          break;
        case ListenedEvents.settingsSave:
          await lazy.TorSettings.saveToPrefs();
          break;
        case ListenedEvents.bootstrapBegin:
          lazy.TorConnect.beginBootstrap();
          break;
        case ListenedEvents.bootstrapBeginAuto:
          lazy.TorConnect.beginAutoBootstrap(data.countryCode);
          break;
        case ListenedEvents.bootstrapCancel:
          lazy.TorConnect.cancelBootstrap();
          break;
        case ListenedEvents.bootstrapGetState:
          callback?.onSuccess(lazy.TorConnect.state);
          return;
      }
      callback?.onSuccess();
    } catch (e) {
      logger.error(`Error while handling event ${event}`, e);
      callback?.onError(e);
    }
  }
}

export const TorAndroidIntegration = new TorAndroidIntegrationImpl();
