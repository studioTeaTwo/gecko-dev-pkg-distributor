/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MAX_DATE_MS = 8640000000000000;

import { SsiStorage } from "resource://ssi/ssistorage.sys.mjs";
import { AuthCache } from "resource://gre/modules/AuthCache.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  let logger = lazy.SsiHelper.createLogger("Ssi");
  return logger;
});

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
  _authCache: null, // AuthCache instance

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
        this._authCache = AuthCache.init();
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
    observe(subject, topic) {
      if (topic == "xpcom-shutdown") {
        delete this._ssi._storage;
        this._ssi = null;
      } else if (topic == "ssi-storage-replace") {
        (async () => {
          await this._ssi._storage.terminate();
          this._ssi._initStorage();
          await this._ssi.initializationPromise;
          Services.obs.notifyObservers(null, "ssi-storage-replace-complete");
        })();
      } else if (topic == "gather-telemetry") {
        /* empty */
      } else {
        lazy.log.debug(`Unexpected notification: ${topic}.`);
      }
    },
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
    // For credentials w/o a trustedSites, set to [], not null.
    if (credential.trustedSites == null) {
      throw new Error("Can't add a credential with a null trustedSites.");
    }
    // For credentials w/o a trustedSites, set to [], not null.
    if (credential.dialogicAuthorizedSites == null) {
      throw new Error(
        "Can't add a credential with a null dialogicAuthorizedSites."
      );
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
    this._authCache.set(
      `${resultCredential.protocolName}:${resultCredential.credentialName}:${resultCredential.identifier}`,
      {
        trustedSites: JSON.parse(resultCredential.trustedSites),
        dialogicAuthorizedSites: JSON.parse(
          resultCredential.dialogicAuthorizedSites
        ),
      },
      true
    );
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
    this._storage.removeCredential(credential);
    this._authCache.delete(
      `${credential.protocolName}:${credential.credentialName}:${credential.identifier}`
    );
  },

  /**
   * Change the specified credential to match the new credential or new properties.
   */
  modifyCredential(oldCredential, newCredential) {
    lazy.log.debug(
      "Modifying credential",
      oldCredential.QueryInterface(Ci.nsICredentialMetaInfo).guid
    );
    this._storage.modifyCredential(oldCredential, newCredential);
    this._authCache.set(
      `${newCredential.protocolName}:${newCredential.credentialName}:${newCredential.identifier}`,
      {
        trustedSites: JSON.parse(newCredential.trustedSites),
        dialogicAuthorizedSites: JSON.parse(
          newCredential.dialogicAuthorizedSites
        ),
      },
      true
    );
  },

  /**
   * Get a dump of all stored credentials asynchronously. Used by the ssi UI.
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
    this._authCache.reset();
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

  get authCache() {
    return this._authCache;
  },
}; // end of Ssi implementation
