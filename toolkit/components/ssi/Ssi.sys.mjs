/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MAX_DATE_MS = 8640000000000000;

import { SsiStorage } from "resource://ssi/ssistorage.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  let logger = lazy.SsiHelper.createLogger("Ssi");
  return logger;
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

if (Services.appinfo.processType !== Services.appinfo.PROCESS_TYPE_DEFAULT) {
  throw new Error("Ssi.jsm should only run in the parent process");
}

export function Ssi() {
  this.init();
}

Ssi.prototype = {
  classID: Components.ID("{627D966F-A01D-4572-8548-5076E4CDD657}"),
  QueryInterface: ChromeUtils.generateQI([
    "nsISsi",
    "nsISupportsWeakReference",
    "nsIInterfaceRequestor",
  ]),
  getInterface(aIID) {
    if (aIID.equals(Ci.mozIStorageConnection) && this._storage) {
      let ir = this._storage.QueryInterface(Ci.nsIInterfaceRequestor);
      return ir.getInterface(aIID);
    }

    if (aIID.equals(Ci.nsIVariant)) {
      // Allows unwrapping the JavaScript object for regression tests.
      return this;
    }

    throw new Components.Exception(
      "Interface not available",
      Cr.NS_ERROR_NO_INTERFACE
    );
  },

  /* ---------- private members ---------- */

  _storage: null, // Storage component which contains the saved credentials

  /**
   * Initialize the Ssi Store. Automatically called when service
   * is created.
   *
   * Note: Service created in BrowserGlue#_scheduleStartupIdleTasks()
   */
  init() {
    // Cache references to current |this| in utility objects
    this._observer._ssi = this;

    Services.obs.addObserver(this._observer, "xpcom-shutdown");
    Services.obs.addObserver(this._observer, "ssi-storage-replace");

    // Initialize storage so that asynchronous data loading can start.
    this._initStorage();

    Services.obs.addObserver(this._observer, "gather-telemetry");
  },

  _initStorage() {
    this.initializationPromise = new Promise(resolve => {
      this._storage = SsiStorage.create(() => {
        resolve();

        lazy.log.debug(
          "initializationPromise is resolved, updating isPrimaryPasswordSet in sharedData"
        );
        Services.ppmm.sharedData.set(
          "isPrimaryPasswordSet",
          lazy.SsiHelper.isPrimaryPasswordSet()
        );
      });
    });
  },

  /* ---------- Utility objects ---------- */

  /**
   * Internal utility object, implements the nsIObserver interface.
   * Used to receive notification for: form submission, preference changes.
   */
  _observer: {
    _ssi: null,

    QueryInterface: ChromeUtils.generateQI([
      "nsIObserver",
      "nsISupportsWeakReference",
    ]),

    // nsIObserver
    observe(subject, topic, data) {
      if (topic == "xpcom-shutdown") {
        delete this._ssi._storage;
        this._ssi = null;
      } else if (topic == "ssi-storage-replace") {
        (async () => {
          await this._ssi._storage.terminate();
          this._ssi._initStorage();
          await this._ssi.initializationPromise;
          Services.obs.notifyObservers(
            null,
            "ssi-storage-replace-complete"
          );
        })();
      } else if (topic == "gather-telemetry") {
        // When testing, the "data" parameter is a string containing the
        // reference time in milliseconds for time-based statistics.
        this._ssi._gatherTelemetry(
          data ? parseInt(data) : new Date().getTime()
        );
      } else {
        lazy.log.debug(`Unexpected notification: ${topic}.`);
      }
    },
  },

  /**
   * Collects statistics about the current credentials and settings. The telemetry
   * histograms used here are not accumulated, but are reset each time this
   * function is called, since it can be called multiple times in a session.
   *
   * This function might also not be called at all in the current session.
   *
   * @param referenceTimeMs
   *        Current time used to calculate time-based statistics, expressed as
   *        the number of milliseconds since January 1, 1970, 00:00:00 UTC.
   *        This is set to a fake value during unit testing.
   */
  async _gatherTelemetry(referenceTimeMs) {
    function clearAndGetHistogram(histogramId) {
      let histogram = Services.telemetry.getHistogramById(histogramId);
      histogram.clear();
      return histogram;
    }

    clearAndGetHistogram("SSI_NUM_SAVED_SECRETS").add(
      this.countCredentials("", "", "")
    );
    Services.obs.notifyObservers(
      null,
      "weave:telemetry:histogram",
      "SSI_NUM_SAVED_SECRETS"
    );

    // TODO: (ssb) review OS Auth later
    // Don't try to get credentials if MP is enabled, since we don't want to show a MP prompt.
    // if (!this.isLoggedIn) {
    //   return;
    // }

    let credentials = await this.getAllCredentials();

    let credentialLastUsedDaysHistogram = clearAndGetHistogram(
      "SSI_LOGIN_LAST_USED_DAYS"
    );
    for (let credential of credentials) {
      credential.QueryInterface(Ci.nsICredentialMetaInfo);
      let timeLastUsedAgeMs = referenceTimeMs - credential.timeLastUsed;
      if (timeLastUsedAgeMs > 0) {
        credentialLastUsedDaysHistogram.add(
          Math.floor(timeLastUsedAgeMs / MS_PER_DAY)
        );
      }
    }
    Services.obs.notifyObservers(
      null,
      "weave:telemetry:histogram",
      "SSI_LOGIN_LAST_USED_DAYS"
    );

    Services.obs.notifyObservers(null, "ssi-gather-telemetry-complete");
  },

  /**
   * Ensures that a credential isn't missing any necessary fields.
   *
   * @param credential
   *        The credential to check.
   */
  _checkCredential(credential) {
    // For credentials w/o a protocolName, set to "", not null.
    if (credential.protocolName == null) {
      throw new Error("Can't add a credential with a null protocolName.");
    }
    // For credentials w/o a credentialName, set to "", not null.
    if (credential.credentialName == null) {
      throw new Error("Can't add a credential with a null credentialName.");
    }
    // For credentials w/o a secret, set to "", not null.
    if (credential.secret == null) {
      throw new Error("Can't add a credential with a null secret.");
    }

    credential.QueryInterface(Ci.nsICredentialMetaInfo);
    for (let pname of ["timeCreated", "timeLastUsed", "timeSecretChanged"]) {
      // Invalid dates
      if (credential[pname] > MAX_DATE_MS) {
        throw new Error("Can't add a credential with invalid date properties.");
      }
    }
  },

  /* ---------- Primary Public interfaces ---------- */

  /**
   * @type Promise
   * This promise is resolved when initialization is complete, and is rejected
   * in case the asynchronous part of initialization failed.
   */
  initializationPromise: null,

  /**
   * Add a new credential to credential storage.
   */
  async addCredentialAsync(credential) {
    this._checkCredential(credential);

    lazy.log.debug("Adding credential");
    const [resultCredential] = await this._storage.addCredentialsAsync([
      credential,
    ]);
    return resultCredential;
  },

  /**
   * Remove the specified credential from the stored credentials.
   */
  removeCredential(credential) {
    lazy.log.debug(
      "Removing credential",
      credential.QueryInterface(Ci.nsICredentialMetaInfo).guid
    );
    return this._storage.removeCredential(credential);
  },

  /**
   * Change the specified credential to match the new credential or new properties.
   */
  modifyCredential(oldCredential, newCredential) {
    lazy.log.debug(
      "Modifying credential",
      oldCredential.QueryInterface(Ci.nsICredentialMetaInfo).guid
    );
    return this._storage.modifyCredential(oldCredential, newCredential);
  },

  /**
   * Get a dump of all stored credentials asynchronously. Used by the ssi store UI.
   *
   * @returns {nsICredentialInfo[]} - If there are no credentials, the array is empty.
   */
  async getAllCredentials() {
    lazy.log.debug("Getting a list of all credentials asynchronously.");
    return this._storage.getAllCredentials();
  },

  /**
   * Get a dump of all stored credentials asynchronously. Used by the credential detection service.
   */
  getAllCredentialsWithCallback(aCallback) {
    lazy.log.debug("Searching a list of all credentials asynchronously.");
    this._storage.getAllCredentials().then(credentials => {
      aCallback.onSearchComplete(credentials);
    });
  },

  /**
   * Remove all credentials from data store.
   */
  removeAllCredentials() {
    lazy.log.debug("Removing all credentials from local store.");
    this._storage.removeAllCredentials();
  },

  async searchCredentialsAsync(matchData) {
    lazy.log.debug(`Searching for matching credentials`);

    return this._storage.searchCredentialsAsync(matchData);
  },

  /**
   * Search for the known credentials for entries matching the specified criteria,
   * returns only the count.
   */
  countCredentials(protocolName, credentialName) {
    const credentialsCount = this._storage.countCredentials(
      protocolName,
      credentialName
    );

    lazy.log.debug(
      `Found ${credentialsCount} matching protocol: ${protocolName} and credential: ${credentialName}`
    );

    return credentialsCount;
  },

  get uiBusy() {
    return this._storage.uiBusy;
  },

  get isLoggedIn() {
    return this._storage.isLoggedIn;
  },
}; // end of Ssi implementation
