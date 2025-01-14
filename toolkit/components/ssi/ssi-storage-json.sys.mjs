/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * SsiStorage implementation for the JSON back-end.
 */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SsiStore: "resource://gre/modules/SsiStore.sys.mjs",
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
});

export class SsiStorage_json {
  constructor() {
    this.__crypto = null; // nsISsiCrypto service
  }

  get _crypto() {
    if (!this.__crypto) {
      this.__crypto = Cc["@mozilla.org/ssi/crypto/SDR;1"].getService(
        Ci.nsISsiCrypto
      );
    }
    return this.__crypto;
  }

  initialize() {
    try {
      // Force initialization of the crypto module.
      // See bug 717490 comment 17.
      this._crypto;

      let profileDir = Services.dirsvc.get("ProfD", Ci.nsIFile).path;

      // Set the reference to SsiStore synchronously.
      let jsonPath = PathUtils.join(profileDir, "ssi-credentials.json");
      let backupPath = "";
      // TODO(ssb): reconsider whether it needs.
      // let loginsBackupEnabled = Services.prefs.getBoolPref(
      //   "signon.backup.enabled"
      // );
      // if (loginsBackupEnabled) {
      //   backupPath = PathUtils.join(profileDir, "logins-backup.json");
      // }
      this._store = new lazy.SsiStore(jsonPath, backupPath);

      return (async () => {
        // Load the data asynchronously.
        this.log(`Opening database at ${this._store.path}.`);
        await this._store.load();
      })().catch(console.error);
    } catch (e) {
      this.log(`Initialization failed ${e.name}.`);
      throw new Error("Initialization failed");
    }
  }

  /**
   * Internal method used by regression tests only.  It is called before
   * replacing this storage module with a new instance.
   */
  terminate() {
    this._store._saver.disarm();
    return this._store._save();
  }

  // Synrhronuously stores encrypted credential, returns credential clone with upserted
  // uuid and updated timestamps
  #addCredential(credential) {
    this._store.ensureDataReady();

    // Throws if there are bogus values.
    lazy.SsiHelper.checkCredentialValues(credential);

    // Clone the credential, so we don't modify the caller's object.
    let credentialClone = credential.clone();

    // Initialize the nsICredentialMetaInfo fields, unless the caller gave us values
    credentialClone.QueryInterface(Ci.nsICredentialMetaInfo);
    if (credentialClone.guid) {
      let guid = credentialClone.guid;
      if (!this._isGuidUnique(guid)) {
        // We have an existing GUID, but it's possible that entry is unable
        // to be decrypted - if that's the case we remove the existing one
        // and allow this one to be added.
        let existing = this._searchCredentials({ guid })[0];
        if (this._decryptCredentials(existing).length) {
          // Existing item is good, so it's an error to try and re-add it.
          throw new Error("specified GUID already exists");
        }
        // find and remove the existing bad entry.
        let foundIndex = this._store.data.credentials.findIndex(
          l => l.guid == guid
        );
        if (foundIndex == -1) {
          throw new Error("can't find a matching GUID to remove");
        }
        this._store.data.credentials.splice(foundIndex, 1);
      }
    } else {
      credentialClone.guid = Services.uuid.generateUUID().toString();
    }

    // Set timestamps
    let currentTime = Date.now();
    if (!credentialClone.timeCreated) {
      credentialClone.timeCreated = currentTime;
    }
    if (!credentialClone.timeLastUsed) {
      credentialClone.timeLastUsed = currentTime;
    }
    if (!credentialClone.timeSecretChanged) {
      credentialClone.timeSecretChanged = currentTime;
    }
    if (!credentialClone.timesUsed) {
      credentialClone.timesUsed = 1;
    }

    this._store.data.credentials.push({
      id: this._store.data.nextId++,
      protocolName: credentialClone.protocolName,
      credentialName: credentialClone.credentialName,
      primary: credentialClone.primary,
      encryptedSecret: credentialClone.secret,
      encryptedIdentifier: credentialClone.identifier,
      encryptedTrustedSites: credentialClone.trustedSites,
      encryptedPasswordAuthorizedSites: credentialClone.passwordAuthorizedSites,
      encryptedProperties: credentialClone.properties,
      guid: credentialClone.guid,
      encType: this._crypto.defaultEncType,
      timeCreated: credentialClone.timeCreated,
      timeLastUsed: credentialClone.timeLastUsed,
      timeSecretChanged: credentialClone.timeSecretChanged,
      timesUsed: credentialClone.timesUsed,
      encryptedUnknownFields: credentialClone.unknownFields,
    });
    this._store.saveSoon();
    return credentialClone;
  }

  async addCredentialsAsync(credentials, continueOnDuplicates = false) {
    if (credentials.length === 0) {
      return credentials;
    }

    const encryptedCredentials = await this.#encryptCredentials(credentials);

    const resultCredentials = [];
    for (const [credential, encryptedCredential] of encryptedCredentials) {
      // check for duplicates
      const existingCredentials = await Services.ssi.searchCredentialsAsync({
        protocolName: credential.protocolName,
        credentialName: credential.credentialName,
        secret: credential.secret,
      });

      const matchingCredential = existingCredentials.find(l =>
        credential.matches(l, true)
      );
      if (matchingCredential) {
        if (continueOnDuplicates) {
          continue;
        } else {
          throw lazy.SsiHelper.createCredentialAlreadyExistsError(
            matchingCredential.guid
          );
        }
      }

      const resultCredential = this.#addCredential(encryptedCredential);

      // restore unencrypted values for use in `addCredential` event
      // and return value
      resultCredential.secret = credential.secret;
      resultCredential.identifier = credential.identifier;
      resultCredential.trustedSites = credential.trustedSites;
      resultCredential.passwordAuthorizedSites =
        credential.passwordAuthorizedSites;
      resultCredential.properties = credential.properties;

      // Send a notification that a credential was added.
      lazy.SsiHelper.notifyStorageChanged("addCredential", resultCredential);

      resultCredentials.push(resultCredential);
    }

    return resultCredentials;
  }

  removeCredential(credential) {
    this._store.ensureDataReady();

    let [idToDelete, storedCredential] = this._getIdForCredential(credential);
    if (!idToDelete) {
      throw new Error("No matching credentials");
    }

    let foundIndex = this._store.data.credentials.findIndex(
      l => l.id == idToDelete
    );
    if (foundIndex != -1) {
      this._store.data.credentials.splice(foundIndex, 1);
      this._store.saveSoon();
    }

    lazy.SsiHelper.notifyStorageChanged("removeCredential", storedCredential);
  }

  modifyCredential(oldCredential, newCredentialData) {
    this._store.ensureDataReady();

    let [idToModify, oldStoredCredential] =
      this._getIdForCredential(oldCredential);
    if (!idToModify) {
      throw new Error("No matching credentials");
    }

    let newCredential = lazy.SsiHelper.buildModifiedCredential(
      oldStoredCredential,
      newCredentialData
    );

    // Check if the new GUID is duplicate.
    if (
      newCredential.guid != oldStoredCredential.guid &&
      !this._isGuidUnique(newCredential.guid)
    ) {
      throw new Error("specified GUID already exists");
    }

    // Look for an existing entry in case key properties changed.
    if (!newCredential.matches(oldCredential)) {
      let credentialData = {
        protocolName: newCredential.protocolName,
        credentialName: newCredential.credentialName,
      };
      let credentials = this.searchCredentials(
        lazy.SsiHelper.newPropertyBag(credentialData)
      );

      let matchingCredential = credentials.find(credential =>
        newCredential.matches(credential)
      );
      if (matchingCredential) {
        throw lazy.SsiHelper.createCredentialAlreadyExistsError(
          matchingCredential.guid
        );
      }
    }

    // Get the encrypted values.
    let [
      encSecret,
      encIdentifier,
      encTrustedSites,
      encPasswordAuthorizedSites,
      encProperties,
      encType,
      encUnknownFields,
    ] = this._encryptCredential(newCredential);

    for (let credentialItem of this._store.data.credentials) {
      if (credentialItem.id == idToModify && !credentialItem.deleted) {
        credentialItem.protocolName = newCredential.protocolName;
        credentialItem.credentialName = newCredential.credentialName;
        credentialItem.primary = newCredential.primary;
        credentialItem.encryptedSecret = encSecret;
        credentialItem.encryptedIdentifier = encIdentifier;
        credentialItem.encryptedTrustedSites = encTrustedSites;
        credentialItem.encryptedPasswordAuthorizedSites =
          encPasswordAuthorizedSites;
        credentialItem.encryptedProperties = encProperties;
        credentialItem.guid = newCredential.guid;
        credentialItem.encType = encType;
        credentialItem.timeCreated = newCredential.timeCreated;
        credentialItem.timeLastUsed = newCredential.timeLastUsed;
        credentialItem.timeSecretChanged = newCredential.timeSecretChanged;
        credentialItem.timesUsed = newCredential.timesUsed;
        credentialItem.encryptedUnknownFields = encUnknownFields;
        this._store.saveSoon();
        break;
      }
    }

    lazy.SsiHelper.notifyStorageChanged("modifyCredential", [
      oldStoredCredential,
      newCredential,
    ]);
  }

  /**
   * Returns an array of nsICredentialInfo. If decryption of a credential
   * fails due to a corrupt entry, the credential is not included in
   * the resulting array.
   *
   * @resolve {nsICredentialInfo[]}
   */
  async getAllCredentials() {
    this._store.ensureDataReady();

    let [credentials] = this._searchCredentials({});
    if (!credentials.length) {
      return [];
    }

    return this.#decryptCredentials(credentials);
  }

  async searchCredentialsAsync(matchData) {
    this.log(`Searching for matching credentials.`);
    let result = this.searchCredentials(
      lazy.SsiHelper.newPropertyBag(matchData)
    );
    // Emulate being async:
    return Promise.resolve(result);
  }

  /**
   * Public wrapper around _searchCredentials to convert the nsIPropertyBag to a
   * JavaScript object and decrypt the results.
   *
   * @returns {nsICredentialInfo[]} which are decrypted.
   */
  searchCredentials(matchData) {
    this._store.ensureDataReady();

    let realMatchData = {};

    matchData.QueryInterface(Ci.nsIPropertyBag2);
    if (matchData.hasKey("guid")) {
      // Enforce GUID-based filtering when available, since the secret
      // can not match as the unique key, due to encryption
      realMatchData = { guid: matchData.getProperty("guid") };
    } else {
      // Convert nsIPropertyBag to normal JS object.
      for (let prop of matchData.enumerator) {
        realMatchData[prop.name] = prop.value;
      }
    }

    let [credentials] = this._searchCredentials(realMatchData);

    // Decrypt entries found for the caller.
    credentials = this._decryptCredentials(credentials);

    return credentials;
  }

  /**
   * Private method to perform arbitrary searches on any field. Decryption is
   * left to the caller.
   *
   * Returns [credentials, ids] for credentials that match the arguments, where credentials
   * is an array of encrypted nsCredentialInfo and ids is an array of associated
   * ids in the database.
   */
  _searchCredentials(
    matchData,
    candidateCredentials = this._store.data.credentials
  ) {
    const self = this;
    function match(aCredentialItem) {
      for (let field in matchData) {
        let wantedValue = matchData[field];
        let decriptedValue = null;

        switch (field) {
          // Normal cases.
          // fall through
          case "protocolName":
          case "credentialName":
          case "id":
          case "primary":
          case "encryptedSecret":
          case "encryptedIdentifier":
          case "encryptedTrustedSites":
          case "encryptedPasswordAuthorizedSites":
          case "encryptedProperties":
          case "guid":
          case "encType":
          case "timeCreated":
          case "timeLastUsed":
          case "timeSecretChanged":
          case "timesUsed":
            if (wantedValue == null && aCredentialItem[field]) {
              return false;
            } else if (aCredentialItem[field] != wantedValue) {
              return false;
            }
            break;
          // Compare after decryption
          case "secret":
          case "identifier":
          case "trustedSites":
          case "authorizedSites":
          case "properties":
            decriptedValue = self._decryptDirectly(aCredentialItem);
            if (wantedValue == null && decriptedValue[field]) {
              return false;
            } else if (decriptedValue[field] != wantedValue) {
              return false;
            }
            break;
          // Fail if caller requests an unknown property.
          default:
            throw new Error("Unexpected field: " + field);
        }
      }
      return true;
    }

    let foundCredentials = [],
      foundIds = [];
    for (let credentialItem of candidateCredentials) {
      if (match(credentialItem)) {
        // Create the new nsCredentialInfo object, push to array
        let credential = Cc["@mozilla.org/ssi/credentialInfo;1"].createInstance(
          Ci.nsICredentialInfo
        );
        credential.init(
          credentialItem.protocolName,
          credentialItem.credentialName,
          credentialItem.primary,
          credentialItem.encryptedSecret,
          credentialItem.encryptedIdentifier,
          credentialItem.encryptedTrustedSites,
          credentialItem.encryptedPasswordAuthorizedSites,
          credentialItem.encryptedProperties
        );
        // set nsICredentialMetaInfo values
        credential.QueryInterface(Ci.nsICredentialMetaInfo);
        credential.guid = credentialItem.guid;
        credential.timeCreated = credentialItem.timeCreated;
        credential.timeLastUsed = credentialItem.timeLastUsed;
        credential.timeSecretChanged = credentialItem.timeSecretChanged;
        credential.timesUsed = credentialItem.timesUsed;

        // Any unknown fields along for the ride
        credential.unknownFields = credentialItem.encryptedUnknownFields;
        foundCredentials.push(credential);
        foundIds.push(credentialItem.id);
      }
    }

    this.log(
      `Returning ${foundCredentials.length} credentials for specified conditions`
    );
    return [foundCredentials, foundIds];
  }

  /**
   * Removes all credentials from local storage.
   *
   * NOTE: You probably want removeAllUserFacingCredentials instead of this function.
   *
   */
  removeAllCredentials() {
    this.#removeCredentials();
  }

  /**
   * Removes all credentials from storage.
   *
   */
  #removeCredentials() {
    this._store.ensureDataReady();
    this.log("Removing all credentials.");

    let removedCredentials = [];
    for (let credential of this._store.data.credentials) {
      removedCredentials.push(credential);
    }
    this._store.data.credentials = [];

    this._store.saveSoon();

    lazy.SsiHelper.notifyStorageChanged(
      "removeAllCredentials",
      removedCredentials
    );
  }

  countCredentials(protocolName, credentialName) {
    this._store.ensureDataReady();

    let credentialData = {
      protocolName,
      credentialName,
    };
    let matchData = {};
    for (let field of ["protocolName", "credentialName"]) {
      if (credentialData[field] != "") {
        matchData[field] = credentialData[field];
      }
    }
    let [credentials] = this._searchCredentials(matchData);

    this.log(`Counted ${credentials.length} credentials.`);
    return credentials.length;
  }

  get uiBusy() {
    return this._crypto.uiBusy;
  }

  get isLoggedIn() {
    return this._crypto.isLoggedIn;
  }

  /**
   * Returns an array with two items: [id, credential]. If the credential was not
   * found, both items will be null. The returned credential contains the actual
   * stored credential (useful for looking at the actual nsICredentialMetaInfo values).
   */
  _getIdForCredential(credential) {
    this._store.ensureDataReady();

    let matchData = {};
    for (let field of ["protocolName", "credentialName", "secret"]) {
      if (credential[field] != "") {
        matchData[field] = credential[field];
      }
    }
    let [credentials, ids] = this._searchCredentials(matchData);

    let id = null;
    let foundCredential = null;

    // The specified credential isn't encrypted, so we need to ensure
    // the credentials we're comparing with are decrypted. We decrypt one entry
    // at a time, lest _decryptCredentials return fewer entries and screw up
    // indices between the two.
    for (let i = 0; i < credentials.length; i++) {
      let [decryptedCredential] = this._decryptCredentials([credentials[i]]);

      if (!decryptedCredential || !decryptedCredential.equals(credential)) {
        continue;
      }

      // We've found a match, set id and break
      foundCredential = decryptedCredential;
      id = ids[i];
      break;
    }

    return [id, foundCredential];
  }

  /**
   * Checks to see if the specified GUID already exists.
   */
  _isGuidUnique(guid) {
    this._store.ensureDataReady();

    return this._store.data.credentials.every(l => l.guid != guid);
  }

  /*
   * Asynchronously encrypt multiple credentials.
   * Returns a promise resolving to an array of arrays containing two entries:
   * the original credential and a clone with encrypted properties.
   */
  async #encryptCredentials(credentials) {
    if (credentials.length === 0) {
      return credentials;
    }

    const plaintexts = credentials.reduce(
      (
        memo,
        {
          secret,
          identifier,
          trustedSites,
          passwordAuthorizedSites,
          properties,
          unknownFields,
        }
      ) =>
        memo.concat([
          secret,
          identifier,
          trustedSites,
          passwordAuthorizedSites,
          properties,
          unknownFields,
        ]),
      []
    );
    const ciphertexts = await this._crypto.encryptMany(plaintexts);

    return credentials.map((credential, i) => {
      const [
        encryptedSecret,
        encryptedIdentifier,
        encryptedTrustedSites,
        encryptedPasswordAuthorizedSites,
        encryptedProperties,
        encryptedUnknownFields,
      ] = ciphertexts.slice(6 * i, 6 * i + 6);

      const encryptedCredential = credential.clone();
      encryptedCredential.secret = encryptedSecret;
      encryptedCredential.identifier = encryptedIdentifier;
      encryptedCredential.trustedSites = encryptedTrustedSites;
      encryptedCredential.passwordAuthorizedSites =
        encryptedPasswordAuthorizedSites;
      encryptedCredential.properties = encryptedProperties;
      encryptedCredential.unknownFields = encryptedUnknownFields;

      return [credential, encryptedCredential];
    });
  }

  /*
   * Asynchronously decrypt multiple credentials.
   * Returns a promise resolving to an array of clones with decrypted properties.
   */
  async #decryptCredentials(credentials) {
    if (credentials.length === 0) {
      return credentials;
    }

    const ciphertexts = credentials.reduce(
      (
        memo,
        {
          secret,
          identifier,
          trustedSites,
          passwordAuthorizedSites,
          properties,
          unknownFields,
        }
      ) =>
        memo.concat([
          secret,
          identifier,
          trustedSites,
          passwordAuthorizedSites,
          properties,
          unknownFields,
        ]),
      []
    );
    const plaintexts = await this._crypto.decryptMany(ciphertexts);

    return credentials
      .map((credential, i) => {
        const [
          secret,
          identifier,
          trustedSites,
          passwordAuthorizedSites,
          properties,
          unknownFields,
        ] = plaintexts.slice(6 * i, 6 * i + 6);

        // If the secret is blank it means that decryption may have
        // failed during decryptMany but we can't differentiate an empty string
        // value from a failure so we attempt to decrypt again and check the
        // result.
        if (!secret) {
          try {
            this._crypto.decrypt(credential.secret);
          } catch (e) {
            // If decryption failed (corrupt entry?), just return it as it is.
            // Rethrow other errors (like canceling entry of a primary pw)
            if (e.result == Cr.NS_ERROR_FAILURE) {
              this.log(
                `Could not decrypt credential: ${
                  credential.QueryInterface(Ci.nsICredentialMetaInfo).guid
                }.`
              );
              return null;
            }
            throw e;
          }
        }

        const decryptedCredential = credential.clone();
        decryptedCredential.secret = secret;
        decryptedCredential.identifier = identifier;
        decryptedCredential.trustedSites = trustedSites;
        decryptedCredential.passwordAuthorizedSites = passwordAuthorizedSites;
        decryptedCredential.properties = properties;
        decryptedCredential.unknownFields = unknownFields;

        return decryptedCredential;
      })
      .filter(Boolean);
  }

  /**
   * Returns the encrypted values, and encrypton type for the specified
   * credential. Can throw if the user cancels a primary password entry.
   */
  _encryptCredential(credential) {
    let encSecret = this._crypto.encrypt(credential.secret);
    let encIdentifier = this._crypto.encrypt(credential.identifier);
    let encTrustedSites = this._crypto.encrypt(credential.trustedSites);
    let encPasswordAuthorizedSites = this._crypto.encrypt(
      credential.passwordAuthorizedSites
    );
    let encProperties = this._crypto.encrypt(credential.properties);

    // Unknown fields should be encrypted since we can't know whether new fields
    // from other clients will contain sensitive data or not
    let encUnknownFields = null;
    if (credential.unknownFields) {
      encUnknownFields = this._crypto.encrypt(credential.unknownFields);
    }
    let encType = this._crypto.defaultEncType;

    return [
      encSecret,
      encIdentifier,
      encTrustedSites,
      encPasswordAuthorizedSites,
      encProperties,
      encType,
      encUnknownFields,
    ];
  }

  /**
   * Decrypts fields in the provided array of credentials.
   *
   * The entries specified by the array will be decrypted, if possible.
   * An array of successfully decrypted credentials will be returned. The return
   * value should be given to external callers (since still-encrypted
   * entries are useless), whereas internal callers generally don't want
   * to lose unencrypted entries (eg, because the user clicked Cancel
   * instead of entering their primary password)
   */
  _decryptCredentials(credentials) {
    let result = [];

    for (let credential of credentials) {
      try {
        credential.secret = this._crypto.decrypt(credential.secret);
        credential.identifier = this._crypto.decrypt(credential.identifier);
        credential.trustedSites = this._crypto.decrypt(credential.trustedSites);
        credential.passwordAuthorizedSites = this._crypto.decrypt(
          credential.passwordAuthorizedSites
        );
        credential.properties = this._crypto.decrypt(credential.properties);
        // Verify unknownFields actually has a value
        if (credential.unknownFields) {
          credential.unknownFields = this._crypto.decrypt(
            credential.unknownFields
          );
        }
      } catch (e) {
        // If decryption failed (corrupt entry?), just skip it.
        // Rethrow other errors (like canceling entry of a primary pw)
        if (e.result == Cr.NS_ERROR_FAILURE) {
          continue;
        }
        throw e;
      }
      result.push(credential);
    }

    return result;
  }

  /**
   * Decrypts directly with actual storage key and the return value has the memory key.
   */
  _decryptDirectly(aCredential) {
    try {
      aCredential.secret = this._crypto.decrypt(aCredential.encryptedSecret);
      aCredential.identifier = this._crypto.decrypt(
        aCredential.encryptedIdentifier
      );
      aCredential.trustedSites = this._crypto.decrypt(
        aCredential.encryptedTrustedSites
      );
      aCredential.passwordAuthorizedSites = this._crypto.decrypt(
        aCredential.encryptedPasswordAuthorizedSites
      );
      aCredential.properties = this._crypto.decrypt(
        aCredential.encryptedProperties
      );
      // Verify unknownFields actually has a value
      if (aCredential.encryptedUnknownFields) {
        aCredential.unknownFields = this._crypto.decrypt(
          aCredential.encryptedUnknownFields
        );
      }
    } catch (e) {
      // If decryption failed (corrupt entry?), just skip it.
      // Rethrow other errors (like canceling entry of a primary pw)
      if (e.result == Cr.NS_ERROR_FAILURE) {
        return aCredential;
      }
      throw e;
    }

    return aCredential;
  }
}

ChromeUtils.defineLazyGetter(SsiStorage_json.prototype, "log", () => {
  let logger = lazy.SsiHelper.createLogger("Ssi storage");
  return logger.log.bind(logger);
});
