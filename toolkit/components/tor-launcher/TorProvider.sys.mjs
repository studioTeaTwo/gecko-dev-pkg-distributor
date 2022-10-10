/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { clearTimeout, setTimeout } from "resource://gre/modules/Timer.sys.mjs";

import { TorLauncherUtil } from "resource://gre/modules/TorLauncherUtil.sys.mjs";
import { TorParsers } from "resource://gre/modules/TorParsers.sys.mjs";
import { TorProviderTopics } from "resource://gre/modules/TorProviderBuilder.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
  TorController: "resource://gre/modules/TorControlPort.sys.mjs",
  TorProcess: "resource://gre/modules/TorProcess.sys.mjs",
  TorProcessAndroid: "resource://gre/modules/TorProcessAndroid.sys.mjs",
  TorProxyType: "resource://gre/modules/TorSettings.sys.mjs",
  TorSettings: "resource://gre/modules/TorSettings.sys.mjs",
});

const logger = console.createInstance({
  maxLogLevelPref: "browser.tor_provider.log_level",
  prefix: "TorProvider",
});

/**
 * @typedef {object} ControlPortSettings An object with the settings to use for
 * the control port. All the entries are optional, but an authentication
 * mechanism and a communication method must be specified.
 * @property {Uint8Array=} password The clear text password as an array of
 * bytes. It must always be defined, unless cookieFilePath is
 * @property {string=} cookieFilePath The path to the cookie file to use for
 * authentication
 * @property {nsIFile=} ipcFile The nsIFile object with the path to a Unix
 * socket to use for control socket
 * @property {string=} host The host to connect for a TCP control port
 * @property {number=} port The port number to use for a TCP control port
 */
/**
 * @typedef {object} SocksSettings An object that includes the proxy settings to
 * be configured in the browser.
 * @property {boolean=} transproxy If true, no proxy is configured
 * @property {nsIFile=} ipcFile The nsIFile object with the path to a Unix
 * socket to use for an IPC proxy
 * @property {string=} host The host to connect for a TCP proxy
 * @property {number=} port The port number to use for a TCP proxy
 */
/**
 * @typedef {object} LogEntry An object with a log message
 * @property {Date} date The date at which we received the message
 * @property {string} type The message level
 * @property {string} msg The message
 */
/**
 * Stores the data associated with a circuit node.
 *
 * @typedef NodeData
 * @property {NodeFingerprint} fingerprint The node fingerprint
 * @property {string[]} ipAddrs The ip addresses associated with this node
 * @property {string?} bridgeType The bridge type for this node, or "" if the
 *   node is a bridge but the type is unknown, or null if this is not a bridge
 *   node
 * @property {string?} regionCode An upper case 2-letter ISO3166-1 code for the
 *   first ip address, or null if there is no region. This should also be a
 *   valid BCP47 Region subtag
 */

const Preferences = Object.freeze({
  ControlUseIpc: "extensions.torlauncher.control_port_use_ipc",
  ControlHost: "extensions.torlauncher.control_host",
  ControlPort: "extensions.torlauncher.control_port",
  MaxLogEntries: "extensions.torlauncher.max_tor_log_entries",
  PromptAtStartup: "extensions.torlauncher.prompt_at_startup",
});

/* Config Keys used to configure tor daemon */
const TorConfigKeys = Object.freeze({
  useBridges: "UseBridges",
  bridgeList: "Bridge",
  socks4Proxy: "Socks4Proxy",
  socks5Proxy: "Socks5Proxy",
  socks5ProxyUsername: "Socks5ProxyUsername",
  socks5ProxyPassword: "Socks5ProxyPassword",
  httpsProxy: "HTTPSProxy",
  httpsProxyAuthenticator: "HTTPSProxyAuthenticator",
  reachableAddresses: "ReachableAddresses",
  clientTransportPlugin: "ClientTransportPlugin",
});

/**
 * This is a Tor provider for the C Tor daemon.
 *
 * It can start a new tor instance, or connect to an existing one.
 * In the former case, it also takes its ownership by default.
 */
export class TorProvider {
  /**
   * The control port settings.
   *
   * @type {ControlPortSettings?}
   */
  #controlPortSettings = null;
  /**
   * An instance of the tor controller.
   * We take for granted that if it is not null, we connected to it and managed
   * to authenticate.
   * Public methods can use the #controller getter, which will throw an
   * exception whenever the control port is not open.
   *
   * @type {TorController?}
   */
  #controlConnection = null;
  /**
   * A helper that can be used to get the control port connection and assert it
   * is open and it can be used.
   * If this is not the case, this getter will throw.
   *
   * @returns {TorController}
   */
  get #controller() {
    if (!this.#controlConnection?.isOpen) {
      throw new Error("Control port connection not available.");
    }
    return this.#controlConnection;
  }
  /**
   * A function that can be called to cancel the current connection attempt.
   */
  #cancelConnection = () => {};

  /**
   * The tor process we launched.
   *
   * @type {TorProcess}
   */
  #torProcess = null;

  /**
   * The settings for the SOCKS proxy.
   *
   * @type {SocksSettings?}
   */
  #socksSettings = null;

  /**
   * The logs we received over the control port.
   * We store a finite number of log entries which can be configured with
   * extensions.torlauncher.max_tor_log_entries.
   *
   * @type {LogEntry[]}
   */
  #logs = [];

  #isBootstrapDone = false;
  /**
   * Keep the last warning to avoid broadcasting an async warning if it is the
   * same one as the last broadcast.
   */
  #lastWarning = {};

  /**
   * Stores the nodes of a circuit. Keys are cicuit IDs, and values are the node
   * fingerprints.
   *
   * Theoretically, we could hook this map up to the new identity notification,
   * but in practice it does not work. Tor pre-builds circuits, and the NEWNYM
   * signal does not affect them. So, we might end up using a circuit that was
   * built before the new identity but not yet used. If we cleaned the map, we
   * risked of not having the data about it.
   *
   * @type {Map<CircuitID, Promise<NodeFingerprint[]>>}
   */
  #circuits = new Map();
  /**
   * The last used bridge, or null if bridges are not in use or if it was not
   * possible to detect the bridge. This needs the user to have specified bridge
   * lines with fingerprints to work.
   *
   * @type {NodeFingerprint?}
   */
  #currentBridge = null;

  /**
   * Starts a new tor process and connect to its control port, or connect to the
   * control port of an existing tor daemon.
   */
  async init() {
    logger.debug("Initializing the Tor provider.");

    // These settings might be customized in the following steps.
    if (TorLauncherUtil.isAndroid) {
      this.#socksSettings = { transproxy: false };
    } else {
      this.#socksSettings = TorLauncherUtil.getPreferredSocksConfiguration();
      logger.debug("Requested SOCKS configuration", this.#socksSettings);
    }

    try {
      await this.#setControlPortConfiguration();
    } catch (e) {
      logger.error("We do not have a control port configuration", e);
      throw e;
    }

    if (this.#socksSettings.transproxy) {
      logger.info("Transparent proxy required, not starting a Tor daemon.");
    } else if (this.ownsTorDaemon) {
      try {
        await this.#startDaemon();
      } catch (e) {
        logger.error("Failed to start the tor daemon", e);
        throw e;
      }
    } else {
      logger.debug(
        "Not starting a tor daemon because we were requested not to."
      );
    }

    try {
      await this.#firstConnection();
    } catch (e) {
      logger.error("Cannot connect to the control port", e);
      throw e;
    }

    if (this.ownsTorDaemon) {
      try {
        await lazy.TorSettings.initializedPromise;
        await this.writeSettings(lazy.TorSettings.getSettings());
      } catch (e) {
        logger.warn(
          "Failed to initialize TorSettings or to write our initial settings. Continuing the initialization anyway.",
          e
        );
      }
    }

    TorLauncherUtil.setProxyConfiguration(this.#socksSettings);

    logger.info("The Tor provider is ready.");

    // If we are using an external Tor daemon, we might need to fetch circuits
    // already, in case streams use them. Do not await because we do not want to
    // block the intialization on this (it should not fail anyway...).
    this.#fetchCircuits();
  }

  /**
   * Close the connection to the tor daemon.
   * When Tor is started by Tor Browser, it is configured to exit when the
   * control connection is closed. Therefore, as a matter of facts, calling this
   * function also makes the child Tor instance stop.
   */
  uninit() {
    logger.debug("Uninitializing the Tor provider.");

    if (this.#torProcess) {
      this.#torProcess.forget();
      this.#torProcess.onExit = () => {};
      this.#torProcess = null;
    }

    this.#closeConnection("Uninitializing the provider.");
  }

  // Provider API

  /**
   * Send settings to the tor daemon.
   *
   * @param {object} settings A settings object, as returned by
   * TorSettings.getSettings(). This allow to try settings without passing
   * through TorSettings.
   */
  async writeSettings(settings) {
    logger.debug("TorProvider.writeSettings", settings);
    const torSettings = new Map();

    // Bridges
    const haveBridges =
      settings.bridges?.enabled && !!settings.bridges.bridge_strings.length;
    torSettings.set(TorConfigKeys.useBridges, haveBridges);
    if (haveBridges) {
      torSettings.set(
        TorConfigKeys.bridgeList,
        settings.bridges.bridge_strings
      );
    } else {
      torSettings.set(TorConfigKeys.bridgeList, null);
    }

    // Proxy
    torSettings.set(TorConfigKeys.socks4Proxy, null);
    torSettings.set(TorConfigKeys.socks5Proxy, null);
    torSettings.set(TorConfigKeys.socks5ProxyUsername, null);
    torSettings.set(TorConfigKeys.socks5ProxyPassword, null);
    torSettings.set(TorConfigKeys.httpsProxy, null);
    torSettings.set(TorConfigKeys.httpsProxyAuthenticator, null);
    if (settings.proxy && !settings.proxy.enabled) {
      settings.proxy.type = null;
    }
    const address = settings.proxy?.address;
    const port = settings.proxy?.port;
    const username = settings.proxy?.username;
    const password = settings.proxy?.password;
    switch (settings.proxy?.type) {
      case lazy.TorProxyType.Socks4:
        torSettings.set(TorConfigKeys.socks4Proxy, `${address}:${port}`);
        break;
      case lazy.TorProxyType.Socks5:
        torSettings.set(TorConfigKeys.socks5Proxy, `${address}:${port}`);
        torSettings.set(TorConfigKeys.socks5ProxyUsername, username);
        torSettings.set(TorConfigKeys.socks5ProxyPassword, password);
        break;
      case lazy.TorProxyType.HTTPS:
        torSettings.set(TorConfigKeys.httpsProxy, `${address}:${port}`);
        torSettings.set(
          TorConfigKeys.httpsProxyAuthenticator,
          `${username}:${password}`
        );
        break;
    }

    // Firewall
    if (settings.firewall?.enabled) {
      const reachableAddresses = settings.firewall.allowed_ports
        .map(port => `*:${port}`)
        .join(",");
      torSettings.set(TorConfigKeys.reachableAddresses, reachableAddresses);
    } else {
      torSettings.set(TorConfigKeys.reachableAddresses, null);
    }

    logger.debug("Mapped settings object", settings, torSettings);
    await this.#controller.setConf(Array.from(torSettings));
  }

  async flushSettings() {
    await this.#controller.flushSettings();
  }

  /**
   * Start the bootstrap process.
   */
  async connect() {
    await this.#controller.setNetworkEnabled(true);
    this.#lastWarning = {};
    this.retrieveBootstrapStatus();
  }

  /**
   * Stop the bootstrap process.
   */
  async stopBootstrap() {
    // Tell tor to disable use of the network; this should stop the bootstrap.
    await this.#controller.setNetworkEnabled(false);
    // We are not interested in waiting for this, nor in **catching its error**,
    // so we do not await this. We just want to be notified when the bootstrap
    // status is actually updated through observers.
    this.retrieveBootstrapStatus();
  }

  /**
   * Ask Tor to swtich to new circuits and clear the DNS cache.
   */
  async newnym() {
    await this.#controller.newnym();
  }

  /**
   * Get the bridges Tor has been configured with.
   *
   * @returns {Bridge[]} The configured bridges
   */
  async getBridges() {
    // Ideally, we would not need this function, because we should be the one
    // setting them with TorSettings. However, TorSettings is not notified of
    // change of settings. So, asking tor directly with the control connection
    // is the most reliable way of getting the configured bridges, at the
    // moment. Also, we are using this for the circuit display, which should
    // work also when we are not configuring the tor daemon, but just using it.
    return this.#controller.getBridges();
  }

  /**
   * Get the configured pluggable transports.
   *
   * @returns {PTInfo[]} An array with the info of all the configured pluggable
   * transports.
   */
  async getPluggableTransports() {
    return this.#controller.getPluggableTransports();
  }

  /**
   * Ask Tor its bootstrap phase.
   * This function will also update the internal state when using an external
   * tor daemon.
   *
   * @returns {object} An object with the bootstrap information received from
   * Tor. Its keys might vary, depending on the input
   */
  async retrieveBootstrapStatus() {
    this.#processBootstrapStatus(
      await this.#controller.getBootstrapPhase(),
      false
    );
  }

  /**
   * Returns tha data about a relay or a bridge.
   *
   * @param {string} id The fingerprint of the node to get data about
   * @returns {Promise<NodeData>}
   */
  async getNodeInfo(id) {
    const node = {
      fingerprint: id,
      ipAddrs: [],
      bridgeType: null,
      regionCode: null,
    };
    const bridge = (await this.#controller.getBridges())?.find(
      foundBridge => foundBridge.id?.toUpperCase() === id.toUpperCase()
    );
    if (bridge) {
      node.bridgeType = bridge.transport ?? "";
      // Attempt to get an IP address from bridge address string.
      const ip = bridge.addr.match(/^\[?([^\]]+)\]?:\d+$/)?.[1];
      if (ip && !ip.startsWith("0.")) {
        node.ipAddrs.push(ip);
      }
    } else {
      node.ipAddrs = await this.#controller.getNodeAddresses(id);
    }
    // tor-browser#43116, tor-browser-build#41224: on Android, we do not ship
    // the GeoIP databases to save some space. So skip it for now.
    if (node.ipAddrs.length && !TorLauncherUtil.isAndroid) {
      // Get the country code for the node's IP address.
      try {
        // Expect a 2-letter ISO3166-1 code, which should also be a valid
        // BCP47 Region subtag.
        const regionCode = await this.#controller.getIPCountry(node.ipAddrs[0]);
        if (regionCode && regionCode !== "??") {
          node.regionCode = regionCode.toUpperCase();
        }
      } catch (e) {
        logger.warn(`Cannot get a country for IP ${node.ipAddrs[0]}`, e);
      }
    }
    return node;
  }

  /**
   * Add a private key to the Tor configuration.
   *
   * @param {string} address The address of the onion service
   * @param {string} b64PrivateKey The private key of the service, in base64
   * @param {boolean} isPermanent Tell whether the key should be saved forever
   */
  async onionAuthAdd(address, b64PrivateKey, isPermanent) {
    return this.#controller.onionAuthAdd(address, b64PrivateKey, isPermanent);
  }

  /**
   * Remove a private key from the Tor configuration.
   *
   * @param {string} address The address of the onion service
   */
  async onionAuthRemove(address) {
    return this.#controller.onionAuthRemove(address);
  }

  /**
   * Retrieve the list of private keys.
   *
   * @returns {OnionAuthKeyInfo[]} The onion authentication keys known by the
   * tor daemon
   */
  async onionAuthViewKeys() {
    return this.#controller.onionAuthViewKeys();
  }

  /**
   * Returns captured log message as a text string (one message per line).
   *
   * @returns {string} The logs we collected from the tor daemon so far
   */
  getLog() {
    return this.#logs
      .map(logObj => {
        const timeStr = logObj.date
          .toISOString()
          .replace("T", " ")
          .replace("Z", "");
        return `${timeStr} [${logObj.type}] ${logObj.msg}`;
      })
      .join(TorLauncherUtil.isWindows ? "\r\n" : "\n");
  }

  /**
   * @returns {boolean} true if we launched and control tor, false if we are
   * using system tor.
   */
  get ownsTorDaemon() {
    return TorLauncherUtil.shouldStartAndOwnTor;
  }

  get isBootstrapDone() {
    return this.#isBootstrapDone;
  }

  /**
   * TODO: Rename to isReady once we remove finish the migration.
   *
   * @returns {boolean} true if we currently have a connection to the control
   * port. We take for granted that if we have one, we authenticated to it, and
   * so we have already verified we can send and receive data.
   */
  get isRunning() {
    return this.#controlConnection?.isOpen ?? false;
  }

  /**
   * Return the data about the current bridge, if any, or null.
   * We can detect bridge only when the configured bridge lines include the
   * fingerprints.
   *
   * @returns {NodeData?} The node information, or null if the first node
   * is not a bridge, or no circuit has been opened, yet.
   */
  get currentBridge() {
    return this.#currentBridge;
  }

  // Process management

  async #startDaemon() {
    // TorProcess should be instanced once, then always reused and restarted
    // only through the prompt it exposes when the controlled process dies.
    if (this.#torProcess) {
      logger.warn(
        "Ignoring a request to start a tor daemon because one is already running."
      );
      return;
    }

    if (TorLauncherUtil.isAndroid) {
      this.#torProcess = new lazy.TorProcessAndroid();
    } else {
      this.#torProcess = new lazy.TorProcess(
        this.#controlPortSettings,
        this.#socksSettings
      );
    }
    // Use a closure instead of bind because we reassign #cancelConnection.
    // Also, we now assign an exit handler that cancels the first connection,
    // so that a sudden exit before the first connection is completed might
    // still be handled as an initialization failure.
    // But after the first connection is created successfully, we will change
    // the exit handler to broadcast a notification instead.
    this.#torProcess.onExit = () => {
      this.#cancelConnection(
        "The tor process exited before the first connection"
      );
    };

    logger.debug("Trying to start the tor process.");
    const res = await this.#torProcess.start();
    if (TorLauncherUtil.isAndroid) {
      this.#controlPortSettings = {
        ipcFile: new lazy.FileUtils.File(res.controlPortPath),
        cookieFilePath: res.cookieFilePath,
      };
      this.#socksSettings = {
        transproxy: false,
        ipcFile: new lazy.FileUtils.File(res.socksPath),
      };
    }
    logger.info("Started a tor process");
  }

  // Control port setup and connection

  /**
   * Read the control port settings from environment variables and from
   * preferences.
   */
  async #setControlPortConfiguration() {
    logger.debug("Reading the control port configuration");
    const settings = {};

    if (TorLauncherUtil.isAndroid) {
      // We will populate the settings after having started the daemon.
      return;
    }

    const isWindows = Services.appinfo.OS === "WINNT";
    // Determine how Tor Launcher will connect to the Tor control port.
    // Environment variables get top priority followed by preferences.
    if (!isWindows && Services.env.exists("TOR_CONTROL_IPC_PATH")) {
      const ipcPath = Services.env.get("TOR_CONTROL_IPC_PATH");
      settings.ipcFile = new lazy.FileUtils.File(ipcPath);
    } else {
      // Check for TCP host and port environment variables.
      if (Services.env.exists("TOR_CONTROL_HOST")) {
        settings.host = Services.env.get("TOR_CONTROL_HOST");
      }
      if (Services.env.exists("TOR_CONTROL_PORT")) {
        const port = parseInt(Services.env.get("TOR_CONTROL_PORT"), 10);
        if (Number.isInteger(port) && port > 0 && port <= 65535) {
          settings.port = port;
        }
      }
    }

    const useIPC =
      !isWindows &&
      Services.prefs.getBoolPref(Preferences.ControlUseIpc, false);
    if (!settings.host && !settings.port && useIPC) {
      settings.ipcFile = TorLauncherUtil.getTorFile("control_ipc", false);
    } else {
      if (!settings.host) {
        settings.host = Services.prefs.getCharPref(
          Preferences.ControlHost,
          "127.0.0.1"
        );
      }
      if (!settings.port) {
        settings.port = Services.prefs.getIntPref(
          Preferences.ControlPort,
          9151
        );
      }
    }

    if (Services.env.exists("TOR_CONTROL_PASSWD")) {
      const password = Services.env.get("TOR_CONTROL_PASSWD");
      // As per 3.5 of control-spec.txt, AUTHENTICATE can use either a quoted
      // string, or a sequence of hex characters.
      // However, the password is hashed byte by byte, so we need to convert the
      // string to its character codes, or the hex digits to actual bytes.
      // Notice that Tor requires at least one hex character, without an upper
      // limit, but it does not explicitly tell how to pad an odd number of hex
      // characters, so we require the user to hand an even number of hex
      // digits.
      // We also want to enforce the authentication if we start the daemon.
      // So, if a password is not valid (not a hex sequence and not a quoted
      // string), or if it is empty (including the quoted empty string), we
      // force a random password.
      if (
        password.length >= 2 &&
        password[0] === '"' &&
        password[password.length - 1] === '"'
      ) {
        const encoder = new TextEncoder();
        settings.password = encoder.encode(TorParsers.unescapeString(password));
      } else if (/^([0-9a-fA-F]{2})+$/.test(password)) {
        settings.password = new Uint8Array(password.length / 2);
        for (let i = 0, j = 0; i < settings.password.length; i++, j += 2) {
          settings.password[i] = parseInt(password.substring(j, j + 2), 16);
        }
      }
      if (password && !settings.password?.length) {
        logger.warn(
          "Invalid password specified at TOR_CONTROL_PASSWD. " +
            "You should put it in double quotes, or it should be a hex-encoded sequence. " +
            "The password cannot be empty. " +
            "A random password will be used, instead."
        );
      }
    } else if (Services.env.exists("TOR_CONTROL_COOKIE_AUTH_FILE")) {
      const cookiePath = Services.env.get("TOR_CONTROL_COOKIE_AUTH_FILE");
      if (cookiePath) {
        settings.cookieFilePath = cookiePath;
      }
    }
    if (
      this.ownsTorDaemon &&
      !settings.password?.length &&
      !settings.cookieFilePath
    ) {
      settings.password = this.#generateRandomPassword();
    }
    this.#controlPortSettings = settings;
    logger.debug("Control port configuration read");
  }

  /**
   * Start the first connection to the Tor daemon.
   * This function should be called only once during the initialization.
   */
  async #firstConnection() {
    let canceled = false;
    let timeout = 0;
    const maxDelay = 10_000;
    let delay = 5;
    logger.debug("Connecting to the control port for the first time.");
    this.#controlConnection = await new Promise((resolve, reject) => {
      this.#cancelConnection = reason => {
        canceled = true;
        clearTimeout(timeout);
        reject(new Error(reason));
      };
      const tryConnect = () => {
        if (this.ownsTorDaemon && !this.#torProcess?.isRunning) {
          reject(new Error("The controlled tor daemon is not running."));
          return;
        }
        this.#openControlPort()
          .then(controller => {
            this.#cancelConnection = () => {};
            // The cancel function should have already called reject.
            if (!canceled) {
              logger.info("Connected to the control port.");
              resolve(controller);
            }
          })
          .catch(e => {
            if (delay < maxDelay && !canceled) {
              logger.info(
                `Failed to connect to the control port. Trying again in ${delay}ms.`,
                e
              );
              timeout = setTimeout(tryConnect, delay);
              delay *= 2;
            } else {
              reject(e);
            }
          });
      };
      tryConnect();
    });

    // The following code will never throw, but we still want to wait for it
    // before marking the provider as initialized.

    if (this.ownsTorDaemon) {
      // The first connection cannot be canceled anymore, and the rest of the
      // code is supposed not to fail. If the tor process exits, from now on we
      // can only close the connection and broadcast a notification.
      this.#torProcess.onExit = exitCode => {
        logger.info(`The tor process exited with code ${exitCode}`);
        this.#closeConnection("The tor process exited suddenly");
        Services.obs.notifyObservers(null, TorProviderTopics.ProcessExited);
      };
      if (!TorLauncherUtil.shouldOnlyConfigureTor) {
        await this.#takeOwnership();
      }
    }
    await this.#setupEvents();
  }

  /**
   * Try to become the primary controller. This will make tor exit when our
   * connection is closed.
   * This function cannot fail or throw (any exception will be treated as a
   * warning and just logged).
   */
  async #takeOwnership() {
    logger.debug("Taking the ownership of the tor process.");
    try {
      await this.#controlConnection.takeOwnership();
    } catch (e) {
      logger.warn("Take ownership failed", e);
      return;
    }
    try {
      await this.#controlConnection.resetOwningControllerProcess();
    } catch (e) {
      logger.warn("Clear owning controller process failed", e);
    }
  }

  /**
   * Tells the Tor daemon which events we want to receive.
   * This function will never throw. Any failure will be treated as a warning of
   * a possibly degraded experience, not as an error.
   */
  async #setupEvents() {
    // We always listen to these events, because they are needed for the circuit
    // display.
    const events = ["CIRC", "STREAM"];
    if (this.ownsTorDaemon) {
      events.push("STATUS_CLIENT", "NOTICE", "WARN", "ERR");
      // Do not await on the first bootstrap status retrieval, and do not
      // propagate its errors.
      this.#controlConnection
        .getBootstrapPhase()
        .then(status => this.#processBootstrapStatus(status, false))
        .catch(e =>
          logger.error("Failed to get the first bootstrap status", e)
        );
    }
    try {
      logger.debug(`Setting events: ${events.join(" ")}`);
      await this.#controlConnection.setEvents(events);
    } catch (e) {
      logger.error(
        "We could not enable all the events we need. Tor Browser's functionalities might be reduced.",
        e
      );
    }
  }

  /**
   * Open a connection to the control port and authenticate to it.
   * #setControlPortConfiguration must have been called before, as this function
   * will follow the configuration set by it.
   *
   * @returns {Promise<TorController>} An authenticated TorController
   */
  async #openControlPort() {
    let controlPort;
    if (this.#controlPortSettings.ipcFile) {
      controlPort = lazy.TorController.fromIpcFile(
        this.#controlPortSettings.ipcFile,
        this
      );
    } else {
      controlPort = lazy.TorController.fromSocketAddress(
        this.#controlPortSettings.host,
        this.#controlPortSettings.port,
        this
      );
    }
    try {
      let password = this.#controlPortSettings.password;
      if (password === undefined && this.#controlPortSettings.cookieFilePath) {
        password = await this.#readAuthenticationCookie(
          this.#controlPortSettings.cookieFilePath
        );
      }
      await controlPort.authenticate(password);
    } catch (e) {
      try {
        controlPort.close();
      } catch (ec) {
        // Tor already closes the control port when the authentication fails.
        logger.debug(
          "Expected exception when closing the control port for a failed authentication",
          ec
        );
      }
      throw e;
    }
    return controlPort;
  }

  /**
   * Close the connection to the control port.
   *
   * @param {string} reason The reason for which we are closing the connection
   * (used for logging and in case this ends up canceling the current connection
   * attempt)
   */
  #closeConnection(reason) {
    this.#cancelConnection(reason);
    if (this.#controlConnection) {
      logger.info("Closing the control connection", reason);
      try {
        this.#controlConnection.close();
      } catch (e) {
        logger.error("Failed to close the control port connection", e);
      }
      this.#controlConnection = null;
    } else {
      logger.trace(
        "Requested to close an already closed control port connection"
      );
    }
    this.#isBootstrapDone = false;
    this.#lastWarning = {};
  }

  // Authentication

  /**
   * Read a cookie file to perform cookie-based authentication.
   *
   * @param {string} path The path to the cookie file
   * @returns {Uint8Array} The content of the file in bytes
   */
  async #readAuthenticationCookie(path) {
    return IOUtils.read(path);
  }

  /**
   * @returns {Uint8Array} A random 16-byte password.
   */
  #generateRandomPassword() {
    const kPasswordLen = 16;
    return crypto.getRandomValues(new Uint8Array(kPasswordLen));
  }

  /**
   * Ask Tor the circuits it already knows to populate our circuit map with the
   * circuits that were already open before we started listening for events.
   */
  async #fetchCircuits() {
    for (const { id, nodes } of await this.#controller.getCircuits()) {
      this.onCircuitBuilt(id, nodes);
    }
  }

  // Notification handlers

  /**
   * Receive and process a notification with the bootstrap status.
   *
   * @param {object} status The status object
   */
  onBootstrapStatus(status) {
    logger.debug("Received bootstrap status update", status);
    this.#processBootstrapStatus(status, true);
  }

  /**
   * Process a bootstrap status to update the current state, and broadcast it
   * to TorBootstrapStatus observers.
   *
   * @param {object} statusObj The status object that the controller returned.
   * Its entries depend on what Tor sent to us.
   * @param {boolean} isNotification We broadcast warnings only when we receive
   * them through an asynchronous notification.
   */
  #processBootstrapStatus(statusObj, isNotification) {
    // Notify observers
    Services.obs.notifyObservers(statusObj, TorProviderTopics.BootstrapStatus);

    if (statusObj.PROGRESS === 100) {
      this.#isBootstrapDone = true;
      try {
        Services.prefs.setBoolPref(Preferences.PromptAtStartup, false);
      } catch (e) {
        logger.warn(`Cannot set ${Preferences.PromptAtStartup}`, e);
      }
      return;
    }

    this.#isBootstrapDone = false;

    // Can TYPE ever be ERR for STATUS_CLIENT?
    if (
      isNotification &&
      statusObj.TYPE === "WARN" &&
      statusObj.RECOMMENDATION !== "ignore"
    ) {
      this.#notifyBootstrapError(statusObj);
    }
  }

  /**
   * Broadcast a bootstrap warning or error.
   *
   * @param {object} statusObj The bootstrap status object with the error
   */
  #notifyBootstrapError(statusObj) {
    try {
      Services.prefs.setBoolPref(Preferences.PromptAtStartup, true);
    } catch (e) {
      logger.warn(`Cannot set ${Preferences.PromptAtStartup}`, e);
    }
    logger.error("Tor bootstrap error", statusObj);

    if (
      statusObj.TAG !== this.#lastWarning.phase ||
      statusObj.REASON !== this.#lastWarning.reason
    ) {
      this.#lastWarning.phase = statusObj.TAG;
      this.#lastWarning.reason = statusObj.REASON;

      // FIXME: currently, this is observed only by TorBoostrapRequest.
      // We should remove that class, and use an async method to do the
      // bootstrap here.
      // At that point, the lastWarning mechanism will probably not be necessary
      // anymore, since the first error eligible for notification will as a
      // matter of fact cancel the bootstrap.
      Services.obs.notifyObservers(
        {
          phase: statusObj.TAG,
          reason: statusObj.REASON,
          summary: statusObj.SUMMARY,
          warning: statusObj.WARNING,
        },
        TorProviderTopics.BootstrapError
      );
    }
  }

  /**
   * Handle a log message from the tor daemon. It will be added to the internal
   * logs. If it is a warning or an error, a notification will be broadcast.
   *
   * @param {string} type The message type
   * @param {string} msg The message
   */
  onLogMessage(type, msg) {
    if (type === "WARN" || type === "ERR") {
      // Notify so that Copy Log can be enabled.
      Services.obs.notifyObservers(null, TorProviderTopics.HasWarnOrErr);
    }

    Services.obs.notifyObservers({ type, msg }, TorProviderTopics.TorLog);

    const date = new Date();
    const maxEntries = Services.prefs.getIntPref(
      Preferences.MaxLogEntries,
      1000
    );
    if (maxEntries > 0 && this.#logs.length >= maxEntries) {
      this.#logs.splice(0, 1);
    }

    this.#logs.push({ date, type, msg });
    switch (type) {
      case "ERR":
        logger.error(`[Tor error] ${msg}`);
        break;
      case "WARN":
        logger.warn(`[Tor warning] ${msg}`);
        break;
      default:
        logger.info(`[Tor ${type.toLowerCase()}] ${msg}`);
    }
  }

  /**
   * Handle a notification that a new circuit has been built.
   * If a change of bridge is detected (including a change from bridge to a
   * normal guard), a notification is broadcast.
   *
   * @param {CircuitID} id The circuit ID
   * @param {NodeFingerprint[]} nodes The nodes that compose the circuit
   */
  async onCircuitBuilt(id, nodes) {
    this.#circuits.set(id, nodes);
    logger.debug(`Built tor circuit ${id}`, nodes);
    // Ignore circuits of length 1, that are used, for example, to probe
    // bridges. So, only store them, since we might see streams that use them,
    // but then early-return.
    if (nodes.length === 1) {
      return;
    }

    if (this.#currentBridge?.fingerprint !== nodes[0]) {
      const nodeInfo = await this.getNodeInfo(nodes[0]);
      let notify = false;
      if (nodeInfo?.bridgeType) {
        logger.info(`Bridge changed to ${nodes[0]}`);
        this.#currentBridge = nodeInfo;
        notify = true;
      } else if (this.#currentBridge) {
        logger.info("Bridges disabled");
        this.#currentBridge = null;
        notify = true;
      }
      if (notify) {
        Services.obs.notifyObservers(null, TorProviderTopics.BridgeChanged);
      }
    }
  }

  /**
   * Handle a notification of a circuit being closed. We use it to clean the
   * internal data.
   *
   * @param {CircuitID} id The circuit id
   */
  onCircuitClosed(id) {
    logger.debug("Circuit closed event", id);
    this.#circuits.delete(id);
  }

  /**
   * Handle a notification about a stream switching to the sentconnect status.
   *
   * @param {StreamID} streamId The ID of the stream that switched to the
   * sentconnect status.
   * @param {CircuitID} circuitId The ID of the circuit used by the stream
   * @param {string} username The SOCKS username
   * @param {string} password The SOCKS password
   */
  async onStreamSentConnect(streamId, circuitId, username, password) {
    if (!username || !password) {
      return;
    }
    logger.debug("Stream sentconnect event", username, password, circuitId);
    let circuit = this.#circuits.get(circuitId);
    if (!circuit) {
      circuit = new Promise((resolve, reject) => {
        this.#controlConnection.getCircuits().then(circuits => {
          for (const { id, nodes } of circuits) {
            if (id === circuitId) {
              resolve(nodes);
              return;
            }
            // Opportunistically collect circuits, since we are iterating them.
            this.#circuits.set(id, nodes);
          }
          logger.error(
            `Seen a STREAM SENTCONNECT with circuit ${circuitId}, but Tor did not send information about it.`
          );
          reject();
        });
      });
      this.#circuits.set(circuitId, circuit);
    }
    try {
      circuit = await circuit;
    } catch {
      return;
    }
    Services.obs.notifyObservers(
      {
        wrappedJSObject: {
          username,
          password,
          circuit,
        },
      },
      TorProviderTopics.CircuitCredentialsMatched
    );
  }
}
