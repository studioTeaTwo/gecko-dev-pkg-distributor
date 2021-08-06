/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

const log = console.createInstance({
  prefix: "Moat",
  maxLogLevelPref: "browser.torMoat.loglevel",
});

ChromeUtils.defineESModuleGetters(lazy, {
  DomainFrontRequestBuilder:
    "resource://gre/modules/DomainFrontedRequests.sys.mjs",
  DomainFrontRequestCancelledError:
    "resource://gre/modules/DomainFrontedRequests.sys.mjs",
  TorBridgeSource: "resource://gre/modules/TorSettings.sys.mjs",
});

const TorLauncherPrefs = Object.freeze({
  bridgedb_front: "extensions.torlauncher.bridgedb_front",
  bridgedb_reflector: "extensions.torlauncher.bridgedb_reflector",
  moat_service: "extensions.torlauncher.moat_service",
});

/**
 * @typedef {Object} MoatBridges
 *
 * Bridge settings that can be passed to TorSettings.bridges.
 *
 * @property {number} source - The `TorBridgeSource` type.
 * @property {string} [builtin_type] - The built-in bridge type.
 * @property {string[]} [bridge_strings] - The bridge lines.
 */

/**
 * @typedef {Object} MoatSettings
 *
 * The settings returned by Moat.
 *
 * @property {MoatBridges[]} bridgesList - The list of bridges found.
 * @property {string} [country] - The detected country (region).
 */

/**
 * @typedef {Object} CaptchaChallenge
 *
 * The details for a captcha challenge.
 *
 * @property {string} transport - The transport type selected by the Moat
 *   server.
 * @property {string} image - A base64 encoded jpeg with the captcha to
 *   complete.
 * @property {string} challenge - A nonce/cookie string associated with this
 * request.
 */

/**
 * Constructs JSON objects and sends requests over Moat.
 * The documentation about the JSON schemas to use are available at
 * https://gitlab.torproject.org/tpo/anti-censorship/rdsys/-/blob/main/doc/moat.md.
 */
export class MoatRPC {
  #requestBuilder = null;

  async init() {
    if (this.#requestBuilder !== null) {
      return;
    }

    const reflector = Services.prefs.getStringPref(
      TorLauncherPrefs.bridgedb_reflector
    );
    const front = Services.prefs.getStringPref(TorLauncherPrefs.bridgedb_front);
    this.#requestBuilder = new lazy.DomainFrontRequestBuilder();
    try {
      await this.#requestBuilder.init(reflector, front);
    } catch (e) {
      this.#requestBuilder = null;
      throw e;
    }
  }

  async uninit() {
    await this.#requestBuilder?.uninit();
    this.#requestBuilder = null;
  }

  /**
   * @typedef {Object} MoatResult
   *
   * The result of a Moat request.
   *
   * @property {any} response - The parsed JSON response from the Moat server,
   *   or `undefined` if the request was cancelled.
   * @property {boolean} cancelled - Whether the request was cancelled.
   */

  /**
   * Make a request to Moat.
   *
   * @param {string} procedure - The name of the procedure.
   * @param {object} args - The arguments to pass in as a JSON string.
   * @param {AbortSignal} [abortSignal] - An optional signal to be able to abort
   * the request early.
   * @returns {MoatResult} - The result of the request.
   */
  async #makeRequest(procedure, args, abortSignal) {
    const procedureURIString = `${Services.prefs.getStringPref(
      TorLauncherPrefs.moat_service
    )}/${procedure}`;
    log.info(`Making request to ${procedureURIString}:`, args);
    let response = undefined;
    let cancelled = false;
    try {
      response = JSON.parse(
        await this.#requestBuilder.buildRequest(procedureURIString, {
          method: "POST",
          contentType: "application/vnd.api+json",
          body: JSON.stringify(args),
          signal: abortSignal,
        })
      );
      log.info(`Response to ${procedureURIString}:`, response);
    } catch (e) {
      if (abortSignal && e instanceof lazy.DomainFrontRequestCancelledError) {
        log.info(`Request to ${procedureURIString} cancelled`);
        cancelled = true;
      } else {
        throw e;
      }
    }
    return { response, cancelled };
  }

  /**
   * Request a CAPTCHA challenge.
   *
   * @param {string[]} transports - List of transport strings available to us
   *   eg: ["obfs4", "meek"].
   * @param {AbortSignal} abortSignal - A signal to abort the request early.
   * @returns {?CaptchaChallenge} - The captcha challenge, or `null` if the
   *   request was aborted by the caller.
   */
  async fetch(transports, abortSignal) {
    if (
      // ensure this is an array
      Array.isArray(transports) &&
      // ensure array has values
      !!transports.length &&
      // ensure each value in the array is a string
      transports.reduce((acc, cur) => acc && typeof cur === "string", true)
    ) {
      const args = {
        data: [
          {
            version: "0.1.0",
            type: "client-transports",
            supported: transports,
          },
        ],
      };
      const { response, cancelled } = await this.#makeRequest(
        "fetch",
        args,
        abortSignal
      );
      if (cancelled) {
        return null;
      }

      if ("errors" in response) {
        const code = response.errors[0].code;
        const detail = response.errors[0].detail;
        throw new Error(`MoatRPC: ${detail} (${code})`);
      }

      const transport = response.data[0].transport;
      const image = response.data[0].image;
      const challenge = response.data[0].challenge;

      return { transport, image, challenge };
    }
    throw new Error("MoatRPC: fetch() expects a non-empty array of strings");
  }

  /**
   * Submit an answer for a previous CAPTCHA fetch to get bridges.
   *
   * @param {string} transport - The transport associated with the fetch.
   * @param {string} challenge - The nonce string associated with the fetch.
   * @param {string} solution - The solution to the CAPTCHA.
   * @param {AbortSignal} abortSignal - A signal to abort the request early.
   * @returns {?string[]} - The bridge lines for a correct solution, or `null`
   *   if the solution was incorrect or the request was aborted by the caller.
   */
  async check(transport, challenge, solution, abortSignal) {
    const args = {
      data: [
        {
          id: "2",
          version: "0.1.0",
          type: "moat-solution",
          transport,
          challenge,
          solution,
          qrcode: "false",
        },
      ],
    };
    const { response, cancelled } = await this.#makeRequest(
      "check",
      args,
      abortSignal
    );
    if (cancelled) {
      return null;
    }

    if ("errors" in response) {
      const code = response.errors[0].code;
      const detail = response.errors[0].detail;
      if (code == 419 && detail === "The CAPTCHA solution was incorrect.") {
        return null;
      }

      throw new Error(`MoatRPC: ${detail} (${code})`);
    }

    return response.data[0].bridges;
  }

  /**
   * Extract bridges from the received Moat settings object.
   *
   * @param {Object} settings - The received settings.
   * @return {MoatBridge} The extracted bridges.
   */
  #extractBridges(settings) {
    if (!("bridges" in settings)) {
      throw new Error("Expected to find `bridges` in the settings object.");
    }
    const bridges = {};
    switch (settings.bridges.source) {
      case "builtin":
        bridges.source = lazy.TorBridgeSource.BuiltIn;
        bridges.builtin_type = String(settings.bridges.type);
        // Ignore the bridge_strings argument since we will use our built-in
        // bridge strings instead.
        break;
      case "bridgedb":
        bridges.source = lazy.TorBridgeSource.BridgeDB;
        if (settings.bridges.bridge_strings?.length) {
          bridges.bridge_strings = Array.from(
            settings.bridges.bridge_strings,
            item => String(item)
          );
        } else {
          throw new Error(
            "Received no bridge-strings for BridgeDB bridge source"
          );
        }
        break;
      default:
        throw new Error(
          `Unexpected bridge source '${settings.bridges.source}'`
        );
    }
    return bridges;
  }

  /**
   * Extract a list of bridges from the received Moat settings object.
   *
   * @param {Object} settings - The received settings.
   * @return {MoatBridge[]} The list of extracted bridges.
   */
  #extractBridgesList(settingsList) {
    const bridgesList = [];
    for (const settings of settingsList) {
      try {
        bridgesList.push(this.#extractBridges(settings));
      } catch (ex) {
        log.error(ex);
      }
    }
    return bridgesList;
  }

  /**
   * Request tor settings for the user optionally based on their location
   * (derived from their IP). Takes the following parameters:
   *
   * @param {string[]} transports - A list of transports we support.
   * @param {?string} country - The region to request bridges for, as an
   *   ISO 3166-1 alpha-2 region code, or `null` to have the server
   *   automatically determine the region.
   * @param {AbortSignal} abortSignal - A signal to abort the request early.
   * @returns {?MoatSettings} - The returned settings from the server, or `null`
   *   if the region could not be determined by the server or the caller
   *   cancelled the request.
   */
  async circumvention_settings(transports, country, abortSignal) {
    const args = {
      transports: transports ? transports : [],
      country,
    };
    const { response, cancelled } = await this.#makeRequest(
      "circumvention/settings",
      args,
      abortSignal
    );
    if (cancelled) {
      return null;
    }
    let settings = {};
    if ("errors" in response) {
      const code = response.errors[0].code;
      const detail = response.errors[0].detail;
      if (code == 406) {
        log.error(
          "MoatRPC::circumvention_settings(): Cannot automatically determine user's country-code"
        );
        // cannot determine user's country
        return null;
      }

      throw new Error(`MoatRPC: ${detail} (${code})`);
    } else if ("settings" in response) {
      settings.bridgesList = this.#extractBridgesList(response.settings);
    }
    if ("country" in response) {
      settings.country = response.country;
    }
    return settings;
  }

  // Request a list of country codes with available censorship circumvention
  // settings.
  //
  // returns an array of ISO 3166-1 alpha-2 country codes which we can query
  // settings for.
  async circumvention_countries() {
    const args = {};
    const { response } = await this.#makeRequest(
      "circumvention/countries",
      args
    );
    return response;
  }

  // Request a copy of the builtin bridges, takes the following parameters:
  // - transports: optional, an array of transports we would like the latest
  //   bridge strings for; if empty (or not given) returns all of them
  //
  // returns a map whose keys are pluggable transport types and whose values are
  // arrays of bridge strings for that type
  async circumvention_builtin(transports) {
    const args = {
      transports: transports ? transports : [],
    };
    const { response } = await this.#makeRequest("circumvention/builtin", args);
    if ("errors" in response) {
      const code = response.errors[0].code;
      const detail = response.errors[0].detail;
      throw new Error(`MoatRPC: ${detail} (${code})`);
    }

    let map = new Map();
    for (const [transport, bridge_strings] of Object.entries(response)) {
      map.set(transport, bridge_strings);
    }

    return map;
  }

  /**
   * Request a copy of the default/fallback bridge settings.
   *
   * @param {string[]} transports - A list of transports we support.
   * @param {AbortSignal} abortSignal - A signal to abort the request early.
   * @returns {?MoatBridges[]} - The list of bridges found, or `null` if the
   *   caller cancelled the request.
   */
  async circumvention_defaults(transports, abortSignal) {
    const args = {
      transports: transports ? transports : [],
    };
    const { response, cancelled } = await this.#makeRequest(
      "circumvention/defaults",
      args,
      abortSignal
    );
    if (cancelled) {
      return null;
    }
    if ("errors" in response) {
      const code = response.errors[0].code;
      const detail = response.errors[0].detail;
      throw new Error(`MoatRPC: ${detail} (${code})`);
    } else if ("settings" in response) {
      return this.#extractBridgesList(response.settings);
    }
    return [];
  }
}
