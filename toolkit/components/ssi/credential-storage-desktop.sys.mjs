/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CredentialStorage_json } from "resource://gre/modules/credential-storage-json.sys.mjs";

export class CredentialStorage extends CredentialStorage_json {
  static #storage = null;

  static create(callback) {
    if (!CredentialStorage.#storage) {
      CredentialStorage.#storage = new CredentialStorage();
      CredentialStorage.#storage.initialize().then(callback);
    } else if (callback) {
      callback();
    }

    return CredentialStorage.#storage;
  }
}
