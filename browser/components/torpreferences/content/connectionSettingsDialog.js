"use strict";

const { TorSettings, TorProxyType } = ChromeUtils.importESModule(
  "resource://gre/modules/TorSettings.sys.mjs"
);

const gConnectionSettingsDialog = {
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

  // disables the provided list of elements
  _setElementsDisabled(elements, disabled) {
    for (let currentElement of elements) {
      currentElement.disabled = disabled;
    }
  },

  init() {
    const selectors = this.selectors;

    // Local Proxy
    this._useProxyCheckbox = document.querySelector(selectors.useProxyCheckbox);
    this._useProxyCheckbox.addEventListener("command", () => {
      const checked = this._useProxyCheckbox.checked;
      this.onToggleProxy(checked);
    });
    this._proxyTypeLabel = document.querySelector(selectors.proxyTypeLabel);

    let mockProxies = [
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
      const value = this._proxyTypeMenulist.value;
      this.onSelectProxyType(value);
    });
    for (let currentProxy of mockProxies) {
      let menuEntry = window.document.createXULElement("menuitem");
      menuEntry.setAttribute("value", currentProxy.value);
      menuEntry.setAttribute("data-l10n-id", currentProxy.l10nId);
      this._proxyTypeMenulist.querySelector("menupopup").appendChild(menuEntry);
    }

    this._proxyAddressLabel = document.querySelector(
      selectors.proxyAddressLabel
    );
    this._proxyAddressTextbox = document.querySelector(
      selectors.proxyAddressTextbox
    );
    this._proxyAddressTextbox.addEventListener("blur", () => {
      let value = this._proxyAddressTextbox.value.trim();
      let colon = value.lastIndexOf(":");
      if (colon != -1) {
        let maybePort = parseInt(value.substr(colon + 1));
        if (!isNaN(maybePort) && maybePort > 0 && maybePort < 65536) {
          this._proxyAddressTextbox.value = value.substr(0, colon);
          this._proxyPortTextbox.value = maybePort;
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

    this.onToggleProxy(false);
    if (TorSettings.proxy.enabled) {
      this.onToggleProxy(true);
      this.onSelectProxyType(TorSettings.proxy.type);
      this._proxyAddressTextbox.value = TorSettings.proxy.address;
      this._proxyPortTextbox.value = TorSettings.proxy.port;
      this._proxyUsernameTextbox.value = TorSettings.proxy.username;
      this._proxyPasswordTextbox.value = TorSettings.proxy.password;
    }

    // Local firewall
    this._useFirewallCheckbox = document.querySelector(
      selectors.useFirewallCheckbox
    );
    this._useFirewallCheckbox.addEventListener("command", () => {
      const checked = this._useFirewallCheckbox.checked;
      this.onToggleFirewall(checked);
    });
    this._allowedPortsLabel = document.querySelector(
      selectors.firewallAllowedPortsLabel
    );
    this._allowedPortsTextbox = document.querySelector(
      selectors.firewallAllowedPortsTextbox
    );

    this.onToggleFirewall(false);
    if (TorSettings.firewall.enabled) {
      this.onToggleFirewall(true);
      this._allowedPortsTextbox.value =
        TorSettings.firewall.allowed_ports.join(", ");
    }

    const dialog = document.getElementById("torPreferences-connection-dialog");
    dialog.addEventListener("dialogaccept", () => {
      this._applySettings();
    });
  },

  // callback when proxy is toggled
  onToggleProxy(enabled) {
    this._useProxyCheckbox.checked = enabled;
    let disabled = !enabled;

    this._setElementsDisabled(
      [
        this._proxyTypeLabel,
        this._proxyTypeMenulist,
        this._proxyAddressLabel,
        this._proxyAddressTextbox,
        this._proxyPortLabel,
        this._proxyPortTextbox,
        this._proxyUsernameLabel,
        this._proxyUsernameTextbox,
        this._proxyPasswordLabel,
        this._proxyPasswordTextbox,
      ],
      disabled
    );
    if (enabled) {
      this.onSelectProxyType(this._proxyTypeMenulist.value);
    }
  },

  // callback when proxy type is changed
  onSelectProxyType(value) {
    if (typeof value === "string") {
      value = parseInt(value);
    }

    this._proxyTypeMenulist.value = value;
    switch (value) {
      case TorProxyType.Invalid: {
        this._setElementsDisabled(
          [
            this._proxyAddressLabel,
            this._proxyAddressTextbox,
            this._proxyPortLabel,
            this._proxyPortTextbox,
            this._proxyUsernameLabel,
            this._proxyUsernameTextbox,
            this._proxyPasswordLabel,
            this._proxyPasswordTextbox,
          ],
          true
        ); // DISABLE

        this._proxyAddressTextbox.value = "";
        this._proxyPortTextbox.value = "";
        this._proxyUsernameTextbox.value = "";
        this._proxyPasswordTextbox.value = "";
        break;
      }
      case TorProxyType.Socks4: {
        this._setElementsDisabled(
          [
            this._proxyAddressLabel,
            this._proxyAddressTextbox,
            this._proxyPortLabel,
            this._proxyPortTextbox,
          ],
          false
        ); // ENABLE
        this._setElementsDisabled(
          [
            this._proxyUsernameLabel,
            this._proxyUsernameTextbox,
            this._proxyPasswordLabel,
            this._proxyPasswordTextbox,
          ],
          true
        ); // DISABLE

        this._proxyUsernameTextbox.value = "";
        this._proxyPasswordTextbox.value = "";
        break;
      }
      case TorProxyType.Socks5:
      case TorProxyType.HTTPS: {
        this._setElementsDisabled(
          [
            this._proxyAddressLabel,
            this._proxyAddressTextbox,
            this._proxyPortLabel,
            this._proxyPortTextbox,
            this._proxyUsernameLabel,
            this._proxyUsernameTextbox,
            this._proxyPasswordLabel,
            this._proxyPasswordTextbox,
          ],
          false
        ); // ENABLE
        break;
      }
    }
  },

  // callback when firewall proxy is toggled
  onToggleFirewall(enabled) {
    this._useFirewallCheckbox.checked = enabled;
    let disabled = !enabled;

    this._setElementsDisabled(
      [this._allowedPortsLabel, this._allowedPortsTextbox],
      disabled
    );
  },

  // pushes settings from UI to tor
  _applySettings() {
    const type = this._useProxyCheckbox.checked
      ? parseInt(this._proxyTypeMenulist.value)
      : TorProxyType.Invalid;
    const address = this._proxyAddressTextbox.value;
    const port = this._proxyPortTextbox.value;
    const username = this._proxyUsernameTextbox.value;
    const password = this._proxyPasswordTextbox.value;
    switch (type) {
      case TorProxyType.Invalid:
        TorSettings.proxy.enabled = false;
        break;
      case TorProxyType.Socks4:
        TorSettings.proxy.enabled = true;
        TorSettings.proxy.type = type;
        TorSettings.proxy.address = address;
        TorSettings.proxy.port = port;
        TorSettings.proxy.username = "";
        TorSettings.proxy.password = "";
        break;
      case TorProxyType.Socks5:
        TorSettings.proxy.enabled = true;
        TorSettings.proxy.type = type;
        TorSettings.proxy.address = address;
        TorSettings.proxy.port = port;
        TorSettings.proxy.username = username;
        TorSettings.proxy.password = password;
        break;
      case TorProxyType.HTTPS:
        TorSettings.proxy.enabled = true;
        TorSettings.proxy.type = type;
        TorSettings.proxy.address = address;
        TorSettings.proxy.port = port;
        TorSettings.proxy.username = username;
        TorSettings.proxy.password = password;
        break;
    }

    let portListString = this._useFirewallCheckbox.checked
      ? this._allowedPortsTextbox.value
      : "";
    if (portListString) {
      TorSettings.firewall.enabled = true;
      TorSettings.firewall.allowed_ports = portListString;
    } else {
      TorSettings.firewall.enabled = false;
    }

    TorSettings.saveToPrefs();
    // FIXME: What if this fails? Should we prevent the dialog to close and show
    // an error?
    TorSettings.applySettings();
  },
};

window.addEventListener(
  "DOMContentLoaded",
  () => {
    gConnectionSettingsDialog.init();
  },
  { once: true }
);
