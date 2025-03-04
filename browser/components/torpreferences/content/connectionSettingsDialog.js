"use strict";

const { TorSettings, TorProxyType } = ChromeUtils.importESModule(
  "resource://gre/modules/TorSettings.sys.mjs"
);

const gConnectionSettingsDialog = {
  _acceptButton: null,
  _useProxyCheckbox: null,
  _proxyTypeLabel: null,
  _proxyTypeMenulist: null,
  _proxyAddressLabel: null,
  _proxyAddressTextbox: null,
  _proxyPortLabel: null,
  _proxyPortTextbox: null,
  _proxyUsernameLabel: null,
  _proxyUsernameTextbox: null,
  _proxyPasswordLabel: null,
  _proxyPasswordTextbox: null,
  _useFirewallCheckbox: null,
  _allowedPortsLabel: null,
  _allowedPortsTextbox: null,

  selectors: {
    useProxyCheckbox: "checkbox#torPreferences-connection-toggleProxy",
    proxyTypeLabel: "label#torPreferences-localProxy-type",
    proxyTypeList: "menulist#torPreferences-localProxy-builtinList",
    proxyAddressLabel: "label#torPreferences-localProxy-address",
    proxyAddressTextbox: "input#torPreferences-localProxy-textboxAddress",
    proxyPortLabel: "label#torPreferences-localProxy-port",
    proxyPortTextbox: "input#torPreferences-localProxy-textboxPort",
    proxyUsernameLabel: "label#torPreferences-localProxy-username",
    proxyUsernameTextbox: "input#torPreferences-localProxy-textboxUsername",
    proxyPasswordLabel: "label#torPreferences-localProxy-password",
    proxyPasswordTextbox: "input#torPreferences-localProxy-textboxPassword",
    useFirewallCheckbox: "checkbox#torPreferences-connection-toggleFirewall",
    firewallAllowedPortsLabel: "label#torPreferences-connection-allowedPorts",
    firewallAllowedPortsTextbox:
      "input#torPreferences-connection-textboxAllowedPorts",
  },

  /**
   * The "proxy" and "firewall" settings to pass on to TorSettings.
   *
   * Each group is `null` whilst the inputs are invalid.
   *
   * @type {{proxy: ?object, firewall: ?object}}
   */
  _settings: { proxy: null, firewall: null },

  init() {
    const currentSettings = TorSettings.getSettings();

    const dialog = document.getElementById("torPreferences-connection-dialog");
    dialog.addEventListener("dialogaccept", event => {
      if (!this._settings.proxy || !this._settings.firewall) {
        // Do not close yet.
        event.preventDefault();
        return;
      }
      // TODO: Maybe wait for the method to resolve before closing. Although
      // this can take a few seconds. See tor-browser#43467.
      TorSettings.changeSettings(this._settings);
    });
    this._acceptButton = dialog.getButton("accept");

    const selectors = this.selectors;

    // Local Proxy
    this._useProxyCheckbox = document.querySelector(selectors.useProxyCheckbox);
    this._useProxyCheckbox.checked = currentSettings.proxy.enabled;
    this._useProxyCheckbox.addEventListener("command", () => {
      this.updateProxyType();
    });

    this._proxyTypeLabel = document.querySelector(selectors.proxyTypeLabel);

    const mockProxies = [
      {
        value: TorProxyType.Socks4,
        l10nId: "tor-advanced-dialog-proxy-socks4-menuitem",
      },
      {
        value: TorProxyType.Socks5,
        l10nId: "tor-advanced-dialog-proxy-socks5-menuitem",
      },
      {
        value: TorProxyType.HTTPS,
        l10nId: "tor-advanced-dialog-proxy-http-menuitem",
      },
    ];
    this._proxyTypeMenulist = document.querySelector(selectors.proxyTypeList);
    this._proxyTypeMenulist.addEventListener("command", () => {
      this.updateProxyType();
    });
    for (const currentProxy of mockProxies) {
      let menuEntry = window.document.createXULElement("menuitem");
      menuEntry.setAttribute("value", currentProxy.value);
      menuEntry.setAttribute("data-l10n-id", currentProxy.l10nId);
      this._proxyTypeMenulist.querySelector("menupopup").appendChild(menuEntry);
    }
    this._proxyTypeMenulist.value = currentSettings.proxy.enabled
      ? currentSettings.proxy.type
      : "";

    this._proxyAddressLabel = document.querySelector(
      selectors.proxyAddressLabel
    );
    this._proxyAddressTextbox = document.querySelector(
      selectors.proxyAddressTextbox
    );
    this._proxyAddressTextbox.addEventListener("blur", () => {
      // If the address includes a port move it to the port input instead.
      let value = this._proxyAddressTextbox.value.trim();
      let colon = value.lastIndexOf(":");
      if (colon != -1) {
        let maybePort = this.parsePort(value.substr(colon + 1));
        if (maybePort !== null) {
          this._proxyAddressTextbox.value = value.substr(0, colon);
          this._proxyPortTextbox.value = maybePort;
          this.updateProxy();
        }
      }
    });
    this._proxyPortLabel = document.querySelector(selectors.proxyPortLabel);
    this._proxyPortTextbox = document.querySelector(selectors.proxyPortTextbox);
    this._proxyUsernameLabel = document.querySelector(
      selectors.proxyUsernameLabel
    );
    this._proxyUsernameTextbox = document.querySelector(
      selectors.proxyUsernameTextbox
    );
    this._proxyPasswordLabel = document.querySelector(
      selectors.proxyPasswordLabel
    );
    this._proxyPasswordTextbox = document.querySelector(
      selectors.proxyPasswordTextbox
    );

    if (currentSettings.proxy.enabled) {
      this._proxyAddressTextbox.value = currentSettings.proxy.address;
      this._proxyPortTextbox.value = currentSettings.proxy.port;
      this._proxyUsernameTextbox.value = currentSettings.proxy.username;
      this._proxyPasswordTextbox.value = currentSettings.proxy.password;
    } else {
      this._proxyAddressTextbox.value = "";
      this._proxyPortTextbox.value = "";
      this._proxyUsernameTextbox.value = "";
      this._proxyPasswordTextbox.value = "";
    }

    for (const el of [
      this._proxyAddressTextbox,
      this._proxyPortTextbox,
      this._proxyUsernameTextbox,
      this._proxyPasswordTextbox,
    ]) {
      el.addEventListener("input", () => {
        this.updateProxy();
      });
    }

    // Local firewall
    this._useFirewallCheckbox = document.querySelector(
      selectors.useFirewallCheckbox
    );
    this._useFirewallCheckbox.checked = currentSettings.firewall.enabled;
    this._useFirewallCheckbox.addEventListener("command", () => {
      this.updateFirewallEnabled();
    });
    this._allowedPortsLabel = document.querySelector(
      selectors.firewallAllowedPortsLabel
    );
    this._allowedPortsTextbox = document.querySelector(
      selectors.firewallAllowedPortsTextbox
    );
    this._allowedPortsTextbox.value = currentSettings.firewall.enabled
      ? currentSettings.firewall.allowed_ports.join(",")
      : "80,443";

    this._allowedPortsTextbox.addEventListener("input", () => {
      this.updateFirewall();
    });

    this.updateProxyType();
    this.updateFirewallEnabled();
  },

  /**
   * Convert a string into a port number.
   *
   * @param {string} portStr - The string to convert.
   * @returns {?integer} - The port number, or `null` if the given string could
   *   not be converted.
   */
  parsePort(portStr) {
    const portRegex = /^[1-9][0-9]*$/; // Strictly-positive decimal integer.
    if (!portRegex.test(portStr)) {
      return null;
    }
    const port = parseInt(portStr, 10);
    if (TorSettings.validPort(port)) {
      return port;
    }
    return null;
  },

  /**
   * Update the disabled state of the accept button.
   */
  updateAcceptButton() {
    this._acceptButton.disabled =
      !this._settings.proxy || !this._settings.firewall;
  },

  /**
   * Update the UI when the proxy setting is enabled or disabled, or the proxy
   * type changes.
   */
  updateProxyType() {
    const enabled = this._useProxyCheckbox.checked;
    const haveType = enabled && Boolean(this._proxyTypeMenulist.value);
    const type = parseInt(this._proxyTypeMenulist.value, 10);

    this._proxyTypeLabel.disabled = !enabled;
    this._proxyTypeMenulist.disabled = !enabled;
    this._proxyAddressLabel.disabled = !haveType;
    this._proxyAddressTextbox.disabled = !haveType;
    this._proxyPortLabel.disabled = !haveType;
    this._proxyPortTextbox.disabled = !haveType;
    this._proxyUsernameTextbox.disabled =
      !haveType || type === TorProxyType.Socks4;
    this._proxyPasswordTextbox.disabled =
      !haveType || type === TorProxyType.Socks4;
    if (type === TorProxyType.Socks4) {
      // Clear unused value.
      this._proxyUsernameTextbox.value = "";
      this._proxyPasswordTextbox.value = "";
    }

    this.updateProxy();
  },

  /**
   * Update the dialog's stored proxy values.
   */
  updateProxy() {
    if (this._useProxyCheckbox.checked) {
      const typeStr = this._proxyTypeMenulist.value;
      const type = parseInt(typeStr, 10);
      // TODO: Validate the address. See tor-browser#43467.
      const address = this._proxyAddressTextbox.value;
      const portStr = this._proxyPortTextbox.value;
      const username =
        type === TorProxyType.Socks4 ? "" : this._proxyUsernameTextbox.value;
      const password =
        type === TorProxyType.Socks4 ? "" : this._proxyPasswordTextbox.value;
      const port = parseInt(portStr, 10);
      if (
        !typeStr ||
        !address ||
        !portStr ||
        !TorSettings.validPort(port) ||
        // SOCKS5 needs either both username and password, or neither.
        (type === TorProxyType.Socks5 &&
          !TorSettings.validSocks5Credentials(username, password))
      ) {
        // Invalid.
        this._settings.proxy = null;
      } else {
        this._settings.proxy = {
          enabled: true,
          type,
          address,
          port,
          username,
          password,
        };
      }
    } else {
      this._settings.proxy = { enabled: false };
    }

    this.updateAcceptButton();
  },

  /**
   * Update the UI when the firewall setting is enabled or disabled.
   */
  updateFirewallEnabled() {
    const enabled = this._useFirewallCheckbox.checked;
    this._allowedPortsLabel.disabled = !enabled;
    this._allowedPortsTextbox.disabled = !enabled;

    this.updateFirewall();
  },

  /**
   * Update the dialog's stored firewall values.
   */
  updateFirewall() {
    if (this._useFirewallCheckbox.checked) {
      const portList = [];
      let listInvalid = false;
      for (const portStr of this._allowedPortsTextbox.value.split(
        /(?:\s*,\s*)+/g
      )) {
        if (!portStr) {
          // Trailing or leading comma.
          continue;
        }
        const port = this.parsePort(portStr);
        if (port === null) {
          listInvalid = true;
          break;
        }
        portList.push(port);
      }
      if (!listInvalid && portList.length) {
        this._settings.firewall = {
          enabled: true,
          allowed_ports: portList,
        };
      } else {
        this._settings.firewall = null;
      }
    } else {
      this._settings.firewall = { enabled: false };
    }

    this.updateAcceptButton();
  },
};

// Initial focus is not visible, even if opened with a keyboard. We avoid the
// default handler and manage the focus ourselves, which will paint the focus
// ring by default.
// NOTE: A side effect is that the focus ring will show even if the user opened
// with a mouse event.
// TODO: Remove this once bugzilla bug 1708261 is resolved.
document.subDialogSetDefaultFocus = () => {
  document.getElementById("torPreferences-connection-toggleProxy").focus();
};

window.addEventListener(
  "DOMContentLoaded",
  () => {
    gConnectionSettingsDialog.init();
  },
  { once: true }
);
