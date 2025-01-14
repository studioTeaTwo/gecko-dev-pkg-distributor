/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Handles serialization of the data and persistence into a file.
 *
 * The file is stored in JSON format, without indentation, using UTF-8 encoding.
 * With indentation applied, the file would look like this:
 *
 * {
 *   "credentials": [
 *     {
 *       "id": 2,
 *       "protocolName": "bitcoin",
 *       "credentialName": "bip39",
 *       "primary": "true",
 *       "encryptedSecret": "...",
 *       "encryptedIdentifier": "...",
 *       "encryptedTrustedSites": [{ url: "http://localhost", name: "site name", permissions: { read: true, write: true, admin: true }}],
 *       "encryptedPasswordAuthorizedSites": [{ url: "http://localhost", expiryTime: 1736756527899, permissions: {...}}],
 *       "encryptedProperties": "...",
 *       "guid": "...",
 *       "encType": 1,
 *       "timeCreated": 1262304000000,
 *       "timeLastUsed": 1262304000000,
 *       "timeSecretChanged": 1262476800000,
 *       "timesUsed": 1
 *        // only present if other clients had fields we didn't know about
 *       "encryptedUnknownFields: "...",
 *     },
 *     {
 *       "id": 4,
 *       (...)
 *     }
 *   ],
 *   "nextId": 10,
 *   "version": 1
 * }
 */

// Globals

import { JSONFile } from "resource://gre/modules/JSONFile.sys.mjs";

/**
 * Current data version assigned by the code that last touched the data.
 *
 * This number should be updated only when it is important to understand whether
 * an old version of the code has touched the data, for example to execute an
 * update logic.  In most cases, this number should not be changed, in
 * particular when no special one-time update logic is needed.
 *
 * For example, this number should NOT be changed when a new optional field is
 * added to a credential entry.
 */
const kDataVersion = 1;

// SsiStore

/**
 * Inherits from JSONFile and handles serialization of credential-related data and
 * persistence into a file.
 *
 * @param aPath
 *        String containing the file path where data should be saved.
 */
export function SsiStore(aPath) {
  JSONFile.call(this, {
    path: aPath,
    dataPostProcessor: this._dataPostProcessor.bind(this),
  });
}

SsiStore.prototype = Object.create(JSONFile.prototype);
SsiStore.prototype.constructor = SsiStore;

SsiStore.prototype._save = async function () {
  await JSONFile.prototype._save.call(this);
  // Notify tests that writes to the credential store is complete.
  Services.obs.notifyObservers(null, "ssi-storage-updated");
};

/**
 * Synchronously work on the data just loaded into memory.
 */
SsiStore.prototype._dataPostProcessor = function (data) {
  if (data.nextId === undefined) {
    data.nextId = 1;
  }

  // Create any arrays that are not present in the saved file.
  if (!data.credentials) {
    data.credentials = [];
  }

  // Migrate
  if (!("version" in data) || data.version < 1) {
    /* empty */
  }

  // Indicate that the current version of the code has touched the file.
  data.version = kDataVersion;

  return data;
};
