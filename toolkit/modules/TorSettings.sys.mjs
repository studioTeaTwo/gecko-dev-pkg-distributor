/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  TorLauncherUtil: "resource://gre/modules/TorLauncherUtil.sys.mjs",
  Lox: "resource://gre/modules/Lox.sys.mjs",
  LoxTopics: "resource://gre/modules/Lox.sys.mjs",
  TorParsers: "resource://gre/modules/TorParsers.sys.mjs",
  TorProviderBuilder: "resource://gre/modules/TorProviderBuilder.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () => {
  return console.createInstance({
    maxLogLevelPref: "browser.torsettings.log_level",
    prefix: "TorSettings",
  });
});

/* TorSettings observer topics */
export const TorSettingsTopics = Object.freeze({
  Ready: "torsettings:ready",
  SettingsChanged: "torsettings:settings-changed",
});

/* Prefs used to store settings in TorBrowser prefs */
const TorSettingsPrefs = Object.freeze({
  // NOTE: torbrowser.settings.quickstart.enabled used to be managed by
  // TorSettings but was moved to TorConnect.quickstart in tor-browser#41921.
  bridges: {
    /* bool:  does tor use bridges */
    enabled: "torbrowser.settings.bridges.enabled",
    /* int: See TorBridgeSource */
    source: "torbrowser.settings.bridges.source",
    /* string: output of crypto.randomUUID() */
    lox_id: "torbrowser.settings.bridges.lox_id",
    /* string: obfs4|meek-azure|snowflake|etc */
    builtin_type: "torbrowser.settings.bridges.builtin_type",
    /* preference branch: each child branch should be a bridge string */
    bridge_strings: "torbrowser.settings.bridges.bridge_strings",
  },
  proxy: {
    /* bool: does tor use a proxy */
    enabled: "torbrowser.settings.proxy.enabled",
    /* See TorProxyType */
    type: "torbrowser.settings.proxy.type",
    /* string: proxy server address */
    address: "torbrowser.settings.proxy.address",
    /* int: [1,65535], proxy port */
    port: "torbrowser.settings.proxy.port",
    /* string: username */
    username: "torbrowser.settings.proxy.username",
    /* string: password */
    password: "torbrowser.settings.proxy.password",
  },
  firewall: {
    /* bool: does tor have a port allow list */
    enabled: "torbrowser.settings.firewall.enabled",
    /* string: comma-delimitted list of port numbers */
    allowed_ports: "torbrowser.settings.firewall.allowed_ports",
  },
});

export const TorBridgeSource = Object.freeze({
  Invalid: -1,
  BuiltIn: 0,
  BridgeDB: 1,
  UserProvided: 2,
  Lox: 3,
});

export const TorProxyType = Object.freeze({
  Invalid: -1,
  Socks4: 0,
  Socks5: 1,
  HTTPS: 2,
});

/**
 * Split a blob of bridge lines into an array with single lines.
 * Lines are delimited by \r\n or \n and each bridge string can also optionally
 * have 'bridge' at the beginning.
 * We split the text by \r\n, we trim the lines, remove the bridge prefix.
 *
 * @param {string} bridgeLines The text with the lines
 * @returns {string[]} An array where each bridge line is an item
 */
function splitBridgeLines(bridgeLines) {
  // Split on the newline and for each bridge string: trim, remove starting
  // 'bridge' string.
  // Replace whitespace with standard " ".
  // NOTE: We only remove the bridge string part if it is followed by a
  // non-whitespace.
  return bridgeLines.split(/\r?\n/).map(val =>
    val
      .trim()
      .replace(/^bridge\s+(\S)/i, "$1")
      .replace(/\s+/, " ")
  );
}

/**
 * @typedef {Object} BridgeValidationResult
 *
 * @property {integer[]} errorLines - The lines that contain errors. Counting
 *   from 1.
 * @property {boolean} empty - Whether the given string contains no bridges.
 * @property {string[]} validBridges - The valid bridge lines found.
 */
/**
 * Validate the given bridge lines.
 *
 * @param {string} bridgeLines - The bridge lines to validate, separated by
 *   newlines.
 *
 * @returns {BridgeValidationResult}
 */
export function validateBridgeLines(bridgeLines) {
  let empty = true;
  const errorLines = [];
  const validBridges = [];
  for (const [index, bridge] of splitBridgeLines(bridgeLines).entries()) {
    if (!bridge) {
      // Empty line.
      continue;
    }
    empty = false;
    try {
      // TODO: Have a more comprehensive validation parser.
      lazy.TorParsers.parseBridgeLine(bridge);
    } catch {
      errorLines.push(index + 1);
      continue;
    }
    validBridges.push(bridge);
  }
  return { empty, errorLines, validBridges };
}

/**
 * Return a shuffled (Fisher-Yates) copy of an array.
 *
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
function arrayShuffle(array) {
  array = [...array];
  for (let i = array.length - 1; i > 0; --i) {
    // number n such that 0.0 <= n < 1.0
    const n = Math.random();
    // integer j such that 0 <= j <= i
    const j = Math.floor(n * (i + 1));

    // swap values at indices i and j
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}

/* TorSettings module */

class TorSettingsImpl {
  /**
   * The underlying settings values.
   *
   * @type {object}
   */
  #settings = {
    bridges: {
      /**
       * Whether the bridges are enabled or not.
       *
       * @type {boolean}
       */
      enabled: false,
      source: TorBridgeSource.Invalid,
      /**
       * The lox id is used with the Lox "source", and remains set with the
       * stored value when other sources are used.
       *
       * @type {string}
       */
      lox_id: "",
      /**
       * The built-in type to use when using the BuiltIn "source", or empty when
       * using any other source.
       *
       * @type {string}
       */
      builtin_type: "",
      /**
       * The current bridge strings.
       *
       * Can only be non-empty if the "source" is not Invalid.
       *
       * @type {Array<string>}
       */
      bridge_strings: [],
    },
    proxy: {
      enabled: false,
      type: TorProxyType.Invalid,
      address: "",
      port: 0,
      username: "",
      password: "",
    },
    firewall: {
      enabled: false,
      allowed_ports: [],
    },
  };

  /**
   * Temporary bridge settings to apply instead of #settings.bridges.
   *
   * @type {?Object}
   */
  #temporaryBridgeSettings = null;

  /**
   * The recommended pluggable transport.
   *
   * @type {string}
   */
  #recommendedPT = "";

  /**
   * The bridge lines for built-in bridges.
   * Keys are pluggable transports, and values are arrays of bridge lines.
   *
   * @type {Object.<string, string[]>}
   */
  #builtinBridges = {};

  /**
   * A promise that resolves once we are initialized, or throws if there was an
   * initialization error.
   *
   * @type {Promise}
   */
  #initializedPromise;
  /**
   * Resolve callback of the initializedPromise.
   */
  #initComplete;
  /**
   * Reject callback of the initializedPromise.
   */
  #initFailed;
  /**
   * Tell whether the initializedPromise has been resolved.
   * We keep this additional member to avoid making everything async.
   *
   * @type {boolean}
   */
  #initialized = false;

  /**
   * Whether uninit cleanup has been called.
   *
   * @type {boolean}
   */
  #uninitCalled = false;

  /**
   * Whether Lox was initialized.
   *
   * @type {boolean}
   */
  #initializedLox = false;

  /**
   * Whether observers were initialized.
   *
   * @type {boolean}
   */
  #initializedObservers = false;

  constructor() {
    this.#initializedPromise = new Promise((resolve, reject) => {
      this.#initComplete = resolve;
      this.#initFailed = reject;
    });

    // Add some read-only getters for the #settings object.
    // E.g. TorSetting.#settings.bridges.source is exposed publicly as
    // TorSettings.bridges.source.
    for (const groupname in this.#settings) {
      const publicGroup = {};
      for (const name in this.#settings[groupname]) {
        // Public group only has a getter for the property.
        Object.defineProperty(publicGroup, name, {
          get: () => {
            this.#checkIfInitialized();
            return structuredClone(this.#settings[groupname][name]);
          },
          set: () => {
            throw new Error(
              `TorSettings.${groupname}.${name} cannot be set directly`
            );
          },
        });
      }
      // The group object itself should not be writable.
      Object.preventExtensions(publicGroup);
      Object.defineProperty(this, groupname, {
        writable: false,
        value: publicGroup,
      });
    }
  }

  /**
   * The proxy URI for the current settings, or `null` if no proxy is
   * configured.
   *
   * @type {?string}
   */
  get proxyUri() {
    const { type, address, port, username, password } = this.#settings.proxy;
    switch (type) {
      case TorProxyType.Socks4:
        return `socks4a://${address}:${port}`;
      case TorProxyType.Socks5:
        if (username) {
          return `socks5://${username}:${password}@${address}:${port}`;
        }
        return `socks5://${address}:${port}`;
      case TorProxyType.HTTPS:
        if (username) {
          return `http://${username}:${password}@${address}:${port}`;
        }
        return `http://${address}:${port}`;
    }
    return null;
  }

  /**
   * Regular expression for a decimal non-negative integer.
   *
   * @type {RegExp}
   */
  #portRegex = /^[0-9]+$/;
  /**
   * Parse a string as a port number.
   *
   * @param {string|integer} val - The value to parse.
   * @param {boolean} trim - Whether a string value can be stripped of
   *   whitespace before parsing.
   *
   * @return {integer?} - The port number, or null if the given value was not
   *   valid.
   */
  #parsePort(val, trim) {
    if (typeof val === "string") {
      if (trim) {
        val = val.trim();
      }
      // ensure port string is a valid positive integer
      if (this.#portRegex.test(val)) {
        val = Number.parseInt(val, 10);
      } else {
        throw new Error(`Invalid port string "${val}"`);
      }
    }
    if (!Number.isInteger(val) || val < 1 || val > 65535) {
      throw new Error(`Port out of range: ${val}`);
    }
    return val;
  }
  /**
   * Test whether two arrays have equal members and order.
   *
   * @param {Array} val1 - The first array to test.
   * @param {Array} val2 - The second array to compare against.
   *
   * @return {boolean} - Whether the two arrays are equal.
   */
  #arrayEqual(val1, val2) {
    if (val1.length !== val2.length) {
      return false;
    }
    return val1.every((v, i) => v === val2[i]);
  }

  /**
   * Return the bridge lines associated to a certain pluggable transport.
   *
   * @param {string} pt The pluggable transport to return the lines for
   * @returns {string[]} The bridge lines in random order
   */
  #getBuiltinBridges(pt) {
    return this.#builtinBridges[pt] ?? [];
  }

  /**
   * Whether this module is enabled.
   *
   * @type {boolean}
   */
  get enabled() {
    return lazy.TorLauncherUtil.shouldStartAndOwnTor;
  }

  /**
   * Load or init our settings.
   */
  async init() {
    if (this.#initialized) {
      lazy.logger.warn("Called init twice.");
      await this.#initializedPromise;
      return;
    }
    try {
      await this.#initInternal();
      this.#initialized = true;
      this.#initComplete();
      Services.obs.notifyObservers(null, TorSettingsTopics.Ready);
    } catch (e) {
      this.#initFailed(e);
      throw e;
    }
  }

  /**
   * The actual implementation of the initialization, which is wrapped to make
   * it easier to update initializatedPromise.
   */
  async #initInternal() {
    if (!this.enabled || this.#uninitCalled) {
      // Nothing to do.
      return;
    }

    try {
      const req = await fetch("chrome://global/content/pt_config.json");
      const config = await req.json();
      lazy.logger.debug("Loaded pt_config.json", config);
      this.#recommendedPT = config.recommendedDefault;
      this.#builtinBridges = config.bridges;
      for (const type in this.#builtinBridges) {
        // Shuffle so that Tor Browser users do not all try the built-in bridges
        // in the same order.
        // Only do this once per session. In particular, we don't re-shuffle if
        // changeSettings is called with the same bridges.builtin_type value.
        this.#builtinBridges[type] = arrayShuffle(this.#builtinBridges[type]);
      }
    } catch (e) {
      lazy.logger.error("Could not load the built-in PT config.", e);
    }

    // `uninit` may have been called whilst we awaited pt_config.
    if (this.#uninitCalled) {
      lazy.logger.warn("unint was called before init completed.");
      return;
    }

    // Initialize this before loading from prefs because we need Lox initialized
    // before any calls to Lox.getBridges().
    if (!lazy.TorLauncherUtil.isAndroid) {
      try {
        // Set as initialized before calling to ensure it is cleaned up by our
        // `uninit` method.
        this.#initializedLox = true;
        await lazy.Lox.init();
      } catch (e) {
        lazy.logger.error("Could not initialize Lox.", e);
      }
    }

    // `uninit` may have been called whilst we awaited Lox.init.
    if (this.#uninitCalled) {
      lazy.logger.warn("unint was called before init completed.");
      return;
    }

    this.#loadFromPrefs();
    // We do not pass on the loaded settings to the TorProvider yet. Instead
    // TorProvider will ask for these once it has initialised.

    Services.obs.addObserver(this, lazy.LoxTopics.UpdateBridges);
    this.#initializedObservers = true;

    lazy.logger.info("Ready");
  }

  /**
   * Unload or uninit our settings.
   */
  async uninit() {
    if (this.#uninitCalled) {
      lazy.logger.warn("Called uninit twice");
      return;
    }

    this.#uninitCalled = true;
    // NOTE: We do not reset #initialized to false because we want it to remain
    // in place for external callers, and we do not want `#initInternal` to be
    // re-entered.

    if (this.#initializedObservers) {
      Services.obs.removeObserver(this, lazy.LoxTopics.UpdateBridges);
    }
    if (this.#initializedLox) {
      await lazy.Lox.uninit();
    }
  }

  observe(subject, topic) {
    switch (topic) {
      case lazy.LoxTopics.UpdateBridges:
        if (
          this.#settings.bridges.lox_id &&
          this.#settings.bridges.source === TorBridgeSource.Lox
        ) {
          // Re-trigger the call to lazy.Lox.getBridges.
          // FIXME: This can compete with TorConnect to reach TorProvider.
          // tor-browser#42316
          this.changeSettings({
            bridges: {
              source: TorBridgeSource.Lox,
              lox_id: this.#settings.bridges.lox_id,
            },
          });
        }
        break;
    }
  }

  /**
   * Check whether the module is enabled and successfully initialized, and throw
   * if it is not.
   */
  #checkIfInitialized() {
    if (!this.enabled) {
      throw new Error("TorSettings is not enabled");
    }
    if (!this.#initialized) {
      lazy.logger.trace("Not initialized code path.");
      throw new Error(
        "TorSettings has not been initialized yet, or its initialization failed"
      );
    }
  }

  /**
   * Tell whether TorSettings has been successfully initialized.
   *
   * @returns {boolean}
   */
  get initialized() {
    return this.#initialized;
  }

  /**
   * A promise that resolves once we are initialized, or throws if there was an
   * initialization error.
   *
   * @type {Promise}
   */
  get initializedPromise() {
    return this.#initializedPromise;
  }

  /**
   * Load our settings from prefs.
   */
  #loadFromPrefs() {
    lazy.logger.debug("loadFromPrefs()");

    /* Bridges */
    const bridges = {};
    bridges.enabled = Services.prefs.getBoolPref(
      TorSettingsPrefs.bridges.enabled,
      false
    );
    bridges.source = Services.prefs.getIntPref(
      TorSettingsPrefs.bridges.source,
      TorBridgeSource.Invalid
    );
    switch (bridges.source) {
      case TorBridgeSource.BridgeDB:
      case TorBridgeSource.UserProvided:
        bridges.bridge_strings = Services.prefs
          .getBranch(TorSettingsPrefs.bridges.bridge_strings)
          .getChildList("")
          .map(pref =>
            Services.prefs.getStringPref(
              `${TorSettingsPrefs.bridges.bridge_strings}${pref}`
            )
          );
        break;
      case TorBridgeSource.BuiltIn:
        // bridge_strings is set via builtin_type.
        bridges.builtin_type = Services.prefs.getStringPref(
          TorSettingsPrefs.bridges.builtin_type,
          ""
        );
        break;
      case TorBridgeSource.Lox:
        // bridge_strings is set via lox id.
        bridges.lox_id = Services.prefs.getStringPref(
          TorSettingsPrefs.bridges.lox_id,
          ""
        );
        break;
    }
    try {
      this.#fixupBridgeSettings(bridges);
      this.#settings.bridges = bridges;
    } catch (error) {
      lazy.logger.error("Loaded bridge preferences failed", error);
      // Keep the default #settings.bridges.
    }

    /* Proxy */
    const proxy = {};
    proxy.enabled = Services.prefs.getBoolPref(
      TorSettingsPrefs.proxy.enabled,
      false
    );
    if (proxy.enabled) {
      proxy.type = Services.prefs.getIntPref(
        TorSettingsPrefs.proxy.type,
        TorProxyType.Invalid
      );
      proxy.address = Services.prefs.getStringPref(
        TorSettingsPrefs.proxy.address,
        ""
      );
      proxy.port = Services.prefs.getIntPref(TorSettingsPrefs.proxy.port, 0);
      proxy.username = Services.prefs.getStringPref(
        TorSettingsPrefs.proxy.username,
        ""
      );
      proxy.password = Services.prefs.getStringPref(
        TorSettingsPrefs.proxy.password,
        ""
      );
    }
    try {
      this.#fixupProxySettings(proxy);
      this.#settings.proxy = proxy;
    } catch (error) {
      lazy.logger.error("Loaded proxy preferences failed", error);
      // Keep the default #settings.proxy.
    }

    /* Firewall */
    const firewall = {};
    firewall.enabled = Services.prefs.getBoolPref(
      TorSettingsPrefs.firewall.enabled,
      false
    );
    if (firewall.enabled) {
      firewall.allowed_ports = Services.prefs.getStringPref(
        TorSettingsPrefs.firewall.allowed_ports,
        ""
      );
    }
    try {
      this.#fixupFirewallSettings(firewall);
      this.#settings.firewall = firewall;
    } catch (error) {
      lazy.logger.error("Loaded firewall preferences failed", error);
      // Keep the default #settings.firewall.
    }
  }

  /**
   * Save our settings to prefs.
   */
  #saveToPrefs() {
    lazy.logger.debug("saveToPrefs()");

    this.#checkIfInitialized();

    /* Bridges */
    Services.prefs.setBoolPref(
      TorSettingsPrefs.bridges.enabled,
      this.#settings.bridges.enabled
    );
    Services.prefs.setIntPref(
      TorSettingsPrefs.bridges.source,
      this.#settings.bridges.source
    );
    Services.prefs.setStringPref(
      TorSettingsPrefs.bridges.builtin_type,
      this.#settings.bridges.builtin_type
    );
    Services.prefs.setStringPref(
      TorSettingsPrefs.bridges.lox_id,
      this.#settings.bridges.lox_id
    );
    // erase existing bridge strings
    const bridgeBranchPrefs = Services.prefs
      .getBranch(TorSettingsPrefs.bridges.bridge_strings)
      .getChildList("");
    bridgeBranchPrefs.forEach(pref => {
      Services.prefs.clearUserPref(
        `${TorSettingsPrefs.bridges.bridge_strings}${pref}`
      );
    });
    // write new ones
    if (
      this.#settings.bridges.source !== TorBridgeSource.Lox &&
      this.#settings.bridges.source !== TorBridgeSource.BuiltIn
    ) {
      this.#settings.bridges.bridge_strings.forEach((string, index) => {
        Services.prefs.setStringPref(
          `${TorSettingsPrefs.bridges.bridge_strings}.${index}`,
          string
        );
      });
    }
    /* Proxy */
    Services.prefs.setBoolPref(
      TorSettingsPrefs.proxy.enabled,
      this.#settings.proxy.enabled
    );
    if (this.#settings.proxy.enabled) {
      Services.prefs.setIntPref(
        TorSettingsPrefs.proxy.type,
        this.#settings.proxy.type
      );
      Services.prefs.setStringPref(
        TorSettingsPrefs.proxy.address,
        this.#settings.proxy.address
      );
      Services.prefs.setIntPref(
        TorSettingsPrefs.proxy.port,
        this.#settings.proxy.port
      );
      Services.prefs.setStringPref(
        TorSettingsPrefs.proxy.username,
        this.#settings.proxy.username
      );
      Services.prefs.setStringPref(
        TorSettingsPrefs.proxy.password,
        this.#settings.proxy.password
      );
    } else {
      Services.prefs.clearUserPref(TorSettingsPrefs.proxy.type);
      Services.prefs.clearUserPref(TorSettingsPrefs.proxy.address);
      Services.prefs.clearUserPref(TorSettingsPrefs.proxy.port);
      Services.prefs.clearUserPref(TorSettingsPrefs.proxy.username);
      Services.prefs.clearUserPref(TorSettingsPrefs.proxy.password);
    }
    /* Firewall */
    Services.prefs.setBoolPref(
      TorSettingsPrefs.firewall.enabled,
      this.#settings.firewall.enabled
    );
    if (this.#settings.firewall.enabled) {
      Services.prefs.setStringPref(
        TorSettingsPrefs.firewall.allowed_ports,
        this.#settings.firewall.allowed_ports.join(",")
      );
    } else {
      Services.prefs.clearUserPref(TorSettingsPrefs.firewall.allowed_ports);
    }
  }

  /**
   * Push our settings down to the tor provider.
   *
   * Even though this introduces a circular depdency, it makes the API nicer for
   * frontend consumers.
   *
   * @param {boolean} flush - Whether to also flush the settings to disk.
   */
  async #applySettings(flush) {
    const provider = await lazy.TorProviderBuilder.build();
    await provider.writeSettings();
    if (flush) {
      provider.flushSettings();
    }
  }

  /**
   * Fixup the given bridges settings to fill in details, establish the correct
   * types and clean up.
   *
   * May throw if there is an error in the given values.
   *
   * @param {Object} bridges - The bridges settings to fix up.
   */
  #fixupBridgeSettings(bridges) {
    if (!Object.values(TorBridgeSource).includes(bridges.source)) {
      throw new Error(`Not a valid bridge source: "${bridges.source}"`);
    }

    if ("enabled" in bridges) {
      bridges.enabled = Boolean(bridges.enabled);
    }

    // Set bridge_strings
    switch (bridges.source) {
      case TorBridgeSource.UserProvided:
      case TorBridgeSource.BridgeDB:
        // Only accept an Array for UserProvided and BridgeDB bridge_strings.
        break;
      case TorBridgeSource.BuiltIn:
        bridges.builtin_type = String(bridges.builtin_type);
        bridges.bridge_strings = this.#getBuiltinBridges(bridges.builtin_type);
        break;
      case TorBridgeSource.Lox:
        bridges.lox_id = String(bridges.lox_id);
        bridges.bridge_strings = lazy.Lox.getBridges(bridges.lox_id);
        break;
      case TorBridgeSource.Invalid:
        bridges.bridge_strings = [];
        break;
    }

    if (
      !Array.isArray(bridges.bridge_strings) ||
      bridges.bridge_strings.some(str => typeof str !== "string")
    ) {
      throw new Error("bridge_strings should be an Array of strings");
    }

    if (
      bridges.source !== TorBridgeSource.Invalid &&
      !bridges.bridge_strings?.length
    ) {
      throw new Error(
        `Missing bridge_strings for bridge source ${bridges.source}`
      );
    }

    if (bridges.source !== TorBridgeSource.BuiltIn) {
      bridges.builtin_type = "";
    }
    if (bridges.source !== TorBridgeSource.Lox) {
      bridges.lox_id = "";
    }

    if (bridges.source === TorBridgeSource.Invalid) {
      bridges.enabled = false;
    }
  }

  /**
   * Fixup the given proxy settings to fill in details, establish the correct
   * types and clean up.
   *
   * May throw if there is an error in the given values.
   *
   * @param {Object} proxy - The proxy settings to fix up.
   */
  #fixupProxySettings(proxy) {
    proxy.enabled = Boolean(proxy.enabled);
    if (!proxy.enabled) {
      proxy.type = TorProxyType.Invalid;
      proxy.address = "";
      proxy.port = 0;
      proxy.username = "";
      proxy.password = "";
      return;
    }

    if (!Object.values(TorProxyType).includes(proxy.type)) {
      throw new Error(`Invalid proxy type: ${proxy.type}`);
    }
    proxy.port = this.#parsePort(proxy.port, false);
    proxy.address = String(proxy.address);
    proxy.username = String(proxy.username);
    proxy.password = String(proxy.password);
  }

  /**
   * Fixup the given firewall settings to fill in details, establish the correct
   * types and clean up.
   *
   * May throw if there is an error in the given values.
   *
   * @param {Object} firewall - The proxy settings to fix up.
   */
  #fixupFirewallSettings(firewall) {
    firewall.enabled = Boolean(firewall.enabled);
    if (!firewall.enabled) {
      firewall.allowed_ports = [];
      return;
    }

    let allowed_ports = firewall.allowed_ports;
    if (!Array.isArray(allowed_ports)) {
      allowed_ports = allowed_ports === "" ? [] : allowed_ports.split(",");
    }
    // parse and remove duplicates
    const portSet = new Set();

    for (const port of allowed_ports) {
      try {
        portSet.add(this.#parsePort(port, true));
      } catch (e) {
        // Do not throw for individual ports.
        lazy.logger.error(`Failed to parse the port ${port}. Ignoring.`, e);
      }
    }
    firewall.allowed_ports = [...portSet];
  }

  /**
   * Change the Tor settings in use.
   *
   * It is possible to set all settings, or only some sections:
   *
   * + bridges.enabled can be set individually.
   * + bridges.source can be set with a corresponding bridge specification for
   *   the source (bridge_strings, lox_id, builtin_type).
   * + proxy settings can be set as a group.
   * + firewall settings can be set a group.
   *
   * @param {object} newValues - The new setting values, a subset of the
   *   complete settings that should be changed.
   */
  async changeSettings(newValues) {
    lazy.logger.debug("changeSettings()", newValues);
    this.#checkIfInitialized();

    // Make a structured clone since we change the object and may adopt some of
    // the Array values.
    newValues = structuredClone(newValues);

    const completeSettings = structuredClone(this.#settings);
    const changes = [];

    /**
     * Change the given setting to a new value. Does nothing if the new value
     * equals the old one, otherwise the change will be recorded in `changes`.
     *
     * @param {string} group - The group name for the property.
     * @param {string} prop - The property name within the group.
     * @param {any} value - The value to set.
     * @param [Function?] equal - A method to test equality between the old and
     *   new value. Otherwise uses `===` to check equality.
     */
    const changeSetting = (group, prop, value, equal = null) => {
      const currentValue = this.#settings[group][prop];
      if (equal ? equal(currentValue, value) : currentValue === value) {
        return;
      }
      completeSettings[group][prop] = value;
      changes.push(`${group}.${prop}`);
    };

    if ("bridges" in newValues) {
      const changesLength = changes.length;
      if ("source" in newValues.bridges) {
        this.#fixupBridgeSettings(newValues.bridges);
        changeSetting("bridges", "source", newValues.bridges.source);
        changeSetting(
          "bridges",
          "bridge_strings",
          newValues.bridges.bridge_strings,
          this.#arrayEqual
        );
        changeSetting("bridges", "lox_id", newValues.bridges.lox_id);
        changeSetting(
          "bridges",
          "builtin_type",
          newValues.bridges.builtin_type
        );
      } else if ("enabled" in newValues.bridges) {
        // Don't need to fixup all the settings, just need to ensure that the
        // enabled value is compatible with the current source.
        newValues.bridges.enabled = Boolean(newValues.bridges.enabled);
        if (
          newValues.bridges.enabled &&
          completeSettings.bridges.source === TorBridgeSource.Invalid
        ) {
          throw new Error("Cannot enable bridges without a bridge source.");
        }
      }
      if ("enabled" in newValues.bridges) {
        changeSetting("bridges", "enabled", newValues.bridges.enabled);
      }

      if (this.#temporaryBridgeSettings && changes.length !== changesLength) {
        // A change in the bridges settings.
        // We want to clear the temporary bridge settings to ensure that they
        // cannot be used to overwrite these user-provided settings.
        // See tor-browser#41921.
        // NOTE: This should also trigger TorConnect to cancel any ongoing
        // AutoBootstrap that would have otherwise used these settings.
        this.#temporaryBridgeSettings = null;
        lazy.logger.warn(
          "Cleared temporary bridges since bridge settings were changed"
        );
      }
    }

    if ("proxy" in newValues) {
      // proxy settings have to be set as a group.
      this.#fixupProxySettings(newValues.proxy);
      changeSetting("proxy", "enabled", Boolean(newValues.proxy.enabled));
      changeSetting("proxy", "type", newValues.proxy.type);
      changeSetting("proxy", "address", newValues.proxy.address);
      changeSetting("proxy", "port", newValues.proxy.port);
      changeSetting("proxy", "username", newValues.proxy.username);
      changeSetting("proxy", "password", newValues.proxy.password);
    }

    if ("firewall" in newValues) {
      // firewall settings have to be set as a group.
      this.#fixupFirewallSettings(newValues.firewall);
      changeSetting("firewall", "enabled", Boolean(newValues.firewall.enabled));
      changeSetting(
        "firewall",
        "allowed_ports",
        newValues.firewall.allowed_ports,
        this.#arrayEqual
      );
    }

    // No errors so far, so save and commit.
    this.#settings = completeSettings;
    this.#saveToPrefs();

    if (changes.length) {
      Services.obs.notifyObservers(
        { changes },
        TorSettingsTopics.SettingsChanged
      );
    }

    lazy.logger.debug("setSettings result", this.#settings, changes);

    // After we have sent out the notifications for the changed settings and
    // saved the preferences we send the new settings to TorProvider.
    // Some properties are unread by TorProvider. So if only these values change
    // there is no need to re-apply the settings.
    const unreadProps = ["bridges.builtin_type", "bridges.lox_id"];
    const shouldApply = changes.some(prop => !unreadProps.includes(prop));
    if (shouldApply) {
      await this.#applySettings(true);
    }
  }

  /**
   * Get a copy of all our settings.
   *
   * @param {boolean} [useTemporary=false] - Whether the returned settings
   *   should use the temporary bridge settings, if any, instead.
   *
   * @returns {object} A copy of the settings object
   */
  getSettings(useTemporary = false) {
    lazy.logger.debug("getSettings()");
    this.#checkIfInitialized();
    const settings = structuredClone(this.#settings);
    if (useTemporary && this.#temporaryBridgeSettings) {
      // Override the bridge settings with our temporary ones.
      settings.bridges = structuredClone(this.#temporaryBridgeSettings);
    }
    return settings;
  }

  /**
   * Return an array with the pluggable transports for which we have at least a
   * built-in bridge line.
   *
   * @returns {string[]} An array with PT identifiers
   */
  get builtinBridgeTypes() {
    this.#checkIfInitialized();
    const types = Object.keys(this.#builtinBridges);
    const recommendedIndex = types.indexOf(this.#recommendedPT);
    if (recommendedIndex > 0) {
      types.splice(recommendedIndex, 1);
      types.unshift(this.#recommendedPT);
    }
    return types;
  }

  /**
   * Apply some Moat bridges temporarily.
   *
   * These bridges will not yet be saved to settings.
   *
   * @param {MoatBridges} bridges - The bridges to apply.
   */
  async applyTemporaryBridges(bridges) {
    this.#checkIfInitialized();

    if (
      bridges.source !== TorBridgeSource.BuiltIn &&
      bridges.source !== TorBridgeSource.BridgeDB
    ) {
      throw new Error(`Invalid bridge source ${bridges.source}`);
    }

    const bridgeSettings = {
      enabled: true,
      source: bridges.source,
      builtin_type: String(bridges.builtin_type),
      bridge_strings: structuredClone(bridges.bridge_strings),
    };

    this.#fixupBridgeSettings(bridgeSettings);

    // After checks are complete, we commit them.
    this.#temporaryBridgeSettings = bridgeSettings;
    // Do not flush the temporary bridge settings until they are saved.
    await this.#applySettings(false);
  }

  /**
   * Save to current temporary bridges to be permanent instead.
   */
  async saveTemporaryBridges() {
    this.#checkIfInitialized();
    if (!this.#temporaryBridgeSettings) {
      lazy.logger.warn("No temporary bridges to save");
      return;
    }
    const bridgeSettings = this.#temporaryBridgeSettings;
    this.#temporaryBridgeSettings = null;
    await this.changeSettings({ bridges: bridgeSettings });
  }

  /**
   * Clear the current temporary bridges.
   */
  async clearTemporaryBridges() {
    this.#checkIfInitialized();
    if (!this.#temporaryBridgeSettings) {
      lazy.logger.debug("No temporary bridges to clear");
      return;
    }
    this.#temporaryBridgeSettings = null;
    await this.#applySettings();
  }
}

export const TorSettings = new TorSettingsImpl();
