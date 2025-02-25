/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { setTimeout, clearTimeout } from "resource://gre/modules/Timer.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  MoatRPC: "resource://gre/modules/Moat.sys.mjs",
  TorBootstrapRequest: "resource://gre/modules/TorBootstrapRequest.sys.mjs",
  TorProviderTopics: "resource://gre/modules/TorProviderBuilder.sys.mjs",
  TorLauncherUtil: "resource://gre/modules/TorLauncherUtil.sys.mjs",
  TorSettings: "resource://gre/modules/TorSettings.sys.mjs",
  TorSettingsTopics: "resource://gre/modules/TorSettings.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "NetworkLinkService", () => {
  return Cc["@mozilla.org/network/network-link-service;1"].getService(
    Ci.nsINetworkLinkService
  );
});

const NETWORK_LINK_TOPIC = "network:link-status-changed";

const TorConnectPrefs = Object.freeze({
  censorship_level: "torbrowser.debug.censorship_level",
  log_level: "torbrowser.bootstrap.log_level",
  /* prompt_at_startup now controls whether the quickstart can trigger. */
  prompt_at_startup: "extensions.torlauncher.prompt_at_startup",
  quickstart: "torbrowser.settings.quickstart.enabled",
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

/* Topics Notified by the TorConnect module */
export const TorConnectTopics = Object.freeze({
  StageChange: "torconnect:stage-change",
  // TODO: Remove torconnect:state-change when pages have switched to stage.
  StateChange: "torconnect:state-change",
  QuickstartChange: "torconnect:quickstart-change",
  InternetStatusChange: "torconnect:internet-status-change",
  BootstrapProgress: "torconnect:bootstrap-progress",
  BootstrapComplete: "torconnect:bootstrap-complete",
  // TODO: Remove torconnect:error when pages have switched to stage.
  Error: "torconnect:error",
});

/**
 * @callback ProgressCallback
 *
 * @param {integer} progress - The progress percent.
 */
/**
 * @typedef {object} BootstrapOptions
 *
 * Options for a bootstrap attempt.
 *
 * @property {boolean} [options.simulateCensorship] - Whether to simulate a
 *   failing bootstrap.
 * @property {integer} [options.simulateDelay] - The delay in microseconds to
 *   apply to simulated bootstraps.
 * @property {MoatSettings} [options.simulateMoatResponse] - Simulate a Moat
 *   response for circumvention settings. Should include a "bridgesList"
 *   property, and optionally a "country" property. The "bridgesList" property
 *   should be an Array of MoatBridges objects that match the bridge settings
 *   accepted by TorSettings.bridges, plus you may add a "simulateCensorship"
 *   property to make only their bootstrap attempts fail.
 * @property {string} [options.regionCode] - The region code to use to fetch
 *   auto-bootstrap settings, or "automatic" to automatically choose the region.
 */
/**
 * @typedef {object} BootstrapResult
 *
 * The result of a bootstrap attempt.
 *
 * @property {string} [result] - The bootstrap result.
 * @property {Error} [error] - An error from the attempt.
 */
/**
 * @callback ResolveBootstrap
 *
 * Resolve a bootstrap attempt.
 *
 * @param {BootstrapResult} - The result, or error.
 */

/**
 * Each instance can be used to attempt one bootstrapping.
 */
class BootstrapAttempt {
  /**
   * The ongoing bootstrap request.
   *
   * @type {?TorBootstrapRequest}
   */
  #bootstrap = null;
  /**
   * The method to call to complete the `run` promise.
   *
   * @type {?ResolveBootstrap}
   */
  #resolveRun = null;
  /**
   * Whether the `run` promise has been, or is about to be, resolved.
   *
   * @type {boolean}
   */
  #resolved = false;
  /**
   * Whether a cancel request has been started.
   *
   * @type {boolean}
   */
  #cancelled = false;

  /**
   * Run a bootstrap attempt.
   *
   * @param {ProgressCallback} progressCallback - The callback to invoke with
   *   the bootstrap progress.
   * @param {BootstrapOptions} options - Options to apply to the bootstrap.
   *
   * @return {Promise<string, Error>} - The result of the bootstrap.
   */
  run(progressCallback, options) {
    const { promise, resolve, reject } = Promise.withResolvers();
    this.#resolveRun = arg => {
      if (this.#resolved) {
        // Already been called once.
        if (arg.error) {
          lazy.logger.error("Delayed bootstrap error", arg.error);
        }
        return;
      }
      this.#resolved = true;
      if (arg.error) {
        reject(arg.error);
      } else {
        resolve(arg.result);
      }
    };
    try {
      this.#runInternal(progressCallback, options);
    } catch (error) {
      this.#resolveRun({ error });
    }

    return promise;
  }

  /**
   * Method to call just after the Bootstrapped stage is set in response to this
   * bootstrap attempt.
   */
  postBootstrapped() {
    // Nothing to do.
  }

  /**
   * Run the attempt.
   *
   * @param {ProgressCallback} progressCallback - The callback to invoke with
   *   the bootstrap progress.
   * @param {BootstrapOptions} options - Options to apply to the bootstrap.
   */
  #runInternal(progressCallback, options) {
    if (options.simulateCensorship) {
      // Create a fake request.
      this.#bootstrap = {
        _timeout: 0,
        bootstrap() {
          this._timeout = setTimeout(() => {
            const err = new Error("Censorship simulation");
            err.phase = "conn";
            err.reason = "noroute";
            this.onbootstraperror(err);
          }, options.simulateDelay || 0);
        },
        cancel() {
          clearTimeout(this._timeout);
        },
      };
    } else {
      this.#bootstrap = new lazy.TorBootstrapRequest();
    }

    this.#bootstrap.onbootstrapstatus = (progress, _status) => {
      if (!this.#resolved) {
        progressCallback(progress);
      }
    };
    this.#bootstrap.onbootstrapcomplete = () => {
      this.#resolveRun({ result: "complete" });
    };
    this.#bootstrap.onbootstraperror = error => {
      if (this.#resolved || this.#cancelled) {
        // We ignore this error since it occurred after cancelling (by the
        // user), or we have already resolved. We assume the error is just a
        // side effect of the cancelling.
        // E.g. If the cancelling is triggered late in the process, we get
        // "Building circuits: Establishing a Tor circuit failed".
        // TODO: Maybe move this logic deeper in the process to know when to
        // filter out such errors triggered by cancelling.
        lazy.logger.warn("Post-complete bootstrap error.", error);
        return;
      }

      this.#resolveRun({
        error: new TorConnectError(TorConnectError.BootstrapError, error),
      });
    };

    this.#bootstrap.bootstrap();
  }

  /**
   * Cancel the bootstrap attempt.
   */
  async cancel() {
    if (this.#cancelled) {
      lazy.logger.warn(
        "Cancelled bootstrap after it has already been cancelled"
      );
      return;
    }
    this.#cancelled = true;
    if (this.#resolved) {
      lazy.logger.warn("Cancelled bootstrap after it has already resolved");
      return;
    }
    // Wait until after #bootstrap.cancel returns before we resolve with
    // cancelled. In particular:
    // + there is a small chance that the bootstrap completes, in which case we
    //   want to be able to resolve with a success instead.
    // + we want to make sure that we only resolve this BootstrapAttempt
    //   when the current TorBootstrapRequest instance is fully resolved so
    //   there are never two competing instances.
    await this.#bootstrap?.cancel();
    this.#resolveRun({ result: "cancelled" });
  }
}

/**
 * Each instance can be used to attempt one auto-bootstrapping sequence.
 */
class AutoBootstrapAttempt {
  /**
   * The current bootstrap attempt, if any.
   *
   * @type {?BootstrapAttempt}
   */
  #bootstrapAttempt = null;
  /**
   * The method to call to complete the `run` promise.
   *
   * @type {?ResolveBootstrap}
   */
  #resolveRun = null;
  /**
   * Whether the `run` promise has been, or is about to be, resolved.
   *
   * @type {boolean}
   */
  #resolved = false;
  /**
   * Whether a cancel request has been started.
   *
   * @type {boolean}
   */
  #cancelled = false;
  /**
   * The method to call when the cancelled value is set to true.
   *
   * @type {?Function}
   */
  #resolveCancelled = null;
  /**
   * A promise that resolves when the cancelled value is set to true. We can use
   * this with Promise.race to end early when the user cancels.
   *
   * @type {?Promise}
   */
  #cancelledPromise = null;
  /**
   * The list of bridge configurations from Moat.
   *
   * @type {?MoatBridges[]}
   */
  #bridgesList = null;
  /**
   * The detected region code returned by Moat, if any.
   *
   * @type {?string}
   */
  detectedRegion = null;

  /**
   * Run an auto-bootstrap attempt.
   *
   * @param {ProgressCallback} progressCallback - The callback to invoke with
   *   the bootstrap progress.
   * @param {BootstrapOptions} options - Options to apply to the bootstrap.
   *
   * @return {Promise<string, Error>} - The result of the bootstrap.
   */
  run(progressCallback, options) {
    const { promise, resolve, reject } = Promise.withResolvers();

    this.#resolveRun = async arg => {
      if (this.#resolved) {
        // Already been called once.
        if (arg.error) {
          lazy.logger.error("Delayed auto-bootstrap error", arg.error);
        }
        return;
      }
      this.#resolved = true;

      if (lazy.TorSettings.initialized) {
        // If not initialized, then we won't have applied any settings.
        try {
          // Run cleanup before we resolve the promise to ensure two instances
          // of AutoBootstrapAttempt are not trying to change the settings at
          // the same time.
          if (arg.result !== "complete") {
            // Should do nothing if we never called applyTemporaryBridges.
            await lazy.TorSettings.clearTemporaryBridges();
          }
        } catch (error) {
          lazy.logger.error(
            "Unexpected error in auto-bootstrap cleanup",
            error
          );
        }
      }
      if (arg.error) {
        reject(arg.error);
      } else {
        resolve(arg.result);
      }
    };

    ({ promise: this.#cancelledPromise, resolve: this.#resolveCancelled } =
      Promise.withResolvers());

    this.#runInternal(progressCallback, options).catch(error => {
      this.#resolveRun({ error });
    });

    return promise;
  }

  /**
   * Method to call just after the Bootstrapped stage is set in response to this
   * bootstrap attempt.
   */
  postBootstrapped() {
    // Persist the current settings to preferences.
    lazy.TorSettings.saveTemporaryBridges();
  }

  /**
   * Run the attempt.
   *
   * Note, this is an async method, but should *not* be awaited by the `run`
   * method.
   *
   * @param {ProgressCallback} progressCallback - The callback to invoke with
   *   the bootstrap progress.
   * @param {BootstrapOptions} options - Options to apply to the bootstrap.
   */
  async #runInternal(progressCallback, options) {
    // Wait for TorSettings to be initialised, which is used for the
    // AutoBootstrapping set up.
    await Promise.race([
      lazy.TorSettings.initializedPromise,
      this.#cancelledPromise,
    ]);
    if (this.#cancelled || this.#resolved) {
      return;
    }

    await this.#fetchBridges(options);
    if (this.#cancelled || this.#resolved) {
      return;
    }

    if (!this.#bridgesList?.length) {
      this.#resolveRun({
        error: new TorConnectError(
          options.regionCode === "automatic" && !this.detectedRegion
            ? TorConnectError.CannotDetermineCountry
            : TorConnectError.NoSettingsForCountry
        ),
      });
    }

    // Apply each of our settings and try to bootstrap with each.
    for (const [index, bridges] of this.#bridgesList.entries()) {
      lazy.logger.info(
        `Attempting Bootstrap with configuration ${index + 1}/${
          this.#bridgesList.length
        }`
      );

      await this.#tryBridges(bridges, progressCallback, options);

      if (this.#cancelled || this.#resolved) {
        return;
      }
    }

    this.#resolveRun({
      error: new TorConnectError(TorConnectError.AllSettingsFailed),
    });
  }

  /**
   * Lookup user's potential censorship circumvention settings from Moat
   * service.
   *
   * @param {BootstrapOptions} options - Options to apply to the bootstrap.
   */
  async #fetchBridges(options) {
    if (options.simulateMoatResponse) {
      await Promise.race([
        new Promise(res => setTimeout(res, options.simulateDelay || 0)),
        this.#cancelledPromise,
      ]);

      if (this.#cancelled || this.#resolved) {
        return;
      }

      this.detectedRegion = options.simulateMoatResponse.country || null;
      this.#bridgesList = options.simulateMoatResponse.bridgesList ?? null;

      return;
    }

    const moat = new lazy.MoatRPC();
    try {
      // We need to wait Moat's initialization even when we are requested to
      // transition to another state to be sure its uninit will have its
      // intended effect. So, do not use Promise.race here.
      await moat.init();

      if (this.#cancelled || this.#resolved) {
        return;
      }

      let moatAbortController = new AbortController();
      // For now, throw any errors we receive from the backend, except when it
      // was unable to detect user's country/region.
      // If we use specialized error objects, we could pass the original errors
      // to them.
      const maybeSettings = await Promise.race([
        moat.circumvention_settings(
          [...lazy.TorSettings.builtinBridgeTypes, "vanilla"],
          options.regionCode === "automatic" ? null : options.regionCode,
          moatAbortController.signal
        ),
        // This might set maybeSettings to undefined.
        this.#cancelledPromise,
      ]);
      if (this.#cancelled) {
        // Ended early due to being cancelled. Abort the ongoing Moat request so
        // that it does not continue unnecessarily in the background.
        // NOTE: We do not care about circumvention_settings return value or
        // errors at this point. Nor do we need to await its return. We just
        // want it to resolve quickly.
        moatAbortController.abort();
      }
      if (this.#cancelled || this.#resolved) {
        return;
      }

      this.detectedRegion = maybeSettings?.country || null;

      if (maybeSettings?.bridgesList?.length) {
        this.#bridgesList = maybeSettings.bridgesList;
      } else {
        // In principle we could reuse the existing moatAbortController
        // instance, since its abort method has not been called. But it is
        // cleaner to use a new instance to avoid triggering any potential
        // lingering callbacks attached to the AbortSignal.
        moatAbortController = new AbortController();
        // Keep consistency with the other call.
        this.#bridgesList = await Promise.race([
          moat.circumvention_defaults(
            [...lazy.TorSettings.builtinBridgeTypes, "vanilla"],
            moatAbortController.signal
          ),
          // This might set this.#bridgesList to undefined.
          this.#cancelledPromise,
        ]);
        if (this.#cancelled) {
          // Ended early due to being cancelled. Abort the ongoing Moat request
          // so that it does not continue in the background.
          moatAbortController.abort();
        }
      }
    } finally {
      // Do not await the uninit.
      moat.uninit();
    }
  }

  /**
   * Try to apply the settings we fetched.
   *
   * @param {MoatBridges} bridges - The bridges to try.
   * @param {ProgressCallback} progressCallback - The callback to invoke with
   *   the bootstrap progress.
   * @param {BootstrapOptions} options - Options to apply to the bootstrap.
   */
  async #tryBridges(bridges, progressCallback, options) {
    if (this.#cancelled || this.#resolved) {
      return;
    }

    if (options.simulateMoatResponse && bridges.simulateCensorship) {
      // Move the simulateCensorship option to the options for the next
      // BootstrapAttempt.
      bridges = structuredClone(bridges);
      delete bridges.simulateCensorship;
      options = { ...options, simulateCensorship: true };
    }

    // Send the new settings directly to the provider. We will save them only
    // if the bootstrap succeeds.
    await lazy.TorSettings.applyTemporaryBridges(bridges);

    if (this.#cancelled || this.#resolved) {
      return;
    }

    let result;
    try {
      this.#bootstrapAttempt = new BootstrapAttempt();
      // At this stage, cancelling AutoBootstrap will also cancel this
      // bootstrapAttempt.
      result = await this.#bootstrapAttempt.run(progressCallback, options);
    } catch (error) {
      // Only re-try with the next settings *if* we have a BootstrapError.
      // Other errors will end this auto-bootstrap attempt entirely.
      if (
        error instanceof TorConnectError &&
        error.code === TorConnectError.BootstrapError
      ) {
        lazy.logger.info("TorConnect setting failed", bridges, error);
        // Try with the next settings.
        // NOTE: We do not restore the user settings in between these runs.
        // Instead we wait for #resolveRun callback to do so.
        // This means there is a window of time where the setting is applied, but
        // no bootstrap is running.
        return;
      }
      // Pass error up.
      throw error;
    } finally {
      this.#bootstrapAttempt = null;
    }

    if (this.#cancelled || this.#resolved) {
      return;
    }

    // Pass the BootstrapAttempt result up.
    this.#resolveRun({ result });
  }

  /**
   * Cancel the bootstrap attempt.
   */
  async cancel() {
    if (this.#cancelled) {
      lazy.logger.warn(
        "Cancelled auto-bootstrap after it has already been cancelled"
      );
      return;
    }
    this.#cancelled = true;
    this.#resolveCancelled();
    if (this.#resolved) {
      lazy.logger.warn(
        "Cancelled auto-bootstrap after it has already resolved"
      );
      return;
    }

    // Wait until after #bootstrapAttempt.cancel returns before we resolve with
    // cancelled. In particular:
    // + there is a small chance that the bootstrap completes, in which case we
    //   want to be able to resolve with a success instead.
    // + we want to make sure that we only resolve this AutoBootstrapAttempt
    //   when the current TorBootstrapRequest instance is fully resolved so
    //   there are never two competing instances.
    if (this.#bootstrapAttempt) {
      await this.#bootstrapAttempt.cancel();
    }
    // In case no bootstrap is running, we resolve with "cancelled".
    this.#resolveRun({ result: "cancelled" });
  }
}

export const InternetStatus = Object.freeze({
  Unknown: -1,
  Offline: 0,
  Online: 1,
});

export const TorConnectStage = Object.freeze({
  Disabled: "Disabled",
  Loading: "Loading",
  Start: "Start",
  Bootstrapping: "Bootstrapping",
  Offline: "Offline",
  ChooseRegion: "ChooseRegion",
  RegionNotFound: "RegionNotFound",
  ConfirmRegion: "ConfirmRegion",
  FinalError: "FinalError",
  Bootstrapped: "Bootstrapped",
});

/**
 * @typedef {object} ConnectStage
 *
 * A summary of the user stage.
 *
 * @property {string} name - The name of the stage.
 * @property {string} defaultRegion - The default region to show in the UI.
 * @property {?string} bootstrapTrigger - The TorConnectStage prior to this
 *   bootstrap attempt. Only set during the "Bootstrapping" stage.
 * @property {?BootstrapError} error - The last bootstrapping error.
 * @property {boolean} tryAgain - Whether a bootstrap attempt has failed, so
 *   that a normal bootstrap should be shown as "Try Again" instead of
 *   "Connect". NOTE: to be removed when about:torconnect no longer uses
 *   breadcrumbs.
 * @property {boolean} potentiallyBlocked - Whether bootstrapping has ever
 *   failed, not including being cancelled or being offline. I.e. whether we
 *   have reached an error stage at some point before being bootstrapped.
 * @property {BootstrappingStatus} bootstrappingStatus - The current
 *   bootstrapping status.
 */

/**
 * @typedef {object} BootstrappingStatus
 *
 * The status of a bootstrap.
 *
 * @property {number} progress - The percent progress.
 * @property {boolean} hasWarning - Whether this bootstrap has a warning in the
 *   Tor log.
 */

/**
 * @typedef {object} BootstrapError
 *
 * Details about the error that caused bootstrapping to fail.
 *
 * @property {string} code - The error code type.
 * @property {string} message - The error message.
 * @property {?string} phase - The bootstrapping phase that failed.
 * @property {?string} reason - The bootstrapping failure reason.
 */

export const TorConnect = {
  /**
   * Default bootstrap options for simulation.
   *
   * @type {BootstrapOptions}
   */
  simulateBootstrapOptions: {},

  /**
   * Whether to simulate being offline.
   *
   * @type {boolean}
   */
  simulateOffline: false,

  /**
   * The name of the current stage the user is in.
   *
   * @type {string}
   */
  _stageName: TorConnectStage.Loading,

  get stageName() {
    return this._stageName;
  },

  /**
   * The stage that triggered bootstrapping.
   *
   * @type {?string}
   */
  _bootstrapTrigger: null,

  /**
   * The alternative stage that we should move to after bootstrapping completes.
   *
   * @type {?string}
   */
  _requestedStage: null,

  /**
   * The default region to show in the UI for auto-bootstrapping.
   *
   * @type {string}
   */
  _defaultRegion: "automatic",

  /**
   * The current bootstrap attempt, if any.
   *
   * @type {?(BootstrapAttempt|AutoBootstrapAttempt)}
   */
  _bootstrapAttempt: null,

  /**
   * The bootstrap error that was last generated.
   *
   * @type {?TorConnectError}
   */
  _errorDetails: null,

  /**
   * Whether a bootstrap attempt has failed, so that a normal bootstrap should
   * be shown as "Try Again" instead of "Connect".
   *
   * @type {boolean}
   */
  // TODO: Drop tryAgain when we remove breadcrumbs and use "Start again"
  // instead.
  _tryAgain: false,

  /**
   * Whether bootstrapping has ever returned an error.
   *
   * @type {boolean}
   */
  _potentiallyBlocked: false,

  /**
   * Get a summary of the current user stage.
   *
   * @type {ConnectStage}
   */
  get stage() {
    return {
      name: this._stageName,
      defaultRegion: this._defaultRegion,
      bootstrapTrigger: this._bootstrapTrigger,
      error: this._errorDetails
        ? {
            code: this._errorDetails.code,
            message: String(this._errorDetails.message ?? ""),
            phase: this._errorDetails.cause?.phase ?? null,
            reason: this._errorDetails.cause?.reason ?? null,
          }
        : null,
      tryAgain: this._tryAgain,
      potentiallyBlocked: this._potentiallyBlocked,
      bootstrappingStatus: structuredClone(this._bootstrappingStatus),
    };
  },

  /**
   * Promise that resolves to a list of region codes that Moat has special
   * bridge settings for.
   *
   * @type {Promise<string[]>}
   */
  _moatRegionsPromise: null,

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

  /**
   * The status of the most recent bootstrap attempt.
   *
   * @type {BootstrappingStatus}
   */
  _bootstrappingStatus: {
    progress: 0,
    hasWarning: false,
  },

  /**
   * Notify the bootstrap progress.
   */
  _notifyBootstrapProgress() {
    lazy.logger.debug("BootstrappingStatus", this._bootstrappingStatus);
    Services.obs.notifyObservers(
      this._bootstrappingStatus,
      TorConnectTopics.BootstrapProgress
    );
  },

  /**
   * The current internet status. One of the InternetStatus values.
   *
   * @type {integer}
   */
  _internetStatus: InternetStatus.Unknown,

  get internetStatus() {
    return this._internetStatus;
  },

  /**
   * Update the _internetStatus value.
   */
  _updateInternetStatus() {
    let newStatus;
    if (lazy.NetworkLinkService.linkStatusKnown) {
      newStatus = lazy.NetworkLinkService.isLinkUp
        ? InternetStatus.Online
        : InternetStatus.Offline;
    } else {
      newStatus = InternetStatus.Unknown;
    }
    if (newStatus === this._internetStatus) {
      return;
    }
    this._internetStatus = newStatus;
    Services.obs.notifyObservers(null, TorConnectTopics.InternetStatusChange);
  },

  // init should be called by TorStartupService
  init() {
    lazy.logger.debug("TorConnect.init()");

    if (!this.enabled) {
      // Disabled
      this._setStage(TorConnectStage.Disabled);
      return;
    }

    this._moatRegionsPromise = fetch(
      "chrome://global/content/moat_countries.json"
    )
      .then(req => req.json())
      // Filter out the "_comment" object in the moat_countries_dev_build.json
      // file.
      .then(regionList => regionList.filter(r => typeof r === "string"))
      .catch(e => {
        lazy.logger.error("Failed to fetch Moat region codes", e);
        return [];
      });

    let observeTopic = addTopic => {
      Services.obs.addObserver(this, addTopic);
      lazy.logger.debug(`Observing topic '${addTopic}'`);
    };

    // register the Tor topics we always care about
    observeTopic(lazy.TorProviderTopics.ProcessExited);
    observeTopic(lazy.TorProviderTopics.HasWarnOrErr);
    observeTopic(lazy.TorSettingsTopics.SettingsChanged);
    observeTopic(NETWORK_LINK_TOPIC);

    this._updateInternetStatus();

    // NOTE: At this point, _requestedStage should still be `null`.
    this._setStage(TorConnectStage.Start);
    if (
      // Quickstart setting is enabled.
      this.quickstart &&
      // And the previous bootstrap attempt must have succeeded.
      !Services.prefs.getBoolPref(TorConnectPrefs.prompt_at_startup, true)
    ) {
      this.beginBootstrapping();
    }
  },

  async observe(subject, topic) {
    lazy.logger.debug(`Observed ${topic}`);

    switch (topic) {
      case lazy.TorProviderTopics.HasWarnOrErr:
        if (this._bootstrappingStatus.hasWarning) {
          // No change.
          return;
        }
        if (this._stageName === "Bootstrapping") {
          this._bootstrappingStatus.hasWarning = true;
          this._notifyBootstrapProgress();
        }
        break;
      case lazy.TorProviderTopics.ProcessExited:
        lazy.logger.info("Starting again since the tor process exited");
        // Treat a failure as a possibly broken configuration.
        // So, prevent quickstart at the next start.
        Services.prefs.setBoolPref(TorConnectPrefs.prompt_at_startup, true);
        this._makeStageRequest(TorConnectStage.Start, true);
        break;
      case lazy.TorSettingsTopics.SettingsChanged:
        if (
          this._stageName !== TorConnectStage.Bootstrapped &&
          this._stageName !== TorConnectStage.Loading &&
          this._stageName !== TorConnectStage.Start &&
          subject.wrappedJSObject.changes.some(propertyName =>
            propertyName.startsWith("bridges.")
          )
        ) {
          // A change in bridge settings before we are bootstrapped, we reset
          // the stage to Start to:
          // + Cancel any ongoing bootstrap attempt. In particular, we
          //   definitely do not want to continue with an auto-bootstrap's
          //   temporary bridges if the settings have changed.
          // + Reset the UI to be ready for normal bootstrapping in case the
          //   user returns to about:torconnect.
          // See tor-browser#41921.
          // NOTE: We do not reset in response to a change in the quickstart,
          // firewall or proxy settings.
          lazy.logger.warn(
            "Resetting to Start stage since bridge settings changed"
          );
          // Rather than cancel and return to the pre-bootstrap stage, we
          // explicitly cancel and return to the start stage.
          this._makeStageRequest(TorConnectStage.Start);
        }
        break;
      case NETWORK_LINK_TOPIC:
        this._updateInternetStatus();
        break;
    }
  },

  /**
   * Set the user stage.
   *
   * @param {string} name - The name of the stage to move to.
   */
  _setStage(name) {
    if (this._bootstrapAttempt) {
      throw new Error(`Trying to set the stage to ${name} during a bootstrap`);
    }

    lazy.logger.info(`Entering stage ${name}`);
    const prevState = this.state;
    this._stageName = name;
    this._bootstrappingStatus.hasWarning = false;
    this._bootstrappingStatus.progress =
      name === TorConnectStage.Bootstrapped ? 100 : 0;

    Services.obs.notifyObservers(this.stage, TorConnectTopics.StageChange);

    // TODO: Remove when all pages have switched to stage.
    const newState = this.state;
    if (prevState !== newState) {
      Services.obs.notifyObservers(
        { state: newState },
        TorConnectTopics.StateChange
      );
    }

    // Update the progress after the stage has changed.
    this._notifyBootstrapProgress();
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

  /**
   * Whether bootstrapping can begin immediately once Tor Browser has been
   * opened.
   *
   * @type {boolean}
   */
  get quickstart() {
    return Services.prefs.getBoolPref(TorConnectPrefs.quickstart, false);
  },

  set quickstart(enabled) {
    enabled = Boolean(enabled);
    if (enabled === this.quickstart) {
      return;
    }
    Services.prefs.setBoolPref(TorConnectPrefs.quickstart, enabled);
    Services.obs.notifyObservers(null, TorConnectTopics.QuickstartChange);
  },

  get shouldShowTorConnect() {
    // TorBrowser must control the daemon
    return (
      this.enabled &&
      // if we have succesfully bootstraped, then no need to show TorConnect
      this._stageName !== TorConnectStage.Bootstrapped
    );
  },

  /**
   * Whether we are in a stage that can lead into a "normal" bootstrapping
   * request.
   *
   * The value may change with TorConnectTopics.StageChanged.
   *
   * @param {boolean}
   */
  get canBeginNormalBootstrap() {
    return (
      this._stageName === TorConnectStage.Start ||
      this._stageName === TorConnectStage.Offline
    );
  },

  /**
   * Whether we are in an error stage that can lead into the Bootstrapping
   * stage. I.e. whether we can make an "auto" bootstrapping request.
   *
   * The value may change with TorConnectTopics.StageChanged.
   *
   * @param {boolean}
   */
  get canBeginAutoBootstrap() {
    return (
      this._stageName === TorConnectStage.ChooseRegion ||
      this._stageName === TorConnectStage.RegionNotFound ||
      this._stageName === TorConnectStage.ConfirmRegion
    );
  },

  // TODO: Remove when all pages have switched to "stage".
  get state() {
    // There is no "Error" stage, but about:torconnect relies on receiving the
    // Error state to update its display. So we temporarily set the stage for a
    // StateChange signal.
    if (this._isErrorState) {
      return TorConnectState.Error;
    }
    switch (this._stageName) {
      case TorConnectStage.Disabled:
        return TorConnectState.Disabled;
      case TorConnectStage.Loading:
        return TorConnectState.Initial;
      case TorConnectStage.Start:
      case TorConnectStage.Offline:
      case TorConnectStage.ChooseRegion:
      case TorConnectStage.RegionNotFound:
      case TorConnectStage.ConfirmRegion:
      case TorConnectStage.FinalError:
        return TorConnectState.Configuring;
      case TorConnectStage.Bootstrapping:
        if (
          this._bootstrapTrigger === TorConnectStage.Start ||
          this._bootstrapTrigger === TorConnectStage.Offline
        ) {
          return TorConnectState.Bootstrapping;
        }
        return TorConnectState.AutoBootstrapping;
      case TorConnectStage.Bootstrapped:
        return TorConnectState.Bootstrapped;
    }
    lazy.logger.error(`Unknown state at stage ${this._stageName}`);
    return null;
  },

  get countryNames() {
    return this._countryNames;
  },

  /**
   * Whether the Bootstrapping process has ever failed, not including being
   * cancelled or being offline.
   *
   * The value may change with TorConnectTopics.StageChanged.
   *
   * @type {boolean}
   */
  get potentiallyBlocked() {
    return this._potentiallyBlocked;
  },

  /**
   * Ensure that we are not disabled.
   */
  _ensureEnabled() {
    if (!this.enabled || this._stageName === TorConnectStage.Disabled) {
      throw new Error("Unexpected Disabled stage for user method");
    }
  },

  /**
   * Signal an error to listeners.
   *
   * @param {Error} error - The error.
   */
  _signalError(error) {
    // TODO: Replace this method with _setError without any signalling when
    // pages have switched to stage.
    // Currently it simulates the old behaviour for about:torconnect.
    lazy.logger.debug("Signalling error", error);

    if (!(error instanceof TorConnectError)) {
      error = new TorConnectError(TorConnectError.ExternalError, error);
    }
    this._errorDetails = error;

    // Temporarily set an error state for listeners.
    // We send the Error signal before the "StateChange" signal.
    // Expected on android `onBootstrapError` to set lastKnownError.
    // Expected in about:torconnect to set the error codes and internet status
    // *before* the StateChange signal.
    this._isErrorState = true;
    Services.obs.notifyObservers(error, TorConnectTopics.Error);
    Services.obs.notifyObservers(
      { state: this.state },
      TorConnectTopics.StateChange
    );
    this._isErrorState = false;
  },

  /**
   * Add simulation options to the bootstrap request.
   *
   * @param {BootstrapOptions} bootstrapOptions - The options to add to.
   * @param {string} [regionCode] - The region code being used.
   */
  _addSimulateOptions(bootstrapOptions, regionCode) {
    if (this.simulateBootstrapOptions.simulateCensorship) {
      bootstrapOptions.simulateCensorship = true;
    }
    if (this.simulateBootstrapOptions.simulateDelay) {
      bootstrapOptions.simulateDelay =
        this.simulateBootstrapOptions.simulateDelay;
    }
    if (this.simulateBootstrapOptions.simulateMoatResponse) {
      bootstrapOptions.simulateMoatResponse =
        this.simulateBootstrapOptions.simulateMoatResponse;
    }

    const censorshipLevel = Services.prefs.getIntPref(
      TorConnectPrefs.censorship_level,
      0
    );
    if (censorshipLevel > 0 && !bootstrapOptions.simulateDelay) {
      bootstrapOptions.simulateDelay = 1500;
    }
    if (censorshipLevel === 1) {
      // Bootstrap fails, but auto-bootstrap does not.
      if (!regionCode) {
        bootstrapOptions.simulateCensorship = true;
      }
    } else if (censorshipLevel === 2) {
      // Bootstrap fails. Auto-bootstrap fails with ConfirmRegion when using
      // auto-detect region, but succeeds otherwise.
      if (!regionCode) {
        bootstrapOptions.simulateCensorship = true;
      }
      if (regionCode === "automatic") {
        bootstrapOptions.simulateCensorship = true;
        bootstrapOptions.simulateMoatResponse = {
          country: "fi",
          settings: [{}, {}],
        };
      }
    } else if (censorshipLevel === 3) {
      // Bootstrap and auto-bootstrap fail.
      bootstrapOptions.simulateCensorship = true;
      bootstrapOptions.simulateMoatResponse = {
        country: null,
        settings: [],
      };
    }
  },

  /**
   * Confirm that a bootstrapping can take place, and whether the given values
   * are valid.
   *
   * @param {string} [regionCode] - The region code passed in.
   *
   * @return {boolean} whether bootstrapping can proceed.
   */
  _confirmBootstrapping(regionCode) {
    this._ensureEnabled();

    if (this._bootstrapAttempt) {
      lazy.logger.warn(
        "Already have an ongoing bootstrap attempt." +
          ` Ignoring request with ${regionCode}.`
      );
      return false;
    }

    const currentStage = this._stageName;

    if (regionCode) {
      if (!this.canBeginAutoBootstrap) {
        lazy.logger.warn(
          `Cannot begin auto bootstrap in stage ${currentStage}`
        );
        return false;
      }
      if (
        regionCode === "automatic" &&
        currentStage !== TorConnectStage.ChooseRegion
      ) {
        lazy.logger.warn("Auto bootstrap is missing an explicit regionCode");
        return false;
      }
      return true;
    }

    if (!this.canBeginNormalBootstrap) {
      lazy.logger.warn(
        `Cannot begin normal bootstrap in stage ${currentStage}`
      );
      return false;
    }

    return true;
  },

  /**
   * Begin a bootstrap attempt.
   *
   * @param {string} [regionCode] - An optional region code string to use, or
   *   "automatic" to automatically determine the region. If given, will start
   *   an auto-bootstrap attempt.
   */
  async beginBootstrapping(regionCode) {
    lazy.logger.debug("TorConnect.beginBootstrapping()");

    if (!this._confirmBootstrapping(regionCode)) {
      return;
    }

    const beginStage = this._stageName;
    const bootstrapOptions = { regionCode };
    const bootstrapAttempt = regionCode
      ? new AutoBootstrapAttempt()
      : new BootstrapAttempt();

    this._addSimulateOptions(bootstrapOptions, regionCode);

    // NOTE: The only `await` in this method is for `bootstrapAttempt.run`.
    // Moreover, we returned early if `_bootstrapAttempt` was non-`null`.
    // Therefore, the method is effectively "locked" by `_bootstrapAttempt`, so
    // there should only ever be one caller at a time.

    if (regionCode) {
      // Set the default to what the user chose.
      this._defaultRegion = regionCode;
    } else {
      // Reset the default region to show in the UI.
      this._defaultRegion = "automatic";
    }
    this._requestedStage = null;
    this._bootstrapTrigger = beginStage;
    this._setStage(TorConnectStage.Bootstrapping);
    this._bootstrapAttempt = bootstrapAttempt;

    let error = null;
    let result = null;
    try {
      result = await bootstrapAttempt.run(progress => {
        this._bootstrappingStatus.progress = progress;
        lazy.logger.info(`Bootstrapping ${progress}% complete`);
        this._notifyBootstrapProgress();
      }, bootstrapOptions);
    } catch (err) {
      error = err;
    }

    const requestedStage = this._requestedStage;
    this._requestedStage = null;
    this._bootstrapTrigger = null;
    this._bootstrapAttempt = null;

    if (bootstrapAttempt.detectedRegion) {
      this._defaultRegion = bootstrapAttempt.detectedRegion;
    }

    if (result === "complete") {
      // Reset tryAgain, potentiallyBlocked and errorDetails in case the tor
      // process exists later on.
      this._tryAgain = false;
      this._potentiallyBlocked = false;
      this._errorDetails = null;
      // Re-enable quickstart for future sessions.
      Services.prefs.setBoolPref(TorConnectPrefs.prompt_at_startup, false);

      if (requestedStage) {
        lazy.logger.warn(
          `Ignoring ${requestedStage} request since we are bootstrapped`
        );
      }
      this._setStage(TorConnectStage.Bootstrapped);
      Services.obs.notifyObservers(null, TorConnectTopics.BootstrapComplete);

      // Now call the postBootstrapped method. We do this after changing the
      // stage to ensure that AutoBootstrapAttempt.postBootstrapped call to
      // saveTemporaryBridges does not trigger SettingsChanged too early and
      // cancel itself.
      bootstrapAttempt.postBootstrapped();
      return;
    }

    if (requestedStage) {
      lazy.logger.debug("Ignoring bootstrap result", result, error);
      this._setStage(requestedStage);
      return;
    }

    if (error) {
      lazy.logger.info("Bootstrap attempt error", error);
      this._tryAgain = true;

      if (
        (beginStage === TorConnectStage.Start ||
          beginStage === TorConnectStage.Offline) &&
        (this.internetStatus === InternetStatus.Offline || this.simulateOffline)
      ) {
        // If we are currently offline, we assume the bootstrap error is caused
        // by a general internet connection problem, so we show an "Offline"
        // stage instead.
        // NOTE: In principle, we may determine that we are offline prior to the
        // bootstrap being thrown, but we do not want to cancel a bootstrap
        // attempt prematurely in case the offline state is intermittent or
        // incorrect.
        this._signalError(new TorConnectError(TorConnectError.Offline));
        this._setStage(TorConnectStage.Offline);
        return;
      }

      this._potentiallyBlocked = true;
      // Disable quickstart until we have a successful bootstrap.
      Services.prefs.setBoolPref(TorConnectPrefs.prompt_at_startup, true);

      this._signalError(error);

      switch (beginStage) {
        case TorConnectStage.Start:
        case TorConnectStage.Offline:
          this._setStage(TorConnectStage.ChooseRegion);
          return;
        case TorConnectStage.ChooseRegion:
          // TODO: Uncomment for behaviour in tor-browser#42550.
          /*
          if (regionCode !== "automatic") {
            // Not automatic. Go straight to the final error.
            this._setStage(TorConnectStage.FinalError);
            return;
          }
          */
          if (regionCode !== "automatic" || bootstrapAttempt.detectedRegion) {
            this._setStage(TorConnectStage.ConfirmRegion);
            return;
          }
          this._setStage(TorConnectStage.RegionNotFound);
          return;
      }
      this._setStage(TorConnectStage.FinalError);
      return;
    }

    // Bootstrap was cancelled.
    if (result !== "cancelled") {
      lazy.logger.error(`Unexpected bootstrap result`, result);
    }

    // TODO: Remove this Offline hack when pages use "stage".
    if (beginStage === TorConnectStage.Offline) {
      // Re-send the "Offline" error to push the pages back to "Offline".
      this._signalError(new TorConnectError(TorConnectError.Offline));
    }

    // Return to the previous stage.
    this._setStage(beginStage);
  },

  /**
   * Cancel an ongoing bootstrap attempt.
   */
  cancelBootstrapping() {
    lazy.logger.debug("TorConnect.cancelBootstrapping()");

    this._ensureEnabled();

    if (!this._bootstrapAttempt) {
      lazy.logger.warn("No bootstrap attempt to cancel");
      return;
    }

    this._bootstrapAttempt.cancel();
  },

  /**
   * Request the transition to the given stage.
   *
   * If we are bootstrapping, it will be cancelled and the stage will be
   * transitioned to when it resolves. Otherwise, we will switch to the stage
   * immediately.
   *
   * @param {string} stage - The stage to request.
   * @param {boolean} [overideBootstrapped=false] - Whether the request can
   *   override the "Bootstrapped" stage.
   */
  _makeStageRequest(stage, overrideBootstrapped = false) {
    lazy.logger.debug(`Request for stage ${stage}`);

    this._ensureEnabled();

    if (stage === this._stageName) {
      lazy.logger.info(`Ignoring request for current stage ${stage}`);
      return;
    }
    if (
      !overrideBootstrapped &&
      this._stageName === TorConnectStage.Bootstrapped
    ) {
      lazy.logger.warn(`Cannot move to ${stage} when bootstrapped`);
      return;
    }
    if (this._stageName === TorConnectStage.Loading) {
      if (stage === TorConnectStage.Start) {
        // Will transition to "Start" stage when loading completes.
        lazy.logger.info("Still in the Loading stage");
      } else {
        lazy.logger.warn(`Cannot move to ${stage} when Loading`);
      }
      return;
    }

    if (!this._bootstrapAttempt) {
      // Transition immediately.
      this._setStage(stage);
      return;
    }

    if (this._requestedStage === stage) {
      lazy.logger.info(`Already requesting stage ${stage}`);
      return;
    }
    if (this._requestedStage) {
      lazy.logger.warn(
        `Overriding request for ${this._requestedStage} with ${stage}`
      );
    }
    // Move to stage *after* bootstrap completes.
    this._requestedStage = stage;
    this._bootstrapAttempt?.cancel();
  },

  /**
   * Restart the TorConnect stage to the start.
   */
  startAgain() {
    this._makeStageRequest(TorConnectStage.Start);
  },

  /**
   * Set the stage to be "ChooseRegion".
   */
  chooseRegion() {
    if (!this._potentiallyBlocked) {
      lazy.logger.error("chooseRegion request before getting an error");
      return;
    }
    // NOTE: The ChooseRegion stage needs _errorDetails to be displayed in
    // about:torconnect. The _potentiallyBlocked condition should be
    // sufficient to ensure this.
    this._makeStageRequest(TorConnectStage.ChooseRegion);
  },

  /**
   * Get the list of regions that Moat has settings for.
   *
   * @returns {string[]} - The list of region codes.
   */
  async getFrequentRegions() {
    return this._moatRegionsPromise ?? [];
  },
};
