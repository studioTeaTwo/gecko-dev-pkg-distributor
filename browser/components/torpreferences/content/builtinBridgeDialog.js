"use strict";

const { TorSettings, TorBridgeSource } = ChromeUtils.importESModule(
  "resource://gre/modules/TorSettings.sys.mjs"
);

const { TorConnect, TorConnectTopics } = ChromeUtils.importESModule(
  "resource://gre/modules/TorConnect.sys.mjs"
);

const gBuiltinBridgeDialog = {
  init() {
    this._result = window.arguments[0];

    this._radioGroup = document.getElementById(
      "torPreferences-builtinBridge-typeSelection"
    );

    const currentBuiltinType =
      TorSettings.bridges.enabled &&
      TorSettings.bridges.source == TorBridgeSource.BuiltIn
        ? TorSettings.bridges.builtin_type
        : null;

    for (const optionEl of this._radioGroup.querySelectorAll(
      ".builtin-bridges-option"
    )) {
      const radio = optionEl.querySelector("radio");
      const type = radio.value;
      optionEl.hidden = !TorSettings.builtinBridgeTypes.includes(type);

      const descriptionEl = optionEl.querySelector(
        ".builtin-bridges-option-description"
      );
      // Set an id to be used for the aria-describedby.
      descriptionEl.id = `builtin-bridges-description-${type}`;
      const currentBadge = optionEl.querySelector(".bridge-status-badge");
      if (type === currentBuiltinType) {
        const currentLabelEl = optionEl.querySelector(
          ".torPreferences-current-bridge-label"
        );
        currentLabelEl.id = `builtin-bridges-current-${type}`;
        // Described by both the current badge and the full description.
        // These will be concatenated together in the screen reader output.
        radio.setAttribute(
          "aria-describedby",
          `${currentLabelEl.id} ${descriptionEl.id}`
        );
        // Make visible.
        currentBadge.classList.add("bridge-status-current-built-in");
      } else {
        // No visible badge.
        radio.setAttribute("aria-describedby", descriptionEl.id);
        currentBadge.classList.remove("bridge-status-current-built-in");
      }
    }

    if (currentBuiltinType) {
      this._radioGroup.value = currentBuiltinType;
    } else {
      this._radioGroup.selectedItem = null;
    }

    this._radioGroup.addEventListener("select", () => this.onSelectChange());

    const dialog = document.getElementById(
      "torPreferences-builtinBridge-dialog"
    );
    dialog.addEventListener("dialogaccept", () => {
      this._result.accepted = true;
    });

    // Add styling for tor-button to the dialog shadow root.
    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href =
      "chrome://browser/content/torpreferences/torPreferences.css";
    dialog.shadowRoot.append(styleLink);

    this._acceptButton = dialog.getButton("accept");

    Services.obs.addObserver(this, TorConnectTopics.StateChange);

    this.onSelectChange();
    this.onAcceptStateChange();
  },

  uninit() {
    Services.obs.removeObserver(this, TorConnectTopics.StateChange);
  },

  onSelectChange() {
    const value = this._radioGroup.value;
    this._acceptButton.disabled = !value;
    this._result.type = value;
  },

  onAcceptStateChange() {
    const connect = TorConnect.canBeginBootstrap;
    this._result.connect = connect;
    this._acceptButton.setAttribute(
      "data-l10n-id",
      connect ? "bridge-dialog-button-connect" : "bridge-dialog-button-accept"
    );
    this._acceptButton.classList.toggle("tor-button", connect);
  },

  observe(subject, topic) {
    switch (topic) {
      case TorConnectTopics.StateChange:
        this.onAcceptStateChange();
        break;
    }
  },
};

// Initial focus is not visible, even if opened with a keyboard. We avoid the
// default handler and manage the focus ourselves, which will paint the focus
// ring by default.
// NOTE: A side effect is that the focus ring will show even if the user opened
// with a mouse event.
// TODO: Remove this once bugzilla bug 1708261 is resolved.
document.subDialogSetDefaultFocus = () => {
  document.getElementById("torPreferences-builtinBridge-typeSelection").focus();
};

window.addEventListener(
  "DOMContentLoaded",
  () => {
    gBuiltinBridgeDialog.init();
    window.addEventListener(
      "unload",
      () => {
        gBuiltinBridgeDialog.uninit();
      },
      { once: true }
    );
  },
  { once: true }
);
