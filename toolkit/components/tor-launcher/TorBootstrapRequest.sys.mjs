import { setTimeout, clearTimeout } from "resource://gre/modules/Timer.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  TorProviderBuilder: "resource://gre/modules/TorProviderBuilder.sys.mjs",
  TorProviderTopics: "resource://gre/modules/TorProviderBuilder.sys.mjs",
});

const log = console.createInstance({
  maxLogLevel: "Info",
  prefix: "TorBootstrapRequest",
});

/**
 * This class encapsulates the observer register/unregister logic to provide an
 * XMLHttpRequest-like API to bootstrap tor.
 * TODO: Remove this class, and move its logic inside the TorProvider.
 */
export class TorBootstrapRequest {
  // number of ms to wait before we abandon the bootstrap attempt
  // a value of 0 implies we never wait
  timeout = 0;

  // callbacks for bootstrap process status updates
  onbootstrapstatus = (_progress, _status) => {};
  onbootstrapcomplete = () => {};
  onbootstraperror = _error => {};

  // internal resolve() method for bootstrap
  #bootstrapPromiseResolve = null;
  #bootstrapPromise = null;
  #timeoutID = null;

  observe(subject, topic) {
    const obj = subject?.wrappedJSObject;
    switch (topic) {
      case lazy.TorProviderTopics.BootstrapStatus: {
        const progress = obj.PROGRESS;
        if (this.onbootstrapstatus) {
          const status = obj.TAG;
          this.onbootstrapstatus(progress, status);
        }
        if (progress === 100) {
          if (this.onbootstrapcomplete) {
            this.onbootstrapcomplete();
          }
          this.#bootstrapPromiseResolve(true);
          clearTimeout(this.#timeoutID);
          this.#timeoutID = null;
        }

        break;
      }
      case lazy.TorProviderTopics.BootstrapError: {
        log.info("TorBootstrapRequest: observerd TorBootstrapError", obj);
        const error = new Error(obj.summary);
        Object.assign(error, obj);
        this.#stop(error);
        break;
      }
    }
  }

  // resolves 'true' if bootstrap succeeds, false otherwise
  bootstrap() {
    if (this.#bootstrapPromise) {
      return this.#bootstrapPromise;
    }

    this.#bootstrapPromise = new Promise(resolve => {
      this.#bootstrapPromiseResolve = resolve;

      // register ourselves to listen for bootstrap events
      Services.obs.addObserver(this, lazy.TorProviderTopics.BootstrapStatus);
      Services.obs.addObserver(this, lazy.TorProviderTopics.BootstrapError);

      // optionally cancel bootstrap after a given timeout
      if (this.timeout > 0) {
        this.#timeoutID = setTimeout(() => {
          this.#timeoutID = null;
          this.#stop(
            new Error(
              `Bootstrap attempt abandoned after waiting ${this.timeout} ms`
            )
          );
        }, this.timeout);
      }

      // Wait for bootstrapping to begin and maybe handle error.
      // Notice that we do not resolve the promise here in case of success, but
      // we do it from the BootstrapStatus observer.
      lazy.TorProviderBuilder.build()
        .then(provider => provider.connect())
        .catch(err => {
          this.#stop(err);
        });
    }).finally(() => {
      // and remove ourselves once bootstrap is resolved
      Services.obs.removeObserver(this, lazy.TorProviderTopics.BootstrapStatus);
      Services.obs.removeObserver(this, lazy.TorProviderTopics.BootstrapError);
      this.#bootstrapPromise = null;
    });

    return this.#bootstrapPromise;
  }

  async cancel() {
    await this.#stop();
  }

  // Internal implementation. Do not use directly, but call cancel, instead.
  async #stop(error) {
    // first stop our bootstrap timeout before handling the error
    if (this.#timeoutID !== null) {
      clearTimeout(this.#timeoutID);
      this.#timeoutID = null;
    }

    let provider;
    try {
      provider = await lazy.TorProviderBuilder.build();
    } catch {
      // This was probably the error that lead to stop in the first place.
      // No need to continue propagating it.
    }
    try {
      await provider?.stopBootstrap();
    } catch (e) {
      console.error("Failed to stop the bootstrap.", e);
      if (!error) {
        error = e;
      }
    }

    if (this.onbootstraperror && error) {
      this.onbootstraperror(error);
    }

    this.#bootstrapPromiseResolve(false);
  }
}
