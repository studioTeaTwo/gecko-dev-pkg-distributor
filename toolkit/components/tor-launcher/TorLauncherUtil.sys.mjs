// Copyright (c) 2022, The Tor Project, Inc.
// See LICENSE for licensing information.

/*************************************************************************
 * Tor Launcher Util JS Module
 *************************************************************************/

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
});

const kPropBundleURI = "chrome://torbutton/locale/torlauncher.properties";
const kPropNamePrefix = "torlauncher.";
const kIPCDirPrefName = "extensions.torlauncher.tmp_ipc_dir";

let gStringBundle = null;

/**
 * This class allows to lookup for the paths of the various files that are
 * needed or can be used with the tor daemon, such as its configuration, the
 * GeoIP databases, and the Unix sockets that can be optionally used for the
 * control and the SOCKS ports.
 */
class TorFile {
  // The nsIFile to be returned
  file = null;

  isIPC = false;
  ipcFileName = "";
  checkIPCPathLen = true;

  static _isFirstIPCPathRequest = true;
  static _dataDir = null;
  static _appDir = null;
  static _torDir = null;

  constructor(aTorFileType, aCreate) {
    this.fileType = aTorFileType;

    this.getFromPref();
    this.getIPC();
    // No preference and no pre-determined IPC path: use a default path.
    if (!this.file) {
      this.getDefault();
    }
    // At this point, this.file must not be null, or previous functions must
    // have thrown and interrupted this constructor.
    if (!this.file.exists() && !this.isIPC && aCreate) {
      this.createFile();
    }
    this.normalize();
  }

  getFile() {
    return this.file;
  }

  getFromPref() {
    const prefName = `extensions.torlauncher.${this.fileType}_path`;
    const path = Services.prefs.getCharPref(prefName, "");
    if (path) {
      const isUserData =
        this.fileType !== "tor" &&
        this.fileType !== "pt-startup-dir" &&
        this.fileType !== "torrc-defaults";
      // always try to use path if provided in pref
      this.checkIPCPathLen = false;
      this.setFileFromPath(path, isUserData);
    }
  }

  getIPC() {
    const isControlIPC = this.fileType === "control_ipc";
    const isSOCKSIPC = this.fileType === "socks_ipc";
    this.isIPC = isControlIPC || isSOCKSIPC;
    if (!this.isIPC) {
      return;
    }

    const kControlIPCFileName = "control.socket";
    const kSOCKSIPCFileName = "socks.socket";
    this.ipcFileName = isControlIPC ? kControlIPCFileName : kSOCKSIPCFileName;
    this.extraIPCPathLen = this.isSOCKSIPC ? 2 : 0;

    // Do not do anything else if this.file has already been populated with the
    // _path preference for this file type (or if we are not looking for an IPC
    // file).
    if (this.file) {
      return;
    }

    // If this is the first request for an IPC path during this browser
    // session, remove the old temporary directory. This helps to keep /tmp
    // clean if the browser crashes or is killed.
    if (TorFile._isFirstIPCPathRequest) {
      TorLauncherUtil.cleanupTempDirectories();
      TorFile._isFirstIPCPathRequest = false;
    } else {
      // FIXME: Do we really need a preference? Or can we save it in a static
      // member?
      // Retrieve path for IPC objects (it may have already been determined).
      const ipcDirPath = Services.prefs.getCharPref(kIPCDirPrefName, "");
      if (ipcDirPath) {
        // We have already determined where IPC objects will be placed.
        this.file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
        this.file.initWithPath(ipcDirPath);
        this.file.append(this.ipcFileName);
        this.checkIPCPathLen = false; // already checked.
        return;
      }
    }

    // If XDG_RUNTIME_DIR is set, use it as the base directory for IPC
    // objects (e.g., Unix domain sockets) -- assuming it is not too long.
    if (!Services.env.exists("XDG_RUNTIME_DIR")) {
      return;
    }
    const ipcDir = this.createUniqueIPCDir(Services.env.get("XDG_RUNTIME_DIR"));
    if (ipcDir) {
      const f = ipcDir.clone();
      f.append(this.ipcFileName);
      if (this.isIPCPathLengthOK(f.path, this.extraIPCPathLen)) {
        this.file = f;
        this.checkIPCPathLen = false; // no need to check again.

        // Store directory path so it can be reused for other IPC objects
        // and so it can be removed during exit.
        Services.prefs.setCharPref(kIPCDirPrefName, ipcDir.path);
      } else {
        // too long; remove the directory that we just created.
        ipcDir.remove(false);
      }
    }
  }

  getDefault() {
    switch (this.fileType) {
      case "tor":
        this.file = TorFile.torDir;
        this.file.append(TorLauncherUtil.isWindows ? "tor.exe" : "tor");
        break;
      case "torrc-defaults":
        if (TorLauncherUtil.isMac) {
          this.file = TorFile.appDir;
          this.file.appendRelativePath(
            "Contents/Resources/TorBrowser/Tor/torrc-defaults"
          );
        } else {
          // FIXME: Should we move this file to the tor directory, in the other
          // platforms, since it is not user data?
          this.file = TorFile.torDataDir;
          this.file.append("torrc-defaults");
        }
        break;
      case "torrc":
        this.file = TorFile.torDataDir;
        this.file.append("torrc");
        break;
      case "tordatadir":
        this.file = TorFile.torDataDir;
        break;
      case "toronionauthdir":
        this.file = TorFile.torDataDir;
        this.file.append("onion-auth");
        break;
      case "pt-startup-dir":
        // On macOS we specify different relative paths than on Linux and
        // Windows
        this.file = TorLauncherUtil.isMac ? TorFile.torDir : TorFile.appDir;
        break;
      default:
        if (!TorLauncherUtil.isWindows && this.isIPC) {
          this.setFileFromPath(`Tor/${this.ipcFileName}`, true);
          break;
        }
        throw new Error("Unknown file type");
    }
  }

  // This function is used to set this.file from a string that contains a path.
  // As a matter of fact, it is used only when setting a path from preferences,
  // or to set the default IPC paths.
  setFileFromPath(path, isUserData) {
    if (TorLauncherUtil.isWindows) {
      path = path.replaceAll("/", "\\");
    }
    // Turn 'path' into an absolute path when needed.
    if (TorLauncherUtil.isPathRelative(path)) {
      if (TorLauncherUtil.isMac) {
        // On macOS, files are correctly separated because it was needed for the
        // gatekeeper signing.
        this.file = isUserData ? TorFile.dataDir : TorFile.appDir;
      } else {
        // Windows and Linux still use the legacy behavior.
        // To avoid breaking old installations, let's just keep it.
        this.file = TorFile.appDir;
        this.file.append("TorBrowser");
      }
      this.file.appendRelativePath(path);
    } else {
      this.file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
      this.file.initWithPath(path);
    }
  }

  createFile() {
    if (
      "tordatadir" == this.fileType ||
      "toronionauthdir" == this.fileType ||
      "pt-profiles-dir" == this.fileType
    ) {
      this.file.create(this.file.DIRECTORY_TYPE, 0o700);
    } else {
      this.file.create(this.file.NORMAL_FILE_TYPE, 0o600);
    }
  }

  // If the file exists or an IPC object was requested, normalize the path
  // and return a file object. The control and SOCKS IPC objects will be
  // created by tor.
  normalize() {
    if (this.file.exists()) {
      try {
        this.file.normalize();
      } catch (e) {
        console.warn("Normalization of the path failed", e);
      }
    } else if (!this.isIPC) {
      throw new Error(`${this.fileType} file not found: ${this.file.path}`);
    }

    // Ensure that the IPC path length is short enough for use by the
    // operating system. If not, create and use a unique directory under
    // /tmp for all IPC objects. The created directory path is stored in
    // a preference so it can be reused for other IPC objects and so it
    // can be removed during exit.
    if (
      this.isIPC &&
      this.checkIPCPathLen &&
      !this.isIPCPathLengthOK(this.file.path, this.extraIPCPathLen)
    ) {
      this.file = this.createUniqueIPCDir("/tmp");
      if (!this.file) {
        throw new Error("failed to create unique directory under /tmp");
      }

      Services.prefs.setCharPref(kIPCDirPrefName, this.file.path);
      this.file.append(this.ipcFileName);
    }
  }

  // Return true if aPath is short enough to be used as an IPC object path,
  // e.g., for a Unix domain socket path. aExtraLen is the "delta" necessary
  // to accommodate other IPC objects that have longer names; it is used to
  // account for "control.socket" vs. "socks.socket" (we want to ensure that
  // all IPC objects are placed in the same parent directory unless the user
  // has set prefs or env vars to explicitly specify the path for an object).
  // We enforce a maximum length of 100 because all operating systems allow
  // at least 100 characters for Unix domain socket paths.
  isIPCPathLengthOK(aPath, aExtraLen) {
    const kMaxIPCPathLen = 100;
    return aPath && aPath.length + aExtraLen <= kMaxIPCPathLen;
  }

  // Returns an nsIFile or null if a unique directory could not be created.
  createUniqueIPCDir(aBasePath) {
    try {
      const d = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
      d.initWithPath(aBasePath);
      d.append("Tor");
      d.createUnique(Ci.nsIFile.DIRECTORY_TYPE, 0o700);
      return d;
    } catch (e) {
      console.error(`createUniqueIPCDir failed for ${aBasePath}: `, e);
      return null;
    }
  }

  // Returns an nsIFile that points to the binary directory (on Linux and
  // Windows), and to the root of the application bundle on macOS.
  static get appDir() {
    if (!this._appDir) {
      // .../Browser on Windows and Linux, .../TorBrowser.app/Contents/MacOS/ on
      // macOS.
      this._appDir = Services.dirsvc.get("XREExeF", Ci.nsIFile).parent;
      if (TorLauncherUtil.isMac) {
        this._appDir = this._appDir.parent.parent;
      }
    }
    return this._appDir.clone();
  }

  // Returns an nsIFile that points to the data directory. This is usually
  // TorBrowser/Data/ on Linux and Windows, and TorBrowser-Data/ on macOS.
  // The parent directory of the default profile directory is taken.
  static get dataDir() {
    if (!this._dataDir) {
      // Notice that we use `DefProfRt`, because users could create their
      // profile in a completely unexpected directory: the profiles.ini contains
      // a IsRelative entry, which I expect could influence ProfD, but not this.
      this._dataDir = Services.dirsvc.get("DefProfRt", Ci.nsIFile).parent;
    }
    return this._dataDir.clone();
  }

  // Returns an nsIFile that points to the directory that contains the tor
  // executable.
  static get torDir() {
    if (!this._torDir) {
      // The directory that contains firefox
      const torDir = Services.dirsvc.get("XREExeF", Ci.nsIFile).parent;
      if (!TorLauncherUtil.isMac) {
        torDir.append("TorBrowser");
      }
      torDir.append("Tor");
      // Save the value only if the XPCOM methods do not throw.
      this._torDir = torDir;
    }
    return this._torDir.clone();
  }

  // Returns an nsIFile that points to the directory that contains the tor
  // data. Currently it is ${dataDir}/Tor.
  static get torDataDir() {
    const dir = this.dataDir;
    dir.append("Tor");
    return dir;
  }
}

export const TorLauncherUtil = Object.freeze({
  get isAndroid() {
    return Services.appinfo.OS === "Android";
  },

  get isMac() {
    return Services.appinfo.OS === "Darwin";
  },

  get isWindows() {
    return Services.appinfo.OS === "WINNT";
  },

  isPathRelative(path) {
    const re = this.isWindows ? /^([A-Za-z]:|\\)\\/ : /^\//;
    return !re.test(path);
  },

  // Returns true if user confirms; false if not.
  showConfirm(aParentWindow, aMsg, aDefaultButtonLabel, aCancelButtonLabel) {
    if (!aParentWindow) {
      aParentWindow = Services.wm.getMostRecentWindow("navigator:browser");
    }

    const ps = Services.prompt;
    const title = this.getLocalizedString("error_title");
    const btnFlags =
      ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING +
      ps.BUTTON_POS_0_DEFAULT +
      ps.BUTTON_POS_1 * ps.BUTTON_TITLE_IS_STRING;

    const notUsed = { value: false };
    const btnIndex = ps.confirmEx(
      aParentWindow,
      title,
      aMsg,
      btnFlags,
      aDefaultButtonLabel,
      aCancelButtonLabel,
      null,
      null,
      notUsed
    );
    return btnIndex === 0;
  },

  /**
   * Ask the user whether they desire to restart tor.
   *
   * @param {boolean} initError If we could connect to the control port at
   * least once and we are showing this prompt because the tor process exited
   * suddenly, we will display a different message
   * @returns {boolean} true if the user asked to restart tor
   */
  showRestartPrompt(initError) {
    let s;
    if (initError) {
      const key = "tor_exited_during_startup";
      s = this.getLocalizedString(key);
    } else {
      // tor exited suddenly, so configuration should be okay
      s =
        this.getLocalizedString("tor_exited") +
        "\n\n" +
        this.getLocalizedString("tor_exited2");
    }
    const defaultBtnLabel = this.getLocalizedString("restart_tor");
    let cancelBtnLabel = "OK";
    try {
      const kSysBundleURI = "chrome://global/locale/commonDialogs.properties";
      const sysBundle = Services.strings.createBundle(kSysBundleURI);
      cancelBtnLabel = sysBundle.GetStringFromName(cancelBtnLabel);
    } catch (e) {
      console.warn("Could not localize the cancel button", e);
    }
    return this.showConfirm(null, s, defaultBtnLabel, cancelBtnLabel);
  },

  // Localized Strings
  // TODO: Switch to fluent also these ones.

  // "torlauncher." is prepended to aStringName.
  getLocalizedString(aStringName) {
    if (!aStringName) {
      return aStringName;
    }
    try {
      const key = kPropNamePrefix + aStringName;
      return this._stringBundle.GetStringFromName(key);
    } catch (e) {}
    return aStringName;
  },

  /**
   * Determine what kind of SOCKS port has been requested for this session or
   * the browser has been configured for.
   * On Windows (where Unix domain sockets are not supported), TCP is always
   * used.
   *
   * The following environment variables are supported and take precedence over
   * preferences:
   *    TOR_TRANSPROXY (do not use a proxy)
   *    TOR_SOCKS_IPC_PATH (file system path; ignored on Windows)
   *    TOR_SOCKS_HOST
   *    TOR_SOCKS_PORT
   *
   * The following preferences are consulted:
   *    network.proxy.socks
   *    network.proxy.socks_port
   *    extensions.torlauncher.socks_port_use_ipc (Boolean)
   *    extensions.torlauncher.socks_ipc_path (file system path)
   * If extensions.torlauncher.socks_ipc_path is empty, a default path is used.
   *
   * When using TCP, if a value is not defined via an env variable it is
   * taken from the corresponding browser preference if possible. The
   * exceptions are:
   *   If network.proxy.socks contains a file: URL, a default value of
   *     "127.0.0.1" is used instead.
   *   If the network.proxy.socks_port value is not valid (outside the
   *     (0; 65535] range), a default value of 9150 is used instead.
   *
   * The SOCKS configuration will not influence the launch of a tor daemon and
   * the configuration of the control port in any way.
   * When a SOCKS configuration is required without TOR_SKIP_LAUNCH, the browser
   * will try to configure the tor instance to use the required configuration.
   * This also applies to TOR_TRANSPROXY (at least for now): tor will be
   * launched with its defaults.
   *
   * TODO: add a preference to ignore the current configuration, and let tor
   * listen on any free port. Then, the browser will prompt the daemon the port
   * to use through the control port (even though this is quite dangerous at the
   * moment, because with network disabled tor will disable also the SOCKS
   * listeners, so it means that we will have to check it every time we change
   * the network status).
   *
   * @returns {SocksSettings}
   */
  getPreferredSocksConfiguration() {
    if (Services.env.exists("TOR_TRANSPROXY")) {
      return { transproxy: true };
    }

    let useIPC;
    const socksPortInfo = {
      transproxy: false,
    };

    if (!this.isWindows && Services.env.exists("TOR_SOCKS_IPC_PATH")) {
      useIPC = true;
      const ipcPath = Services.env.get("TOR_SOCKS_IPC_PATH");
      if (ipcPath) {
        socksPortInfo.ipcFile = new lazy.FileUtils.File(ipcPath);
      }
    } else {
      // Check for TCP host and port environment variables.
      if (Services.env.exists("TOR_SOCKS_HOST")) {
        socksPortInfo.host = Services.env.get("TOR_SOCKS_HOST");
        useIPC = false;
      }
      if (Services.env.exists("TOR_SOCKS_PORT")) {
        const port = parseInt(Services.env.get("TOR_SOCKS_PORT"), 10);
        if (Number.isInteger(port) && port > 0 && port <= 65535) {
          socksPortInfo.port = port;
          useIPC = false;
        }
      }
    }

    if (useIPC === undefined) {
      useIPC =
        !this.isWindows &&
        Services.prefs.getBoolPref(
          "extensions.torlauncher.socks_port_use_ipc",
          false
        );
    }

    // Fill in missing SOCKS info from prefs.
    if (useIPC) {
      if (!socksPortInfo.ipcFile) {
        socksPortInfo.ipcFile = TorLauncherUtil.getTorFile("socks_ipc", false);
      }
    } else {
      if (!socksPortInfo.host) {
        let socksAddr = Services.prefs.getCharPref(
          "network.proxy.socks",
          "127.0.0.1"
        );
        let socksAddrHasHost = socksAddr && !socksAddr.startsWith("file:");
        socksPortInfo.host = socksAddrHasHost ? socksAddr : "127.0.0.1";
      }

      if (!socksPortInfo.port) {
        let socksPort = Services.prefs.getIntPref(
          "network.proxy.socks_port",
          0
        );
        // This pref is set as 0 by default in Firefox, use 9150 if we get 0.
        socksPortInfo.port =
          socksPort > 0 && socksPort <= 65535 ? socksPort : 9150;
      }
    }

    return socksPortInfo;
  },

  setProxyConfiguration(socksPortInfo) {
    if (socksPortInfo.transproxy) {
      Services.prefs.setBoolPref("network.proxy.socks_remote_dns", false);
      Services.prefs.setIntPref("network.proxy.type", 0);
      Services.prefs.setIntPref("network.proxy.socks_port", 0);
      Services.prefs.setCharPref("network.proxy.socks", "");
      return;
    }

    if (socksPortInfo.ipcFile) {
      const fph = Services.io
        .getProtocolHandler("file")
        .QueryInterface(Ci.nsIFileProtocolHandler);
      const fileURI = fph.newFileURI(socksPortInfo.ipcFile);
      Services.prefs.setCharPref("network.proxy.socks", fileURI.spec);
      Services.prefs.setIntPref("network.proxy.socks_port", 0);
    } else {
      if (socksPortInfo.host) {
        Services.prefs.setCharPref("network.proxy.socks", socksPortInfo.host);
      }
      if (socksPortInfo.port) {
        Services.prefs.setIntPref(
          "network.proxy.socks_port",
          socksPortInfo.port
        );
      }
    }

    if (socksPortInfo.ipcFile || socksPortInfo.host || socksPortInfo.port) {
      Services.prefs.setBoolPref("network.proxy.socks_remote_dns", true);
      Services.prefs.setIntPref("network.proxy.type", 1);
    }

    // Force prefs to be synced to disk
    Services.prefs.savePrefFile(null);
  },

  get shouldStartAndOwnTor() {
    const kPrefStartTor = "extensions.torlauncher.start_tor";
    try {
      const kBrowserToolboxPort = "MOZ_BROWSER_TOOLBOX_PORT";
      const kEnvSkipLaunch = "TOR_SKIP_LAUNCH";
      const kEnvProvider = "TOR_PROVIDER";
      if (Services.env.exists(kBrowserToolboxPort)) {
        return false;
      }
      if (Services.env.exists(kEnvSkipLaunch)) {
        const value = parseInt(Services.env.get(kEnvSkipLaunch));
        return isNaN(value) || !value;
      }
      if (
        Services.env.exists(kEnvProvider) &&
        Services.env.get(kEnvProvider) === "none"
      ) {
        return false;
      }
    } catch (e) {}
    return Services.prefs.getBoolPref(kPrefStartTor, true);
  },

  get shouldShowNetworkSettings() {
    try {
      const kEnvForceShowNetConfig = "TOR_FORCE_NET_CONFIG";
      if (Services.env.exists(kEnvForceShowNetConfig)) {
        const value = parseInt(Services.env.get(kEnvForceShowNetConfig));
        return !isNaN(value) && value;
      }
    } catch (e) {}
    return true;
  },

  get shouldOnlyConfigureTor() {
    const kPrefOnlyConfigureTor = "extensions.torlauncher.only_configure_tor";
    try {
      const kEnvOnlyConfigureTor = "TOR_CONFIGURE_ONLY";
      if (Services.env.exists(kEnvOnlyConfigureTor)) {
        const value = parseInt(Services.env.get(kEnvOnlyConfigureTor));
        return !isNaN(value) && value;
      }
    } catch (e) {}
    return Services.prefs.getBoolPref(kPrefOnlyConfigureTor, false);
  },

  // Returns an nsIFile.
  // If aTorFileType is "control_ipc" or "socks_ipc", aCreate is ignored
  // and there is no requirement that the IPC object exists.
  // For all other file types, null is returned if the file does not exist
  // and it cannot be created (it will be created if aCreate is true).
  getTorFile(aTorFileType, aCreate) {
    if (!aTorFileType) {
      return null;
    }
    try {
      const torFile = new TorFile(aTorFileType, aCreate);
      return torFile.getFile();
    } catch (e) {
      console.error(`getTorFile: cannot get ${aTorFileType}`, e);
    }
    return null; // File not found or error (logged above).
  },

  cleanupTempDirectories() {
    const dirPath = Services.prefs.getCharPref(kIPCDirPrefName, "");
    try {
      Services.prefs.clearUserPref(kIPCDirPrefName);
    } catch (e) {}
    try {
      if (dirPath) {
        const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
        f.initWithPath(dirPath);
        if (f.exists()) {
          f.remove(false);
        }
      }
    } catch (e) {
      console.warn("Could not remove the IPC directory", e);
    }
  },

  get _stringBundle() {
    if (!gStringBundle) {
      gStringBundle = Services.strings.createBundle(kPropBundleURI);
    }
    return gStringBundle;
  },
});
