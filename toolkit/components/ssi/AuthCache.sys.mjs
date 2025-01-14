/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * A key-value, on-memory store to use for authorization in API internal layer
 * (and cache sync from about:selfsovereignidentity).
 * It's singleton instance and should ideally be only on parent process.
 *
 * key: `${credential.protocolName}:${credential.credentialName}:${credential.identifier}`
 * value: {
 *   trustedSites: credential.trustedSites,
 *   passwordAuthorizedSites: credential.passwordAuthorizedSites
 * }
 */
class _AuthCache {
  constructor() {
    this.initialized = false;
    this._cache = new Map();

    const onSearchComplete = credentials => {
      credentials.forEach(credential => {
        this._cache.set(
          `${credential.protocolName}:${credential.credentialName}:${credential.identifier}`,
          {
            trustedSites: JSON.parse(credential.trustedSites),
            passwordAuthorizedSites: JSON.parse(
              credential.passwordAuthorizedSites
            ),
          }
        );
      });
      this.initialized = true;
    };
    Services.ssi.getAllCredentialsWithCallback({ onSearchComplete });
  }

  has(key) {
    return this._cache.has(key);
  }

  get(key) {
    return this._cache.get(key);
  }

  /**
   * Update the kv cache together with the persistence (ssi store).
   * If previous value is the same, don't update the ssi store. This becomes important when expiration preference
   * of passwordAuthorizedSites (selfsovereignidentity.[protocolName].primarypassword.toApps.expiryTime) is 0.
   *
   * @param {string} key
   * @param {Object} value - Only new values from the API, all values from about:selfsovereignidentity
   * @param {boolean} [fromAbout=false] - Updates from about:selfsovereignidentity. In this case don't need to persist.
   */
  async set(key, value, fromAbout = false) {
    const prevValue = this.get(key);
    if (JSON.stringify(prevValue) === JSON.stringify(value)) {
      throw new Error("No changed value.");
    }

    // Build the new value
    const newValue = JSON.parse(
      JSON.stringify(prevValue).replace(/^''$/g, '"')
    ); // TODO(ssb): investigate
    const keys = key.split(":");
    let count = 0;
    const notPersistent = [];
    function update(site, sort) {
      const idx = prevValue[sort].findIndex(
        oldSite => oldSite.url === site.url
      );
      if (idx >= 0) {
        if (JSON.stringify(site) === JSON.stringify(prevValue[sort][idx])) {
          // noop
          notPersistent.push(true);
        } else {
          // update
          newValue[sort][idx] = {
            ...prevValue[sort][idx],
            ...site,
          };
        }
      } else {
        // create
        newValue[sort].push(site);
      }
    }
    if (Object.keys(value).includes("trustedSites")) {
      count += value.trustedSites.length;
      value.trustedSites.forEach(site => update(site, "trustedSites"));
    }
    if (Object.keys(value).includes("passwordAuthorizedSites")) {
      count += value.passwordAuthorizedSites.length;
      value.passwordAuthorizedSites.forEach(site =>
        update(site, "passwordAuthorizedSites")
      );
    }

    // Update cache
    this._cache.set(key, newValue);

    if (fromAbout || count === notPersistent.length) {
      return;
    }

    // Persist
    const old = await Services.ssi.searchCredentialsAsync({
      protocolName: keys[0],
      credentialName: keys[1],
      identifier: keys[2],
    });
    let modifiedCredential = old[0].clone();
    if (Object.keys(value).includes("trustedSites")) {
      modifiedCredential.trustedSites = JSON.stringify(newValue.trustedSites);
    }
    if (Object.keys(value).includes("passwordAuthorizedSites")) {
      modifiedCredential.passwordAuthorizedSites = JSON.stringify(
        newValue.passwordAuthorizedSites
      );
    }
    Services.ssi.modifyCredential(old[0], modifiedCredential);
  }

  // Only for cach sync from about:selfsovereignidentity, don't need to persist.
  delete(key) {
    this._cache.delete(key);
  }

  // Only for cach sync from about:selfsovereignidentity, don't need to persist.
  reset() {
    this._cache = new Map();
  }
}

/**
 * AuthCache - singleton instance
 */
export const AuthCache = new _AuthCache();
