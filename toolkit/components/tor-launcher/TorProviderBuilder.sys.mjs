/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  TorLauncherUtil: "resource://gre/modules/TorLauncherUtil.sys.mjs",
  TorProvider: "resource://gre/modules/TorProvider.sys.mjs",
});

export const TorProviderTopics = Object.freeze({
  ProcessExited: "TorProcessExited",
  BootstrapStatus: "TorBootstrapStatus",
  BootstrapError: "TorBootstrapError",
  TorLog: "TorLog",
  HasWarnOrErr: "TorLogHasWarnOrErr",
  BridgeChanged: "TorBridgeChanged",
  CircuitCredentialsMatched: "TorCircuitCredentialsMatched",
});

export const TorProviders = Object.freeze({
  none: 0,
  tor: 1,
});

/**
 * The factory to get a Tor provider.
 * Currently we support only TorProvider, i.e., the one that interacts with
 * C-tor through the control port protocol.
 */
export class TorProviderBuilder {
  /**
   * A promise with the instance of the provider that we are using.
   *
   * @type {Promise<TorProvider>?}
   */
  static #provider = null;

  /**
   * The observer that checks when the tor process exits, and reinitializes the
   * provider.
   *
   * @type {Function}
   */
  static #exitObserver = null;

  /**
   * Tell whether the browser UI is ready.
   * We ignore any errors until it is because we cannot show them.
   *
   * @type {boolean}
   */
  static #uiReady = false;

  /**
   * Initialize the provider of choice.
   * Even though initialization is asynchronous, we do not expect the caller to
   * await this method. The reason is that any call to build() will wait the
   * initialization anyway (and re-throw any initialization error).
   */
  static async init() {
    switch (this.providerType) {
      case TorProviders.tor:
        await this.#initTorProvider();
        break;
      case TorProviders.none:
        lazy.TorLauncherUtil.setProxyConfiguration(
          lazy.TorLauncherUtil.getPreferredSocksConfiguration()
        );
        break;
      default:
        console.error(`Unknown tor provider ${this.providerType}.`);
        break;
    }
  }

  static async #initTorProvider() {
    if (!this.#exitObserver) {
      this.#exitObserver = this.#torExited.bind(this);
      Services.obs.addObserver(
        this.#exitObserver,
        TorProviderTopics.ProcessExited
      );
    }

    try {
      const old = await this.#provider;
      old?.uninit();
    } catch {}
    this.#provider = new Promise((resolve, reject) => {
      const provider = new lazy.TorProvider();
      provider
        .init()
        .then(() => resolve(provider))
        .catch(reject);
    });
    await this.#provider;
  }

  static uninit() {
    this.#provider?.then(provider => {
      provider.uninit();
      this.#provider = null;
    });
    if (this.#exitObserver) {
      Services.obs.removeObserver(
        this.#exitObserver,
        TorProviderTopics.ProcessExited
      );
      this.#exitObserver = null;
    }
  }

  /**
   * Build a provider.
   * This method will wait for the system to be initialized, and allows you to
   * catch also any initialization errors.
   */
  static async build() {
    if (!this.#provider && this.providerType === TorProviders.none) {
      throw new Error(
        "Tor Browser has been configured to use only the proxy functionalities."
      );
    } else if (!this.#provider) {
      throw new Error(
        "The provider has not been initialized or already uninitialized."
      );
    }
    return this.#provider;
  }

  /**
   * Check if the provider has been succesfully initialized when the first
   * browser window is shown.
   * This is a workaround we need because ideally we would like the tor process
   * to start as soon as possible, to avoid delays in the about:torconnect page,
   * but we should modify TorConnect and about:torconnect to handle this case
   * there with a better UX.
   */
  static async firstWindowLoaded() {
    // FIXME: Just integrate this with the about:torconnect or about:tor UI.
    if (
      !lazy.TorLauncherUtil.shouldStartAndOwnTor ||
      this.providerType !== TorProviders.tor
    ) {
      // If we are not managing the Tor daemon we cannot restart it, so just
      // early return.
      return;
    }
    let running = false;
    try {
      const provider = await this.#provider;
      // The initialization might have succeeded, but so far we have ignored any
      // error notification. So, check that the process has not exited after the
      // provider has been initialized successfully, but the UI was not ready
      // yet.
      running = provider.isRunning;
    } catch {
      // Not even initialized, running is already false.
    }
    while (!running && lazy.TorLauncherUtil.showRestartPrompt(true)) {
      try {
        await this.#initTorProvider();
        running = true;
      } catch {}
    }
    // The user might have canceled the restart, but at this point the UI is
    // ready in any case.
    this.#uiReady = true;
  }

  static async #torExited() {
    if (!this.#uiReady) {
      console.warn(
        `Seen ${TorProviderTopics.ProcessExited}, but not doing anything because the UI is not ready yet.`
      );
      return;
    }
    while (lazy.TorLauncherUtil.showRestartPrompt(false)) {
      try {
        await this.#initTorProvider();
        break;
      } catch {}
    }
  }

  /**
   * Return the provider chosen by the user.
   * This function checks the TOR_PROVIDER environment variable and if it is a
   * known provider, it returns its associated value.
   * Otherwise, if it is not valid, the C tor implementation is chosen as the
   * default one.
   *
   * @returns {number} An entry from TorProviders
   */
  static get providerType() {
    // TODO: Add a preference to permanently save this without and avoid always
    // using an environment variable.
    let provider = TorProviders.tor;
    const kEnvName = "TOR_PROVIDER";
    if (
      Services.env.exists(kEnvName) &&
      Services.env.get(kEnvName) in TorProviders
    ) {
      provider = TorProviders[Services.env.get(kEnvName)];
    }
    return provider;
  }
}
