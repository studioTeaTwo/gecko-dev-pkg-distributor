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
  /* bool: are we pulling tor settings from the preferences */
  enabled: "torbrowser.settings.enabled",
  quickstart: {
    /* bool: does tor connect automatically on launch */
    enabled: "torbrowser.settings.quickstart.enabled",
  },
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
    quickstart: {
      enabled: false,
    },
    bridges: {
      enabled: false,
      source: TorBridgeSource.Invalid,
      lox_id: "",
      builtin_type: "",
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
   * Accumulated errors from trying to set settings.
   *
   * Only added to if not null.
   *
   * @type {Array<Error>?}
   */
  #settingErrors = null;

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
   * During some phases of the initialization, allow calling setters and
   * getters without throwing errors.
   *
   * @type {boolean}
   */
  #allowUninitialized = false;

  constructor() {
    this.initializedPromise = new Promise((resolve, reject) => {
      this.#initComplete = resolve;
      this.#initFailed = reject;
    });

    this.#addProperties("quickstart", {
      enabled: {},
    });
    this.#addProperties("bridges", {
      /**
       * Whether the bridges are enabled or not.
       *
       * @type {boolean}
       */
      enabled: {},
      /**
       * The current bridge source.
       *
       * @type {integer}
       */
      source: {
        transform: (val, addError) => {
          if (Object.values(TorBridgeSource).includes(val)) {
            return val;
          }
          addError(`Not a valid bridge source: "${val}"`);
          return TorBridgeSource.Invalid;
        },
      },
      /**
       * The current bridge strings.
       *
       * Can only be non-empty if the "source" is not Invalid.
       *
       * @type {Array<string>}
       */
      bridge_strings: {
        transform: val => {
          if (Array.isArray(val)) {
            return [...val];
          }
          // Split the bridge strings, discarding empty.
          return splitBridgeLines(val).filter(val => val);
        },
        copy: val => [...val],
        equal: (val1, val2) => this.#arrayEqual(val1, val2),
      },
      /**
       * The built-in type to use when using the BuiltIn "source", or empty when
       * using any other source.
       *
       * @type {string}
       */
      builtin_type: {
        callback: (val, addError) => {
          if (!val) {
            return;
          }
          const bridgeStrings = this.getBuiltinBridges(val);
          if (bridgeStrings.length) {
            this.bridges.bridge_strings = bridgeStrings;
            return;
          }

          addError(`No built-in ${val} bridges found`);
          // Set as invalid, which will make the builtin_type "" and set the
          // bridge_strings to be empty at the next #cleanupSettings.
          this.bridges.source = TorBridgeSource.Invalid;
        },
      },
      /**
       * The lox id is used with the Lox "source", and remains set with the stored value when
       * other sources are used.
       *
       * @type {string}
       */
      lox_id: {
        callback: (val, addError) => {
          if (!val) {
            return;
          }
          let bridgeStrings;
          try {
            bridgeStrings = lazy.Lox.getBridges(val);
          } catch (error) {
            addError(`No bridges for lox_id ${val}: ${error?.message}`);
            // Set as invalid, which will make the builtin_type "" and set the
            // bridge_strings to be empty at the next #cleanupSettings.
            this.bridges.source = TorBridgeSource.Invalid;
            return;
          }
          this.bridges.bridge_strings = bridgeStrings;
        },
      },
    });
    this.#addProperties("proxy", {
      enabled: {},
      type: {
        transform: (val, addError) => {
          if (Object.values(TorProxyType).includes(val)) {
            return val;
          }
          addError(`Not a valid proxy type: "${val}"`);
          return TorProxyType.Invalid;
        },
      },
      address: {},
      port: {
        transform: (val, addError) => {
          if (val === 0) {
            // This is a valid value that "unsets" the port.
            // Keep this value without giving a warning.
            // NOTE: In contrast, "0" is not valid.
            return 0;
          }
          // Unset to 0 if invalid null is returned.
          return this.#parsePort(val, false, addError) ?? 0;
        },
      },
      username: {},
      password: {},
      uri: {
        getter: () => {
          const { type, address, port, username, password } = this.proxy;
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
        },
      },
    });
    this.#addProperties("firewall", {
      enabled: {},
      allowed_ports: {
        transform: (val, addError) => {
          if (!Array.isArray(val)) {
            val = val === "" ? [] : val.split(",");
          }
          // parse and remove duplicates
          const portSet = new Set(
            val.map(p => this.#parsePort(p, true, addError))
          );
          // parsePort returns null for failed parses, so remove it.
          portSet.delete(null);
          return [...portSet];
        },
        copy: val => [...val],
        equal: (val1, val2) => this.#arrayEqual(val1, val2),
      },
    });
  }

  /**
   * Clean the setting values after making some changes, so that the values do
   * not contradict each other.
   */
  #cleanupSettings() {
    this.freezeNotifications();
    try {
      if (this.bridges.source === TorBridgeSource.Invalid) {
        this.bridges.enabled = false;
        this.bridges.bridge_strings = [];
      }
      if (!this.bridges.bridge_strings.length) {
        this.bridges.enabled = false;
        this.bridges.source = TorBridgeSource.Invalid;
      }
      if (this.bridges.source !== TorBridgeSource.BuiltIn) {
        this.bridges.builtin_type = "";
      }
      if (this.bridges.source !== TorBridgeSource.Lox) {
        this.bridges.lox_id = "";
      }
      if (!this.proxy.enabled) {
        this.proxy.type = TorProxyType.Invalid;
        this.proxy.address = "";
        this.proxy.port = 0;
        this.proxy.username = "";
        this.proxy.password = "";
      }
      if (!this.firewall.enabled) {
        this.firewall.allowed_ports = [];
      }
    } finally {
      this.thawNotifications();
    }
  }

  /**
   * The current number of freezes applied to the notifications.
   *
   * @type {integer}
   */
  #freezeNotificationsCount = 0;
  /**
   * The queue for settings that have changed. To be broadcast in the
   * notification when not frozen.
   *
   * @type {Set<string>}
   */
  #notificationQueue = new Set();
  /**
   * Send a notification if we have any queued and we are not frozen.
   */
  #tryNotification() {
    if (this.#freezeNotificationsCount || !this.#notificationQueue.size) {
      return;
    }
    Services.obs.notifyObservers(
      { changes: [...this.#notificationQueue] },
      TorSettingsTopics.SettingsChanged
    );
    this.#notificationQueue.clear();
  }
  /**
   * Pause notifications for changes in setting values. This is useful if you
   * need to make batch changes to settings.
   *
   * This should always be paired with a call to thawNotifications once
   * notifications should be released. Usually you should wrap whatever
   * changes you make with a `try` block and call thawNotifications in the
   * `finally` block.
   */
  freezeNotifications() {
    this.#freezeNotificationsCount++;
  }
  /**
   * Release the hold on notifications so they may be sent out.
   *
   * Note, if some other method has also frozen the notifications, this will
   * only release them once it has also called this method.
   */
  thawNotifications() {
    this.#freezeNotificationsCount--;
    this.#tryNotification();
  }
  /**
   * @typedef {object} TorSettingProperty
   *
   * @property {function} [getter] - A getter for the property. If this is
   *   given, the property cannot be set.
   * @property {function} [transform] - Called in the setter for the property,
   *   with the new value given. Should transform the given value into the
   *   right type.
   * @property {function} [equal] - Test whether two values for the property
   *   are considered equal. Otherwise uses `===`.
   * @property {function} [callback] - Called whenever the property value
   *   changes, with the new value given. Should be used to trigger any other
   *   required changes for the new value.
   * @property {function} [copy] - Called whenever the property is read, with
   *   the stored value given. Should return a copy of the value. Otherwise
   *   returns the stored value.
   */
  /**
   * Add properties to the TorSettings instance, to be read or set.
   *
   * @param {string} groupname - The name of the setting group. The given
   *   settings will be accessible from the TorSettings property of the same
   *   name.
   * @param {object.<string, TorSettingProperty>} propParams - An object that
   *   defines the settings to add to this group. The object property names
   *   will be mapped to properties of TorSettings under the given groupname
   *   property. Details about the setting should be described in the
   *   TorSettingProperty property value.
   */
  #addProperties(groupname, propParams) {
    // Create a new object to hold all these settings.
    const group = {};
    for (const name in propParams) {
      const { getter, transform, callback, copy, equal } = propParams[name];
      // Method for adding setting errors.
      const addError = message => {
        message = `TorSettings.${groupname}.${name}: ${message}`;
        lazy.logger.error(message);
        // Only add to #settingErrors if it is not null.
        this.#settingErrors?.push(message);
      };
      Object.defineProperty(group, name, {
        get: getter
          ? () => {
              // Allow getting in loadFromPrefs before we are initialized.
              if (!this.#allowUninitialized) {
                this.#checkIfInitialized();
              }
              return getter();
            }
          : () => {
              // Allow getting in loadFromPrefs before we are initialized.
              if (!this.#allowUninitialized) {
                this.#checkIfInitialized();
              }
              let val = this.#settings[groupname][name];
              if (copy) {
                val = copy(val);
              }
              // Assume string or number value.
              return val;
            },
        set: getter
          ? undefined
          : val => {
              // Allow setting in loadFromPrefs before we are initialized.
              if (!this.#allowUninitialized) {
                this.#checkIfInitialized();
              }
              const prevVal = this.#settings[groupname][name];
              this.freezeNotifications();
              try {
                if (transform) {
                  val = transform(val, addError);
                }
                const isEqual = equal ? equal(val, prevVal) : val === prevVal;
                if (!isEqual) {
                  // Set before the callback.
                  this.#settings[groupname][name] = val;
                  this.#notificationQueue.add(`${groupname}.${name}`);

                  if (callback) {
                    callback(val, addError);
                  }
                }
              } catch (e) {
                addError(e.message);
              } finally {
                this.thawNotifications();
              }
            },
      });
    }
    // The group object itself should not be writable.
    Object.preventExtensions(group);
    Object.defineProperty(this, groupname, {
      writable: false,
      value: group,
    });
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
   * @param {function} addError - Callback to add error messages to.
   *
   * @return {integer?} - The port number, or null if the given value was not
   *   valid.
   */
  #parsePort(val, trim, addError) {
    if (typeof val === "string") {
      if (trim) {
        val = val.trim();
      }
      // ensure port string is a valid positive integer
      if (this.#portRegex.test(val)) {
        val = Number.parseInt(val, 10);
      } else {
        addError(`Invalid port string "${val}"`);
        return null;
      }
    }
    if (!Number.isInteger(val) || val < 1 || val > 65535) {
      addError(`Port out of range: ${val}`);
      return null;
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
  getBuiltinBridges(pt) {
    if (!this.#allowUninitialized) {
      this.#checkIfInitialized();
    }
    // Shuffle so that Tor Browser users do not all try the built-in bridges in
    // the same order.
    return arrayShuffle(this.#builtinBridges[pt] ?? []);
  }

  /**
   * Load or init our settings.
   */
  async init() {
    if (this.#initialized) {
      lazy.logger.warn("Called init twice.");
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
    try {
      const req = await fetch("chrome://global/content/pt_config.json");
      const config = await req.json();
      lazy.logger.debug("Loaded pt_config.json", config);
      this.#recommendedPT = config.recommendedDefault;
      this.#builtinBridges = config.bridges;
    } catch (e) {
      lazy.logger.error("Could not load the built-in PT config.", e);
    }

    // Initialize this before loading from prefs because we need Lox initialized
    // before any calls to Lox.getBridges().
    if (!lazy.TorLauncherUtil.isAndroid) {
      try {
        await lazy.Lox.init();
      } catch (e) {
        lazy.logger.error("Could not initialize Lox.", e);
      }
    }

    if (
      lazy.TorLauncherUtil.shouldStartAndOwnTor &&
      Services.prefs.getBoolPref(TorSettingsPrefs.enabled, false)
    ) {
      // Do not want notifications for initially loaded prefs.
      this.freezeNotifications();
      try {
        this.#allowUninitialized = true;
        this.#loadFromPrefs();
      } finally {
        this.#allowUninitialized = false;
        this.#notificationQueue.clear();
        this.thawNotifications();
      }
    }

    Services.obs.addObserver(this, lazy.LoxTopics.UpdateBridges);

    lazy.logger.info("Ready");
  }

  /**
   * Unload or uninit our settings.
   */
  async uninit() {
    Services.obs.removeObserver(this, lazy.LoxTopics.UpdateBridges);
    await lazy.Lox.uninit();
  }

  observe(subject, topic) {
    switch (topic) {
      case lazy.LoxTopics.UpdateBridges:
        if (this.bridges.lox_id) {
          // Fetch the newest bridges.
          this.bridges.bridge_strings = lazy.Lox.getBridges(
            this.bridges.lox_id
          );
          // No need to save to prefs since bridge_strings is not stored for Lox
          // source. But we do pass on the changes to TorProvider.
          // FIXME: This can compete with TorConnect to reach TorProvider.
          // tor-browser#42316
          this.applySettings();
        }
        break;
    }
  }

  /**
   * Check whether the object has been successfully initialized, and throw if
   * it has not.
   */
  #checkIfInitialized() {
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
   * Load our settings from prefs.
   */
  #loadFromPrefs() {
    lazy.logger.debug("loadFromPrefs()");

    /* Quickstart */
    this.quickstart.enabled = Services.prefs.getBoolPref(
      TorSettingsPrefs.quickstart.enabled,
      false
    );
    /* Bridges */
    this.bridges.enabled = Services.prefs.getBoolPref(
      TorSettingsPrefs.bridges.enabled,
      false
    );
    this.bridges.source = Services.prefs.getIntPref(
      TorSettingsPrefs.bridges.source,
      TorBridgeSource.Invalid
    );
    switch (this.bridges.source) {
      case TorBridgeSource.BridgeDB:
      case TorBridgeSource.UserProvided:
        this.bridges.bridge_strings = Services.prefs
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
        this.bridges.builtin_type = Services.prefs.getStringPref(
          TorSettingsPrefs.bridges.builtin_type,
          ""
        );
        break;
      case TorBridgeSource.Lox:
        // bridge_strings is set via lox id.
        this.bridges.lox_id = Services.prefs.getStringPref(
          TorSettingsPrefs.bridges.lox_id,
          ""
        );
        break;
    }
    /* Proxy */
    this.proxy.enabled = Services.prefs.getBoolPref(
      TorSettingsPrefs.proxy.enabled,
      false
    );
    if (this.proxy.enabled) {
      this.proxy.type = Services.prefs.getIntPref(
        TorSettingsPrefs.proxy.type,
        TorProxyType.Invalid
      );
      this.proxy.address = Services.prefs.getStringPref(
        TorSettingsPrefs.proxy.address,
        ""
      );
      this.proxy.port = Services.prefs.getIntPref(
        TorSettingsPrefs.proxy.port,
        0
      );
      this.proxy.username = Services.prefs.getStringPref(
        TorSettingsPrefs.proxy.username,
        ""
      );
      this.proxy.password = Services.prefs.getStringPref(
        TorSettingsPrefs.proxy.password,
        ""
      );
    }

    /* Firewall */
    this.firewall.enabled = Services.prefs.getBoolPref(
      TorSettingsPrefs.firewall.enabled,
      false
    );
    if (this.firewall.enabled) {
      this.firewall.allowed_ports = Services.prefs.getStringPref(
        TorSettingsPrefs.firewall.allowed_ports,
        ""
      );
    }

    this.#cleanupSettings();
  }

  /**
   * Save our settings to prefs.
   */
  saveToPrefs() {
    lazy.logger.debug("saveToPrefs()");

    this.#checkIfInitialized();
    this.#cleanupSettings();

    /* Quickstart */
    Services.prefs.setBoolPref(
      TorSettingsPrefs.quickstart.enabled,
      this.quickstart.enabled
    );
    /* Bridges */
    Services.prefs.setBoolPref(
      TorSettingsPrefs.bridges.enabled,
      this.bridges.enabled
    );
    Services.prefs.setIntPref(
      TorSettingsPrefs.bridges.source,
      this.bridges.source
    );
    Services.prefs.setStringPref(
      TorSettingsPrefs.bridges.builtin_type,
      this.bridges.builtin_type
    );
    Services.prefs.setStringPref(
      TorSettingsPrefs.bridges.lox_id,
      this.bridges.lox_id
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
      this.bridges.source !== TorBridgeSource.Lox &&
      this.bridges.source !== TorBridgeSource.BuiltIn
    ) {
      this.bridges.bridge_strings.forEach((string, index) => {
        Services.prefs.setStringPref(
          `${TorSettingsPrefs.bridges.bridge_strings}.${index}`,
          string
        );
      });
    }
    /* Proxy */
    Services.prefs.setBoolPref(
      TorSettingsPrefs.proxy.enabled,
      this.proxy.enabled
    );
    if (this.proxy.enabled) {
      Services.prefs.setIntPref(TorSettingsPrefs.proxy.type, this.proxy.type);
      Services.prefs.setStringPref(
        TorSettingsPrefs.proxy.address,
        this.proxy.address
      );
      Services.prefs.setIntPref(TorSettingsPrefs.proxy.port, this.proxy.port);
      Services.prefs.setStringPref(
        TorSettingsPrefs.proxy.username,
        this.proxy.username
      );
      Services.prefs.setStringPref(
        TorSettingsPrefs.proxy.password,
        this.proxy.password
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
      this.firewall.enabled
    );
    if (this.firewall.enabled) {
      Services.prefs.setStringPref(
        TorSettingsPrefs.firewall.allowed_ports,
        this.firewall.allowed_ports.join(",")
      );
    } else {
      Services.prefs.clearUserPref(TorSettingsPrefs.firewall.allowed_ports);
    }

    // all tor settings now stored in prefs :)
    Services.prefs.setBoolPref(TorSettingsPrefs.enabled, true);

    return this;
  }

  /**
   * Push our settings down to the tor provider.
   *
   * Even though this introduces a circular depdency, it makes the API nicer for
   * frontend consumers.
   */
  async applySettings() {
    this.#checkIfInitialized();
    const provider = await lazy.TorProviderBuilder.build();
    await provider.writeSettings(this.getSettings());
  }

  /**
   * Set blocks of settings at once from an object.
   *
   * It is possible to set all settings, or only some sections (e.g., only
   * bridges), but if a key is present, its settings must make sense (e.g., if
   * bridges are enabled, a valid source must be provided).
   *
   * @param {object} settings The settings object to set
   */
  setSettings(settings) {
    lazy.logger.debug("setSettings()");
    this.#checkIfInitialized();

    const backup = this.getSettings();
    const backupNotifications = [...this.#notificationQueue];
    // Start collecting errors.
    this.#settingErrors = [];

    // Hold off on lots of notifications until all settings are changed.
    this.freezeNotifications();
    try {
      if ("quickstart" in settings) {
        this.quickstart.enabled = !!settings.quickstart.enabled;
      }

      if ("bridges" in settings) {
        this.bridges.enabled = !!settings.bridges.enabled;
        // Currently, disabling bridges in the UI does not remove the lines,
        // because we call only the `enabled` setter.
        // So, if the bridge source is undefined but bridges are disabled,
        // do not force Invalid. Instead, keep the current source.
        if (this.bridges.enabled || settings.bridges.source !== undefined) {
          this.bridges.source = settings.bridges.source;
        }
        switch (settings.bridges.source) {
          case TorBridgeSource.BridgeDB:
          case TorBridgeSource.UserProvided:
            this.bridges.bridge_strings = settings.bridges.bridge_strings;
            break;
          case TorBridgeSource.BuiltIn:
            this.bridges.builtin_type = settings.bridges.builtin_type;
            break;
          case TorBridgeSource.Lox:
            this.bridges.lox_id = settings.bridges.lox_id;
            break;
          case TorBridgeSource.Invalid:
            break;
        }
      }

      if ("proxy" in settings) {
        this.proxy.enabled = !!settings.proxy.enabled;
        if (this.proxy.enabled) {
          this.proxy.type = settings.proxy.type;
          this.proxy.address = settings.proxy.address;
          this.proxy.port = settings.proxy.port;
          this.proxy.username = settings.proxy.username;
          this.proxy.password = settings.proxy.password;
        }
      }

      if ("firewall" in settings) {
        this.firewall.enabled = !!settings.firewall.enabled;
        if (this.firewall.enabled) {
          this.firewall.allowed_ports = settings.firewall.allowed_ports;
        }
      }

      this.#cleanupSettings();

      if (this.#settingErrors.length) {
        throw Error(this.#settingErrors.join("; "));
      }
    } catch (ex) {
      // Restore the old settings without any new notifications generated from
      // the above code.
      // NOTE: Since this code is not async, it should not be possible for
      // some other call to TorSettings to change anything whilst we are
      // in this context (other than lower down in this call stack), so it is
      // safe to discard all changes to settings and notifications.
      this.#settings = backup;
      this.#notificationQueue.clear();
      for (const notification of backupNotifications) {
        this.#notificationQueue.add(notification);
      }

      lazy.logger.error("setSettings failed", ex);
    } finally {
      this.thawNotifications();
      // Stop collecting errors.
      this.#settingErrors = null;
    }

    lazy.logger.debug("setSettings result", this.#settings);
  }

  /**
   * Get a copy of all our settings.
   *
   * @returns {object} A copy of the settings object
   */
  getSettings() {
    lazy.logger.debug("getSettings()");
    this.#checkIfInitialized();
    return structuredClone(this.#settings);
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
}

export const TorSettings = new TorSettingsImpl();
