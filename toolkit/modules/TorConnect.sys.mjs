/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { setTimeout, clearTimeout } from "resource://gre/modules/Timer.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
  MoatRPC: "resource://gre/modules/Moat.sys.mjs",
  TorBootstrapRequest: "resource://gre/modules/TorBootstrapRequest.sys.mjs",
  TorProviderBuilder: "resource://gre/modules/TorProviderBuilder.sys.mjs",
  TorProviderTopics: "resource://gre/modules/TorProviderBuilder.sys.mjs",
  TorLauncherUtil: "resource://gre/modules/TorLauncherUtil.sys.mjs",
  TorSettings: "resource://gre/modules/TorSettings.sys.mjs",
});

/* Relevant prefs used by tor-launcher */
const TorLauncherPrefs = Object.freeze({
  prompt_at_startup: "extensions.torlauncher.prompt_at_startup",
});

const TorConnectPrefs = Object.freeze({
  censorship_level: "torbrowser.debug.censorship_level",
  allow_internet_test: "torbrowser.bootstrap.allow_internet_test",
  log_level: "torbrowser.bootstrap.log_level",
});

export const TorConnectState = Object.freeze({
  /* Our initial state */
  Initial: "Initial",
  /* In-between initial boot and bootstrapping, users can change tor network settings during this state */
  Configuring: "Configuring",
  /* Tor is attempting to bootstrap with settings from censorship-circumvention db */
  AutoBootstrapping: "AutoBootstrapping",
  /* Tor is bootstrapping */
  Bootstrapping: "Bootstrapping",
  /* Passthrough state back to Configuring */
  Error: "Error",
  /* Final state, after successful bootstrap */
  Bootstrapped: "Bootstrapped",
  /* If we are using System tor or the legacy Tor-Launcher */
  Disabled: "Disabled",
});

export class TorConnectError extends Error {
  static get Offline() {
    return "Offline";
  }
  static get BootstrapError() {
    return "BootstrapError";
  }
  static get CannotDetermineCountry() {
    return "CannotDetermineCountry";
  }
  static get NoSettingsForCountry() {
    return "NoSettingsForCountry";
  }
  static get AllSettingsFailed() {
    return "AllSettingsFailed";
  }
  static get ExternalError() {
    return "ExternalError";
  }

  constructor(code, cause) {
    super(cause?.message ?? `TorConnectError: ${code}`, cause ? { cause } : {});
    this.name = "TorConnectError";
    this.code = code;
  }
}

ChromeUtils.defineLazyGetter(lazy, "logger", () =>
  console.createInstance({
    maxLogLevelPref: TorConnectPrefs.log_level,
    prefix: "TorConnect",
  })
);

/*
                             TorConnect State Transitions

    ┌─────────┐                                                       ┌────────┐
    │         ▼                                                       ▼        │
    │       ┌──────────────────────────────────────────────────────────┐       │
  ┌─┼────── │                           Error                          │ ◀───┐ │
  │ │       └──────────────────────────────────────────────────────────┘     │ │
  │ │         ▲                                                              │ │
  │ │         │                                                              │ │
  │ │         │                                                              │ │
  │ │       ┌───────────────────────┐                       ┌──────────┐     │ │
  │ │ ┌──── │        Initial        │ ────────────────────▶ │ Disabled │     │ │
  │ │ │     └───────────────────────┘                       └──────────┘     │ │
  │ │ │       │                                                              │ │
  │ │ │       │ beginBootstrap()                                             │ │
  │ │ │       ▼                                                              │ │
  │ │ │     ┌──────────────────────────────────────────────────────────┐     │ │
  │ │ │     │                      Bootstrapping                       │ ────┘ │
  │ │ │     └──────────────────────────────────────────────────────────┘       │
  │ │ │       │                        ▲                             │         │
  │ │ │       │ cancelBootstrap()      │ beginBootstrap()            └────┐    │
  │ │ │       ▼                        │                                  │    │
  │ │ │     ┌──────────────────────────────────────────────────────────┐  │    │
  │ │ └───▶ │                                                          │ ─┼────┘
  │ │       │                                                          │  │
  │ │       │                                                          │  │
  │ │       │                       Configuring                        │  │
  │ │       │                                                          │  │
  │ │       │                                                          │  │
  └─┼─────▶ │                                                          │  │
    │       └──────────────────────────────────────────────────────────┘  │
    │         │                        ▲                       ▲          │
    │         │ beginAutoBootstrap()   │ cancelBootstrap()     │          │
    │         ▼                        │                       │          │
    │       ┌───────────────────────┐  │                       │          │
    └────── │   AutoBootstrapping   │ ─┘                       │          │
            └───────────────────────┘                          │          │
              │                                                │          │
              │               ┌────────────────────────────────┘          │
              ▼               │                                           │
            ┌───────────────────────┐                                     │
            │     Bootstrapped      │ ◀───────────────────────────────────┘
            └───────────────────────┘
*/

/* Topics Notified by the TorConnect module */
export const TorConnectTopics = Object.freeze({
  StateChange: "torconnect:state-change",
  BootstrapProgress: "torconnect:bootstrap-progress",
  BootstrapComplete: "torconnect:bootstrap-complete",
  Error: "torconnect:error",
});

// The StateCallback is the base class to implement the various states.
// All states should extend it and implement a `run` function, which can
// optionally be async, and define an array of valid transitions.
// The parent class will handle everything else, including the transition to
// other states when the run function is complete etc...
// A system is also provided to allow this function to early-out. The runner
// should check the transitioning getter when appropriate and return.
// In addition to that, a state can implement a transitionRequested callback,
// which can be used in conjunction with a mechanism like Promise.race.
// This allows to handle, for example, users' requests to cancel a bootstrap
// attempt.
// A state can optionally define a cleanup function, that will be run in all
// cases before transitioning to the next state.
class StateCallback {
  #state;
  #promise;
  #transitioning = false;

  constructor(stateName) {
    this.#state = stateName;
  }

  async begin(...args) {
    lazy.logger.trace(`Entering ${this.#state} state`);
    // Make sure we always have an actual promise.
    try {
      this.#promise = Promise.resolve(this.run(...args));
    } catch (err) {
      this.#promise = Promise.reject(err);
    }
    try {
      // If the callback throws, transition to error as soon as possible.
      await this.#promise;
      lazy.logger.info(`${this.#state}'s run is done`);
    } catch (err) {
      if (this.transitioning) {
        lazy.logger.error(
          `A transition from ${
            this.#state
          } is already happening, silencing this exception.`,
          err
        );
        return;
      }
      lazy.logger.error(
        `${this.#state}'s run threw, transitioning to the Error state.`,
        err
      );
      this.changeState(TorConnectState.Error, err);
    }
  }

  async end(nextState) {
    lazy.logger.trace(
      `Ending state ${this.#state} (to transition to ${nextState})`
    );

    if (this.#transitioning) {
      // Should we check turn this into an error?
      // It will make dealing with the error state harder.
      lazy.logger.warn("this.#transitioning is already true.");
    }

    // Signal we should bail out ASAP.
    this.#transitioning = true;
    if (this.transitionRequested) {
      this.transitionRequested();
    }

    lazy.logger.debug(
      `Waiting for the ${
        this.#state
      }'s callback to return before the transition.`
    );
    try {
      await this.#promise;
    } finally {
      lazy.logger.debug(`Calling ${this.#state}'s cleanup, if implemented.`);
      if (this.cleanup) {
        try {
          await this.cleanup(nextState);
          lazy.logger.debug(`${this.#state}'s cleanup function done.`);
        } catch (e) {
          lazy.logger.warn(`${this.#state}'s cleanup function threw.`, e);
        }
      }
    }
  }

  changeState(stateName, ...args) {
    TorConnect._changeState(stateName, ...args);
  }

  get transitioning() {
    return this.#transitioning;
  }

  get state() {
    return this.#state;
  }
}

// async method to sleep for a given amount of time
const debugSleep = async ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

class InitialState extends StateCallback {
  allowedTransitions = Object.freeze([
    TorConnectState.Disabled,
    TorConnectState.Bootstrapping,
    TorConnectState.Configuring,
    TorConnectState.Error,
  ]);

  constructor() {
    super(TorConnectState.Initial);
  }

  run() {
    // TODO: Block this transition until we successfully build a TorProvider.
  }
}

class ConfiguringState extends StateCallback {
  allowedTransitions = Object.freeze([
    TorConnectState.AutoBootstrapping,
    TorConnectState.Bootstrapping,
    TorConnectState.Error,
  ]);

  constructor() {
    super(TorConnectState.Configuring);
  }

  run() {
    TorConnect._bootstrapProgress = 0;
  }
}

class BootstrappingState extends StateCallback {
  #bootstrap = null;
  #bootstrapError = null;
  #internetTest = null;
  #cancelled = false;

  allowedTransitions = Object.freeze([
    TorConnectState.Configuring,
    TorConnectState.Bootstrapped,
    TorConnectState.Error,
  ]);

  constructor() {
    super(TorConnectState.Bootstrapping);
  }

  async run() {
    if (await this.#simulateCensorship()) {
      return;
    }

    this.#bootstrap = new lazy.TorBootstrapRequest();
    this.#bootstrap.onbootstrapstatus = (progress, status) => {
      TorConnect._updateBootstrapProgress(progress, status);
    };
    this.#bootstrap.onbootstrapcomplete = () => {
      this.#internetTest.cancel();
      this.changeState(TorConnectState.Bootstrapped);
    };
    this.#bootstrap.onbootstraperror = error => {
      if (this.#cancelled) {
        // We ignore this error since it occurred after cancelling (by the
        // user). We assume the error is just a side effect of the cancelling.
        // E.g. If the cancelling is triggered late in the process, we get
        // "Building circuits: Establishing a Tor circuit failed".
        // TODO: Maybe move this logic deeper in the process to know when to
        // filter out such errors triggered by cancelling.
        lazy.logger.warn("Post-cancel error.", error);
        return;
      }
      // We have to wait for the Internet test to finish before sending the
      // bootstrap error
      this.#bootstrapError = error;
      this.#maybeTransitionToError();
    };

    this.#internetTest = new InternetTest();
    this.#internetTest.onResult = status => {
      TorConnect._internetStatus = status;
      this.#maybeTransitionToError();
    };
    this.#internetTest.onError = () => {
      this.#maybeTransitionToError();
    };

    this.#bootstrap.bootstrap();
  }

  async cleanup(nextState) {
    if (nextState === TorConnectState.Configuring) {
      // stop bootstrap process if user cancelled
      this.#cancelled = true;
      this.#internetTest?.cancel();
      await this.#bootstrap?.cancel();
    }
  }

  #maybeTransitionToError() {
    if (
      this.#internetTest.status === InternetStatus.Unknown &&
      this.#internetTest.error === null &&
      this.#internetTest.enabled
    ) {
      // We have been called by a failed bootstrap, but the internet test has
      // not run yet - force it to run immediately!
      this.#internetTest.test();
      // Return from this call, because the Internet test's callback will call
      // us again.
      return;
    }
    // Do not transition to the offline error until we are sure that also the
    // bootstrap failed, in case Moat is down but the bootstrap can proceed
    // anyway.
    if (!this.#bootstrapError) {
      return;
    }
    if (this.#internetTest.status === InternetStatus.Offline) {
      this.changeState(
        TorConnectState.Error,
        new TorConnectError(TorConnectError.Offline)
      );
    } else {
      // Give priority to the bootstrap error, in case the Internet test fails
      TorConnect._hasBootstrapEverFailed = true;
      this.changeState(
        TorConnectState.Error,
        new TorConnectError(
          TorConnectError.BootstrapError,
          this.#bootstrapError
        )
      );
    }
  }

  async #simulateCensorship() {
    // debug hook to simulate censorship preventing bootstrapping
    const censorshipLevel = Services.prefs.getIntPref(
      TorConnectPrefs.censorship_level,
      0
    );
    if (censorshipLevel <= 0) {
      return false;
    }

    await debugSleep(1500);
    if (this.transitioning) {
      // Already left this state.
      return true;
    }
    TorConnect._hasBootstrapEverFailed = true;
    if (censorshipLevel === 2) {
      const codes = Object.keys(TorConnect._countryNames);
      TorConnect._detectedLocation =
        codes[Math.floor(Math.random() * codes.length)];
    }
    const err = new Error("Censorship simulation");
    err.phase = "conn";
    err.reason = "noroute";
    this.changeState(
      TorConnectState.Error,
      new TorConnectError(TorConnectError.BootstrapError, err)
    );
    return true;
  }
}

class AutoBootstrappingState extends StateCallback {
  #moat;
  #settings;
  #changedSettings = false;
  #transitionPromise;
  #transitionResolve;

  allowedTransitions = Object.freeze([
    TorConnectState.Configuring,
    TorConnectState.Bootstrapped,
    TorConnectState.Error,
  ]);

  constructor() {
    super(TorConnectState.AutoBootstrapping);
    this.#transitionPromise = new Promise(resolve => {
      this.#transitionResolve = resolve;
    });
  }

  async run(countryCode) {
    if (await this.#simulateCensorship(countryCode)) {
      return;
    }
    await this.#initMoat();
    if (this.transitioning) {
      return;
    }
    await this.#fetchSettings(countryCode);
    if (this.transitioning) {
      return;
    }
    await this.#trySettings();
  }

  /**
   * Simulate a censorship event, if needed.
   *
   * @param {string} countryCode The country code passed to the state
   * @returns {Promise<boolean>} true if we are simulating the censorship and
   * the bootstrap should stop immediately, or false if the bootstrap should
   * continue normally.
   */
  async #simulateCensorship(countryCode) {
    const censorshipLevel = Services.prefs.getIntPref(
      TorConnectPrefs.censorship_level,
      0
    );
    if (censorshipLevel <= 0) {
      return false;
    }

    // Very severe censorship: always fail even after manually selecting
    // location specific settings.
    if (censorshipLevel === 3) {
      await debugSleep(2500);
      if (!this.transitioning) {
        this.changeState(
          TorConnectState.Error,
          new TorConnectError(TorConnectError.AllSettingsFailed)
        );
      }
      return true;
    }

    // Severe censorship: only fail after auto selecting, but succeed after
    // manually selecting a country.
    if (censorshipLevel === 2 && !countryCode) {
      await debugSleep(2500);
      if (!this.transitioning) {
        this.changeState(
          TorConnectState.Error,
          new TorConnectError(TorConnectError.CannotDetermineCountry)
        );
      }
      return true;
    }

    return false;
  }

  /**
   * Initialize the MoatRPC to communicate with the backend.
   */
  async #initMoat() {
    this.#moat = new lazy.MoatRPC();
    // We need to wait Moat's initialization even when we are requested to
    // transition to another state to be sure its uninit will have its intended
    // effect. So, do not use Promise.race here.
    await this.#moat.init();
  }

  /**
   * Lookup user's potential censorship circumvention settings from Moat
   * service.
   */
  async #fetchSettings(countryCode) {
    // For now, throw any errors we receive from the backend, except when it was
    // unable to detect user's country/region.
    // If we use specialized error objects, we could pass the original errors to
    // them.
    const maybeSettings = await Promise.race([
      this.#moat.circumvention_settings(
        [...lazy.TorSettings.builtinBridgeTypes, "vanilla"],
        countryCode
      ),
      // This might set maybeSettings to undefined.
      this.#transitionPromise,
    ]);
    if (maybeSettings?.country) {
      TorConnect._detectedLocation = maybeSettings.country;
    }

    if (maybeSettings?.settings && maybeSettings.settings.length) {
      this.#settings = maybeSettings.settings;
    } else if (!this.transitioning) {
      // Keep consistency with the other call.
      this.#settings = await Promise.race([
        this.#moat.circumvention_defaults([
          ...lazy.TorSettings.builtinBridgeTypes,
          "vanilla",
        ]),
        // This might set this.#settings to undefined.
        this.#transitionPromise,
      ]);
    }

    if (!this.#settings?.length && !this.transitioning) {
      if (!TorConnect._detectedLocation) {
        // unable to determine country
        throw new TorConnectError(TorConnectError.CannotDetermineCountry);
      } else {
        // no settings available for country
        throw new TorConnectError(TorConnectError.NoSettingsForCountry);
      }
    }
  }

  /**
   * Try to apply the settings we fetched.
   */
  async #trySettings() {
    // Otherwise, apply each of our settings and try to bootstrap with each.
    for (const [index, currentSetting] of this.#settings.entries()) {
      if (this.transitioning) {
        break;
      }

      lazy.logger.info(
        `Attempting Bootstrap with configuration ${index + 1}/${
          this.#settings.length
        }`
      );

      // Send the new settings directly to the provider. We will save them only
      // if the bootstrap succeeds.
      // FIXME: We should somehow signal TorSettings users that we have set
      // custom settings, and they should not apply theirs until we are done
      // with trying ours.
      // Otherwise, the new settings provided by the user while we were
      // bootstrapping could be the ones that cause the bootstrap to succeed,
      // but we overwrite them (unless we backup the original settings, and then
      // save our new settings only if they have not changed).
      // Another idea (maybe easier to implement) is to disable the settings
      // UI while *any* bootstrap is going on.
      // This is also documented in tor-browser#41921.
      const provider = await lazy.TorProviderBuilder.build();
      this.#changedSettings = true;
      // We need to merge with old settings, in case the user is using a proxy
      // or is behind a firewall.
      await provider.writeSettings({
        ...lazy.TorSettings.getSettings(),
        ...currentSetting,
      });

      // Build out our bootstrap request.
      const bootstrap = new lazy.TorBootstrapRequest();
      bootstrap.onbootstrapstatus = (progress, status) => {
        TorConnect._updateBootstrapProgress(progress, status);
      };
      bootstrap.onbootstraperror = error => {
        lazy.logger.error("Auto-Bootstrap error", error);
      };

      // Begin the bootstrap.
      const success = await Promise.race([
        bootstrap.bootstrap(),
        this.#transitionPromise,
      ]);
      // Either the bootstrap request has finished, or a transition (caused by
      // an error or by user's cancelation) started.
      // However, we cannot be already transitioning in case of success, so if
      // we are we should cancel the current bootstrap.
      // With the current TorProvider, this will set DisableNetwork=1 again,
      // which is what the user wanted if they canceled.
      if (this.transitioning) {
        if (success) {
          lazy.logger.warn(
            "We were already transitioning after a success, we were not expecting this."
          );
        }
        bootstrap.cancel();
        return;
      }
      if (success) {
        // Persist the current settings to preferences.
        lazy.TorSettings.setSettings(currentSetting);
        lazy.TorSettings.saveToPrefs();
        // Do not await `applySettings`. Otherwise this opens up a window of
        // time where the user can still "Cancel" the bootstrap.
        // We are calling `applySettings` just to be on the safe side, but the
        // settings we are passing now should be exactly the same we already
        // passed earlier.
        lazy.TorSettings.applySettings().catch(e =>
          lazy.logger.error("TorSettings.applySettings threw unexpectedly.", e)
        );
        this.changeState(TorConnectState.Bootstrapped);
        return;
      }
    }

    // Only explicitly change state here if something else has not transitioned
    // us.
    if (!this.transitioning) {
      throw new TorConnectError(TorConnectError.AllSettingsFailed);
    }
  }

  transitionRequested() {
    this.#transitionResolve();
  }

  async cleanup(nextState) {
    // No need to await.
    this.#moat?.uninit();
    this.#moat = null;

    if (this.#changedSettings && nextState !== TorConnectState.Bootstrapped) {
      try {
        await lazy.TorSettings.applySettings();
      } catch (e) {
        // We cannot do much if the original settings were bad or
        // if the connection closed, so just report it in the
        // console.
        lazy.logger.warn("Failed to restore original settings.", e);
      }
    }
  }
}

class BootstrappedState extends StateCallback {
  // We may need to leave the bootstrapped state if the tor daemon
  // exits (if it is restarted, we will have to bootstrap again).
  allowedTransitions = Object.freeze([TorConnectState.Configuring]);

  constructor() {
    super(TorConnectState.Bootstrapped);
  }

  run() {
    // Notify observers of bootstrap completion.
    Services.obs.notifyObservers(null, TorConnectTopics.BootstrapComplete);
  }
}

class ErrorState extends StateCallback {
  allowedTransitions = Object.freeze([TorConnectState.Configuring]);

  static #hasEverHappened = false;

  constructor() {
    super(TorConnectState.Error);
    ErrorState.#hasEverHappened = true;
  }

  run(_error) {
    this.changeState(TorConnectState.Configuring);
  }

  static get hasEverHappened() {
    return ErrorState.#hasEverHappened;
  }
}

class DisabledState extends StateCallback {
  // Trap state: no way to leave the Disabled state.
  allowedTransitions = Object.freeze([]);

  constructor() {
    super(TorConnectState.Disabled);
  }

  async run() {
    lazy.logger.debug("Entered the disabled state.");
  }
}

export const InternetStatus = Object.freeze({
  Unknown: -1,
  Offline: 0,
  Online: 1,
});

class InternetTest {
  #enabled;
  #status = InternetStatus.Unknown;
  #error = null;
  #pending = false;
  #canceled = false;
  #timeout = 0;

  constructor() {
    this.#enabled = Services.prefs.getBoolPref(
      TorConnectPrefs.allow_internet_test,
      true
    );
    if (this.#enabled) {
      this.#timeout = setTimeout(() => {
        this.#timeout = 0;
        this.test();
      }, this.#timeoutRand());
    }
    this.onResult = _online => {};
    this.onError = _error => {};
  }

  /**
   * Perform the internet test.
   *
   * While this is an async method, the callers are not expected to await it,
   * as we are also using callbacks.
   */
  async test() {
    if (this.#pending || !this.#enabled) {
      return;
    }
    this.cancel();
    this.#pending = true;
    this.#canceled = false;

    lazy.logger.info("Starting the Internet test");
    const mrpc = new lazy.MoatRPC();
    try {
      await mrpc.init();
      const status = await mrpc.testInternetConnection();
      this.#status = status.successful
        ? InternetStatus.Online
        : InternetStatus.Offline;
      // TODO: We could consume the date we got from the HTTP request to detect
      // big clock skews that might prevent a successfull bootstrap.
      lazy.logger.info(`Performed Internet test, outcome ${this.#status}`);
    } catch (err) {
      lazy.logger.error("Error while checking the Internet connection", err);
      this.#error = err;
      this.#pending = false;
    } finally {
      mrpc.uninit();
    }

    if (this.#canceled) {
      return;
    }
    if (this.#error) {
      this.onError(this.#error);
    } else {
      this.onResult(this.#status);
    }
  }

  cancel() {
    this.#canceled = true;
    if (this.#timeout) {
      clearTimeout(this.#timeout);
      this.#timeout = 0;
    }
  }

  get status() {
    return this.#status;
  }

  get error() {
    return this.#error;
  }

  get enabled() {
    return this.#enabled;
  }

  // We randomize the Internet test timeout to make fingerprinting it harder, at
  // least a little bit...
  #timeoutRand() {
    const offset = 30000;
    const randRange = 5000;
    return offset + randRange * (Math.random() * 2 - 1);
  }
}

export const TorConnect = {
  _stateHandler: new InitialState(),
  _bootstrapProgress: 0,
  _internetStatus: InternetStatus.Unknown,
  // list of country codes Moat has settings for
  _countryCodes: [],
  _countryNames: Object.freeze(
    (() => {
      const codes = Services.intl.getAvailableLocaleDisplayNames("region");
      const names = Services.intl.getRegionDisplayNames(undefined, codes);
      let codesNames = {};
      for (let i = 0; i < codes.length; i++) {
        codesNames[codes[i]] = names[i];
      }
      return codesNames;
    })()
  ),
  _detectedLocation: "",
  _errorCode: null,
  _errorDetails: null,
  _logHasWarningOrError: false,
  _hasBootstrapEverFailed: false,
  _transitionPromise: null,

  // This is used as a helper to make the state of about:torconnect persistent
  // during a session, but TorConnect does not use this data at all.
  _uiState: {},

  _stateCallbacks: Object.freeze(
    new Map([
      // Initial is never transitioned to
      [TorConnectState.Initial, InitialState],
      [TorConnectState.Configuring, ConfiguringState],
      [TorConnectState.Bootstrapping, BootstrappingState],
      [TorConnectState.AutoBootstrapping, AutoBootstrappingState],
      [TorConnectState.Bootstrapped, BootstrappedState],
      [TorConnectState.Error, ErrorState],
      [TorConnectState.Disabled, DisabledState],
    ])
  ),

  _makeState(state) {
    const klass = this._stateCallbacks.get(state);
    if (!klass) {
      throw new Error(`${state} is not a valid state.`);
    }
    return new klass();
  },

  async _changeState(newState, ...args) {
    if (this._stateHandler.transitioning) {
      // Avoid an exception to prevent it to be propagated to the original
      // begin call.
      lazy.logger.warn("Already transitioning");
      return;
    }
    const prevState = this._stateHandler;

    // ensure this is a valid state transition
    if (!prevState.allowedTransitions.includes(newState)) {
      throw Error(
        `TorConnect: Attempted invalid state transition from ${prevState.state} to ${newState}`
      );
    }

    lazy.logger.trace(
      `Try transitioning from ${prevState.state} to ${newState}`,
      args
    );
    try {
      await prevState.end(newState);
    } catch (e) {
      // We take for granted that the begin of this state will call us again,
      // to request the transition to the error state.
      if (newState !== TorConnectState.Error) {
        lazy.logger.debug(
          `Refusing the transition from ${prevState.state} to ${newState} because the previous state threw.`
        );
        return;
      }
    }

    // Set our new state first so that state transitions can themselves
    // trigger a state transition.
    this._stateHandler = this._makeState(newState);

    // Error signal needs to be sent out before we enter the Error state.
    // Expected on android `onBootstrapError` to set lastKnownError.
    // Expected in about:torconnect to set the error codes and internet status
    // *before* the StateChange signal.
    if (newState === TorConnectState.Error) {
      let error = args[0];
      if (!(error instanceof TorConnectError)) {
        error = new TorConnectError(TorConnectError.ExternalError, error);
      }
      TorConnect._errorCode = error.code;
      TorConnect._errorDetails = error;
      lazy.logger.error(`Entering error state (${error.code})`, error);

      Services.obs.notifyObservers(error, TorConnectTopics.Error);
    }

    Services.obs.notifyObservers(
      { state: newState },
      TorConnectTopics.StateChange
    );
    this._stateHandler.begin(...args);
  },

  _updateBootstrapProgress(progress, status) {
    this._bootstrapProgress = progress;

    lazy.logger.info(
      `Bootstrapping ${this._bootstrapProgress}% complete (${status})`
    );
    Services.obs.notifyObservers(
      {
        progress: TorConnect._bootstrapProgress,
        hasWarnings: TorConnect._logHasWarningOrError,
      },
      TorConnectTopics.BootstrapProgress
    );
  },

  // init should be called by TorStartupService
  init() {
    lazy.logger.debug("TorConnect.init()");
    this._stateHandler.begin();

    if (!this.enabled) {
      // Disabled
      this._changeState(TorConnectState.Disabled);
    } else {
      let observeTopic = addTopic => {
        Services.obs.addObserver(this, addTopic);
        lazy.logger.debug(`Observing topic '${addTopic}'`);
      };

      // Wait for TorSettings, as we will need it.
      // We will wait for a TorProvider only after TorSettings is ready,
      // because the TorProviderBuilder initialization might not have finished
      // at this point, and TorSettings initialization is a prerequisite for
      // having a provider.
      // So, we prefer initializing TorConnect as soon as possible, so that
      // the UI will be able to detect it is in the Initializing state and act
      // consequently.
      lazy.TorSettings.initializedPromise.then(() =>
        this._settingsInitialized()
      );

      // register the Tor topics we always care about
      observeTopic(lazy.TorProviderTopics.ProcessExited);
      observeTopic(lazy.TorProviderTopics.HasWarnOrErr);
    }
  },

  async observe(subject, topic) {
    lazy.logger.debug(`Observed ${topic}`);

    switch (topic) {
      case lazy.TorProviderTopics.HasWarnOrErr: {
        this._logHasWarningOrError = true;
        break;
      }
      case lazy.TorProviderTopics.ProcessExited: {
        // Treat a failure as a possibly broken configuration.
        // So, prevent quickstart at the next start.
        Services.prefs.setBoolPref(TorLauncherPrefs.prompt_at_startup, true);
        switch (this.state) {
          case TorConnectState.Bootstrapping:
          case TorConnectState.AutoBootstrapping:
          case TorConnectState.Bootstrapped:
            // If we are in the bootstrap or auto bootstrap, we could go
            // through the error phase (and eventually we might do it, if some
            // transition calls fail). However, this would start the
            // connection assist, so we go directly to configuring.
            // FIXME: Find a better way to handle this.
            this._changeState(TorConnectState.Configuring);
            break;
          // Other states naturally resolve in configuration.
        }
        break;
      }
      default:
        // ignore
        break;
    }
  },

  async _settingsInitialized() {
    // TODO: Handle failures here, instead of the prompt to restart the
    // daemon when it exits (tor-browser#21053, tor-browser#41921).
    await lazy.TorProviderBuilder.build();

    // tor-browser#41907: This is only a workaround to avoid users being
    // bounced back to the initial panel without any explanation.
    // Longer term we should disable the clickable elements, or find a UX
    // to prevent this from happening (e.g., allow buttons to be clicked,
    // but show an intermediate starting state, or a message that tor is
    // starting while the butons are disabled, etc...).
    // Notice that currently the initial state does not do anything.
    // Instead of just waiting, we could move this code in its callback.
    // See also tor-browser#41921.
    if (this.state !== TorConnectState.Initial) {
      lazy.logger.warn(
        "The TorProvider was built after the state had already changed."
      );
      return;
    }
    lazy.logger.debug("The TorProvider is ready, changing state.");
    if (this.shouldQuickStart) {
      // Quickstart
      this._changeState(TorConnectState.Bootstrapping);
    } else {
      // Configuring
      this._changeState(TorConnectState.Configuring);
    }
  },

  /*
    Various getters
   */

  /**
   * Whether TorConnect is enabled.
   *
   * @type {boolean}
   */
  get enabled() {
    // FIXME: This is called before the TorProvider is ready.
    // As a matter of fact, at the moment it is equivalent to the following
    // line, but this might become a problem in the future.
    return lazy.TorLauncherUtil.shouldStartAndOwnTor;
  },

  get shouldShowTorConnect() {
    // TorBrowser must control the daemon
    return (
      this.enabled &&
      // if we have succesfully bootstraped, then no need to show TorConnect
      this.state !== TorConnectState.Bootstrapped
    );
  },

  /**
   * Whether bootstrapping can currently begin.
   *
   * The value may change with TorConnectTopics.StateChanged.
   *
   * @param {boolean}
   */
  get canBeginBootstrap() {
    return this._stateHandler.allowedTransitions.includes(
      TorConnectState.Bootstrapping
    );
  },

  /**
   * Whether auto-bootstrapping can currently begin.
   *
   * The value may change with TorConnectTopics.StateChanged.
   *
   * @param {boolean}
   */
  get canBeginAutoBootstrap() {
    return this._stateHandler.allowedTransitions.includes(
      TorConnectState.AutoBootstrapping
    );
  },

  get shouldQuickStart() {
    // quickstart must be enabled
    return (
      lazy.TorSettings.quickstart.enabled &&
      // and the previous bootstrap attempt must have succeeded
      !Services.prefs.getBoolPref(TorLauncherPrefs.prompt_at_startup, true)
    );
  },

  get state() {
    return this._stateHandler.state;
  },

  get bootstrapProgress() {
    return this._bootstrapProgress;
  },

  get internetStatus() {
    return this._internetStatus;
  },

  get countryCodes() {
    return this._countryCodes;
  },

  get countryNames() {
    return this._countryNames;
  },

  get detectedLocation() {
    return this._detectedLocation;
  },

  get errorCode() {
    return this._errorCode;
  },

  get errorDetails() {
    return this._errorDetails;
  },

  get logHasWarningOrError() {
    return this._logHasWarningOrError;
  },

  /**
   * Whether we have ever entered the Error state.
   *
   * @type {boolean}
   */
  get hasEverFailed() {
    return ErrorState.hasEverHappened;
  },

  /**
   * Whether the Bootstrapping process has ever failed, not including when it
   * failed due to not being connected to the internet.
   *
   * This does not include a failure in AutoBootstrapping.
   *
   * @type {boolean}
   */
  get potentiallyBlocked() {
    return this._hasBootstrapEverFailed;
  },

  get uiState() {
    return this._uiState;
  },
  set uiState(newState) {
    this._uiState = newState;
  },

  /*
    These functions allow external consumers to tell TorConnect to transition states
   */

  beginBootstrap() {
    lazy.logger.debug("TorConnect.beginBootstrap()");
    this._changeState(TorConnectState.Bootstrapping);
  },

  cancelBootstrap() {
    lazy.logger.debug("TorConnect.cancelBootstrap()");
    if (
      this.state !== TorConnectState.AutoBootstrapping &&
      this.state !== TorConnectState.Bootstrapping
    ) {
      lazy.logger.warn(
        `Cannot cancel bootstrapping in the ${this.state} state`
      );
      return;
    }
    this._changeState(TorConnectState.Configuring);
  },

  beginAutoBootstrap(countryCode) {
    lazy.logger.debug("TorConnect.beginAutoBootstrap()");
    this._changeState(TorConnectState.AutoBootstrapping, countryCode);
  },

  /*
    Further external commands and helper methods
   */
  openTorPreferences() {
    const win = lazy.BrowserWindowTracker.getTopWindow();
    win.switchToTabHavingURI("about:preferences#connection", true);
  },

  /**
   * Open the "about:torconnect" tab.
   *
   * Bootstrapping or AutoBootstrapping can also be automatically triggered at
   * the same time, if the current state allows for it.
   *
   * Bootstrapping will not be triggered if the connection is
   * potentially blocked.
   *
   * @param {object} [options] - extra options.
   * @property {boolean} [options.beginBootstrap=false] - Whether to try and
   *   begin Bootstrapping.
   * @property {string} [options.beginAutoBootstrap] - The location to use to
   *   begin AutoBootstrapping, if possible.
   */
  openTorConnect(options) {
    // FIXME: Should we move this to the about:torconnect actor?
    const win = lazy.BrowserWindowTracker.getTopWindow();
    win.switchToTabHavingURI("about:torconnect", true, {
      ignoreQueryString: true,
    });
    if (
      options?.beginBootstrap &&
      this.canBeginBootstrap &&
      !this.potentiallyBlocked
    ) {
      this.beginBootstrap();
    }
    // options.beginAutoBootstrap can be an empty string.
    if (
      options?.beginAutoBootstrap !== undefined &&
      this.canBeginAutoBootstrap
    ) {
      this.beginAutoBootstrap(options.beginAutoBootstrap);
    }
  },

  viewTorLogs() {
    const win = lazy.BrowserWindowTracker.getTopWindow();
    win.switchToTabHavingURI("about:preferences#connection-viewlogs", true);
  },

  async getCountryCodes() {
    // Difference with the getter: this is to be called by TorConnectParent, and
    // downloads the country codes if they are not already in cache.
    if (this._countryCodes.length) {
      return this._countryCodes;
    }
    const mrpc = new lazy.MoatRPC();
    try {
      await mrpc.init();
      this._countryCodes = await mrpc.circumvention_countries();
    } catch (err) {
      lazy.logger.error("An error occurred while fetching country codes", err);
    } finally {
      mrpc.uninit();
    }
    return this._countryCodes;
  },

  getRedirectURL(url) {
    return `about:torconnect?redirect=${encodeURIComponent(url)}`;
  },

  /**
   * Convert the given object into a list of valid URIs.
   *
   * The object is either from the user's homepage preference (which may
   * contain multiple domains separated by "|") or uris passed to the browser
   * via command-line.
   *
   * @param {string|string[]} uriVariant - The string to extract uris from.
   *
   * @return {string[]} - The array of uris found.
   */
  fixupURIs(uriVariant) {
    let uriArray;
    if (typeof uriVariant === "string") {
      uriArray = uriVariant.split("|");
    } else if (
      Array.isArray(uriVariant) &&
      uriVariant.every(entry => typeof entry === "string")
    ) {
      uriArray = uriVariant;
    } else {
      // about:tor as safe fallback
      lazy.logger.error(
        `Received unknown variant '${JSON.stringify(uriVariant)}'`
      );
      uriArray = ["about:tor"];
    }

    // Attempt to convert user-supplied string to a uri, fallback to
    // about:tor if cannot convert to valid uri object
    return uriArray.map(
      uriString =>
        Services.uriFixup.getFixupURIInfo(
          uriString,
          Ci.nsIURIFixup.FIXUP_FLAG_NONE
        ).preferredURI?.spec ?? "about:tor"
    );
  },

  // called from browser.js on browser startup, passed in either the user's homepage(s)
  // or uris passed via command-line; we want to replace them with about:torconnect uris
  // which redirect after bootstrapping
  getURIsToLoad(uriVariant) {
    const uris = this.fixupURIs(uriVariant);
    lazy.logger.debug(`Will load after bootstrap => [${uris.join(", ")}]`);
    return uris.map(uri => this.getRedirectURL(uri));
  },
};
