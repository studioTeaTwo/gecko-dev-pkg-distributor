/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { setTimeout } from "resource://gre/modules/Timer.sys.mjs";
import { Subprocess } from "resource://gre/modules/Subprocess.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  TorLauncherUtil: "resource://gre/modules/TorLauncherUtil.sys.mjs",
  TorParsers: "resource://gre/modules/TorParsers.sys.mjs",
});

const TorProcessStatus = Object.freeze({
  Unknown: 0,
  Starting: 1,
  Running: 2,
  Exited: 3,
});

const logger = console.createInstance({
  maxLogLevel: "Info",
  prefix: "TorProcess",
});

/**
 * This class can be used to start a tor daemon instance and receive
 * notifications when it exits.
 * It will automatically convert the settings objects into the appropriate
 * command line arguments.
 *
 * It does not offer a way to stop a process because it is supposed to exit
 * automatically when the owning control port connection is closed.
 */
export class TorProcess {
  #controlSettings;
  #socksSettings;
  #exeFile = null;
  #dataDir = null;
  #args = [];
  #subprocess = null;
  #status = TorProcessStatus.Unknown;

  onExit = _exitCode => {};

  constructor(controlSettings, socksSettings) {
    if (
      controlSettings &&
      !controlSettings.password?.length &&
      !controlSettings.cookieFilePath
    ) {
      throw new Error("Unauthenticated control port is not supported");
    }

    const checkPort = port =>
      port === undefined ||
      (Number.isInteger(port) && port > 0 && port < 65535);
    if (!checkPort(controlSettings?.port)) {
      throw new Error("Invalid control port");
    }
    if (!checkPort(socksSettings.port)) {
      throw new Error("Invalid port specified for the SOCKS port");
    }

    this.#controlSettings = { ...controlSettings };
    const ipcFileToString = file =>
      "unix:" + lazy.TorParsers.escapeString(file.path);
    if (controlSettings.ipcFile) {
      this.#controlSettings.ipcFile = ipcFileToString(controlSettings.ipcFile);
    }
    this.#socksSettings = { ...socksSettings };
    if (socksSettings.ipcFile) {
      this.#socksSettings.ipcFile = ipcFileToString(socksSettings.ipcFile);
    }
  }

  get isRunning() {
    return (
      this.#status === TorProcessStatus.Starting ||
      this.#status === TorProcessStatus.Running
    );
  }

  async start() {
    if (this.#subprocess) {
      return;
    }

    this.#status = TorProcessStatus.Unknown;

    try {
      this.#makeArgs();
      this.#addControlPortArgs();
      this.#addSocksPortArg();

      const pid = Services.appinfo.processID;
      if (pid !== 0) {
        this.#args.push("__OwningControllerProcess", pid.toString());
      }

      if (lazy.TorLauncherUtil.shouldShowNetworkSettings) {
        this.#args.push("DisableNetwork", "1");
      }

      this.#status = TorProcessStatus.Starting;

      // useful for simulating slow tor daemon launch
      const kPrefTorDaemonLaunchDelay = "extensions.torlauncher.launch_delay";
      const launchDelay = Services.prefs.getIntPref(
        kPrefTorDaemonLaunchDelay,
        0
      );
      if (launchDelay > 0) {
        await new Promise(resolve => setTimeout(() => resolve(), launchDelay));
      }

      logger.debug(`Starting ${this.#exeFile.path}`, this.#args);
      const options = {
        command: this.#exeFile.path,
        arguments: this.#args,
        stderr: "stdout",
        workdir: lazy.TorLauncherUtil.getTorFile("pt-startup-dir", false).path,
      };
      this.#subprocess = await Subprocess.call(options);
      this.#status = TorProcessStatus.Running;
    } catch (e) {
      this.#status = TorProcessStatus.Exited;
      this.#subprocess = null;
      logger.error("startTor error:", e);
      throw e;
    }

    // Do not await the following functions, as they will return only when the
    // process exits.
    this.#dumpStdout();
    this.#watchProcess();
  }

  // Forget about a process.
  //
  // Instead of killing the tor process, we rely on the TAKEOWNERSHIP feature
  // to shut down tor when we close the control port connection.
  //
  // Previously, we sent a SIGNAL HALT command to the tor control port,
  // but that caused hangs upon exit in the Firefox 24.x based browser.
  // Apparently, Firefox does not like to process socket I/O while
  // quitting if the browser did not finish starting up (e.g., when
  // someone presses the Quit button on our Network Settings window
  // during startup).
  //
  // Still, before closing the owning connection, this class should forget about
  // the process, so that future notifications will be ignored.
  forget() {
    this.#subprocess = null;
    this.#status = TorProcessStatus.Exited;
  }

  async #dumpStdout() {
    let string;
    while (
      this.#subprocess &&
      (string = await this.#subprocess.stdout.readString())
    ) {
      dump(string);
    }
  }

  async #watchProcess() {
    const watched = this.#subprocess;
    if (!watched) {
      return;
    }
    let processExitCode;
    try {
      const { exitCode } = await watched.wait();
      processExitCode = exitCode;

      if (watched !== this.#subprocess) {
        logger.debug(`A Tor process exited with code ${exitCode}.`);
      } else if (exitCode) {
        logger.warn(`The watched Tor process exited with code ${exitCode}.`);
      } else {
        logger.info("The Tor process exited.");
      }
    } catch (e) {
      logger.error("Failed to watch the tor process", e);
    }

    if (watched === this.#subprocess) {
      this.#processExitedUnexpectedly(processExitCode);
    }
  }

  #processExitedUnexpectedly(exitCode) {
    this.#subprocess = null;
    this.#status = TorProcessStatus.Exited;
    logger.warn("Tor exited suddenly.");
    this.onExit(exitCode);
  }

  #makeArgs() {
    this.#exeFile = lazy.TorLauncherUtil.getTorFile("tor", false);
    if (!this.#exeFile) {
      throw new Error("Could not find the tor binary.");
    }
    const torrcFile = lazy.TorLauncherUtil.getTorFile("torrc", true);
    if (!torrcFile) {
      // FIXME: Is this still a fatal error?
      throw new Error("Could not find the torrc.");
    }
    // Get the Tor data directory first so it is created before we try to
    // construct paths to files that will be inside it.
    this.#dataDir = lazy.TorLauncherUtil.getTorFile("tordatadir", true);
    if (!this.#dataDir) {
      throw new Error("Could not find the tor data directory.");
    }
    const onionAuthDir = lazy.TorLauncherUtil.getTorFile(
      "toronionauthdir",
      true
    );
    if (!onionAuthDir) {
      throw new Error("Could not find the tor onion authentication directory.");
    }

    this.#args = [];
    this.#args.push("-f", torrcFile.path);
    this.#args.push("DataDirectory", this.#dataDir.path);
    this.#args.push("ClientOnionAuthDir", onionAuthDir.path);

    // TODO: Create this starting from pt_config.json (tor-browser#42357).
    const torrcDefaultsFile = lazy.TorLauncherUtil.getTorFile(
      "torrc-defaults",
      false
    );
    if (torrcDefaultsFile) {
      this.#args.push("--defaults-torrc", torrcDefaultsFile.path);
      // The geoip and geoip6 files are in the same directory as torrc-defaults.
      // TODO: Change TorFile to return the generic path to these files to make
      // them independent from the torrc-defaults.
      const geoipFile = torrcDefaultsFile.clone();
      geoipFile.leafName = "geoip";
      this.#args.push("GeoIPFile", geoipFile.path);
      const geoip6File = torrcDefaultsFile.clone();
      geoip6File.leafName = "geoip6";
      this.#args.push("GeoIPv6File", geoip6File.path);
    } else {
      logger.warn(
        "torrc-defaults was not found, some functionalities will be disabled."
      );
    }
  }

  /**
   * Add all the arguments related to the control port.
   * We use the + prefix so that the the port is added to any other port already
   * defined in the torrc, and the __ prefix so that it is never written to
   * torrc.
   */
  #addControlPortArgs() {
    if (!this.#controlSettings) {
      return;
    }

    let controlPortArg;
    if (this.#controlSettings.ipcFile) {
      controlPortArg = this.#controlSettings.ipcFile;
    } else if (this.#controlSettings.port) {
      controlPortArg = this.#controlSettings.host
        ? `${this.#controlSettings.host}:${this.#controlSettings.port}`
        : this.#controlSettings.port.toString();
    }
    if (controlPortArg) {
      this.#args.push("+__ControlPort", controlPortArg);
    }

    if (this.#controlSettings.password?.length) {
      this.#args.push(
        "HashedControlPassword",
        this.#hashPassword(this.#controlSettings.password)
      );
    }
    if (this.#controlSettings.cookieFilePath) {
      this.#args.push("CookieAuthentication", "1");
      this.#args.push("CookieAuthFile", this.#controlSettings.cookieFilePath);
    }
  }

  /**
   * Add the argument related to the control port.
   * We use the + prefix so that the the port is added to any other port already
   * defined in the torrc, and the __ prefix so that it is never written to
   * torrc.
   */
  #addSocksPortArg() {
    let socksPortArg;
    if (this.#socksSettings.ipcFile) {
      socksPortArg = this.#socksSettings.ipcFile;
    } else if (this.#socksSettings.port != 0) {
      socksPortArg = this.#socksSettings.host
        ? `${this.#socksSettings.host}:${this.#socksSettings.port}`
        : this.#socksSettings.port.toString();
    }
    if (socksPortArg) {
      const socksPortFlags = Services.prefs.getCharPref(
        "extensions.torlauncher.socks_port_flags",
        "IPv6Traffic PreferIPv6 KeepAliveIsolateSOCKSAuth"
      );
      if (socksPortFlags) {
        socksPortArg += " " + socksPortFlags;
      }
      this.#args.push("+__SocksPort", socksPortArg);
    }
  }

  /**
   * Hash a password to then pass it to Tor as a command line argument.
   * Based on Vidalia's TorSettings::hashPassword().
   *
   * @param {Uint8Array} password The password, as an array of bytes
   * @returns {string} The hashed password
   */
  #hashPassword(password) {
    // The password has already been checked by the caller.

    // Generate a random, 8 byte salt value.
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(8)));

    // Run through the S2K algorithm and convert to a string.
    const toHex = v => v.toString(16).padStart(2, "0");
    const arrayToHex = aArray => aArray.map(toHex).join("");
    const kCodedCount = 96;
    const hashVal = this.#cryptoSecretToKey(
      Array.from(password),
      salt,
      kCodedCount
    );
    return "16:" + arrayToHex(salt) + toHex(kCodedCount) + arrayToHex(hashVal);
  }

  /**
   * Generates and return a hash of a password by following the iterated and
   * salted S2K algorithm (see RFC 2440 section 3.6.1.3).
   * See also https://gitlab.torproject.org/tpo/core/torspec/-/blob/main/control-spec.txt#L3824.
   * #cryptoSecretToKey() is similar to Vidalia's crypto_secret_to_key().
   *
   * @param {Array} password The password to hash, as an array of bytes
   * @param {Array} salt The salt to use for the hash, as an array of bytes
   * @param {number} codedCount The counter, coded as specified in RFC 2440
   * @returns {Array} The hash of the password, as an array of bytes
   */
  #cryptoSecretToKey(password, salt, codedCount) {
    const inputArray = salt.concat(password);

    // Subtle crypto only has the final digest, and does not allow incremental
    // updates.
    const hasher = Cc["@mozilla.org/security/hash;1"].createInstance(
      Ci.nsICryptoHash
    );
    hasher.init(hasher.SHA1);
    const kEXPBIAS = 6;
    let count = (16 + (codedCount & 15)) << ((codedCount >> 4) + kEXPBIAS);
    while (count > 0) {
      if (count > inputArray.length) {
        hasher.update(inputArray, inputArray.length);
        count -= inputArray.length;
      } else {
        const finalArray = inputArray.slice(0, count);
        hasher.update(finalArray, finalArray.length);
        count = 0;
      }
    }
    return hasher
      .finish(false)
      .split("")
      .map(b => b.charCodeAt(0));
  }
}
