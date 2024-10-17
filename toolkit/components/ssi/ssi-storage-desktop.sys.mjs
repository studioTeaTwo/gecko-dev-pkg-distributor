/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SsiStorage_json } from "resource://gre/modules/ssi-storage-json.sys.mjs";

export class SsiStorage extends SsiStorage_json {
  static #storage = null;

  static create(callback) {
    if (!SsiStorage.#storage) {
      SsiStorage.#storage = new SsiStorage();
      SsiStorage.#storage.initialize().then(callback);
    } else if (callback) {
      callback();
    }

    return SsiStorage.#storage;
  }
}
