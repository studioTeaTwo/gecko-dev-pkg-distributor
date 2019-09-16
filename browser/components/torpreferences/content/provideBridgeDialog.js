"use strict";

const { TorSettings, TorBridgeSource, validateBridgeLines } =
  ChromeUtils.importESModule("resource://gre/modules/TorSettings.sys.mjs");

const { TorConnect, TorConnectTopics } = ChromeUtils.importESModule(
  "resource://gre/modules/TorConnect.sys.mjs"
);

const { TorParsers } = ChromeUtils.importESModule(
  "resource://gre/modules/TorParsers.sys.mjs"
);

const { Lox, LoxError } = ChromeUtils.importESModule(
  "resource://gre/modules/Lox.sys.mjs"
);

/*
 * Fake Lox module:

const LoxError = {
  BadInvite: "BadInvite",
  LoxServerUnreachable: "LoxServerUnreachable",
  Other: "Other",
};

const Lox = {
  failError: null,
  // failError: LoxError.BadInvite,
  // failError: LoxError.LoxServerUnreachable,
  // failError: LoxError.Other,
  redeemInvite(invite) {
    return new Promise((res, rej) => {
      setTimeout(() => {
        if (this.failError) {
          rej({ type: this.failError });
        }
        res("lox-id-000000");
      }, 4000);
    });
  },
  validateInvitation(invite) {
    return invite.startsWith("lox-invite");
  },
  getBridges(id) {
    return [
      "0:0 AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "0:1 BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    ];
  },
};
*/

const gProvideBridgeDialog = {
  init() {
    this._result = window.arguments[0];
    const mode = window.arguments[1].mode;

    let titleId;
    switch (mode) {
      case "edit":
        titleId = "user-provide-bridge-dialog-edit-title";
        break;
      case "add":
        titleId = "user-provide-bridge-dialog-add-title";
        break;
      case "replace":
      default:
        titleId = "user-provide-bridge-dialog-replace-title";
        break;
    }

    document.l10n.setAttributes(document.documentElement, titleId);

    this._allowLoxInvite = mode !== "edit" && Lox.enabled;

    document.l10n.setAttributes(
      document.getElementById("user-provide-bridge-textarea-label"),
      this._allowLoxInvite
        ? "user-provide-bridge-dialog-textarea-addresses-or-invite-label"
        : "user-provide-bridge-dialog-textarea-addresses-label"
    );

    this._dialog = document.getElementById("user-provide-bridge-dialog");
    this._acceptButton = this._dialog.getButton("accept");

    // Inject our stylesheet into the shadow root so that the accept button can
    // take the spoof-button-disabled styling and tor-button styling.
    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href =
      "chrome://browser/content/torpreferences/torPreferences.css";
    this._dialog.shadowRoot.append(styleLink);

    this._textarea = document.getElementById("user-provide-bridge-textarea");
    this._errorEl = document.getElementById(
      "user-provide-bridge-error-message"
    );
    this._resultDescription = document.getElementById(
      "user-provide-result-description"
    );
    this._bridgeGrid = document.getElementById(
      "user-provide-bridge-grid-display"
    );
    this._rowTemplate = document.getElementById(
      "user-provide-bridge-row-template"
    );

    if (mode === "edit") {
      // Only expected if the bridge source is UseProvided, but verify to be
      // sure.
      if (TorSettings.bridges.source == TorBridgeSource.UserProvided) {
        this._textarea.value = TorSettings.bridges.bridge_strings.join("\n");
      }
    } else {
      // Set placeholder if not editing.
      document.l10n.setAttributes(
        this._textarea,
        this._allowLoxInvite
          ? "user-provide-bridge-dialog-textarea-addresses-or-invite"
          : "user-provide-bridge-dialog-textarea-addresses"
      );
    }

    this._textarea.addEventListener("input", () => this.onValueChange());

    this._dialog.addEventListener("dialogaccept", event =>
      this.onDialogAccept(event)
    );

    Services.obs.addObserver(this, TorConnectTopics.StateChange);

    this.setPage("entry");
    this.checkValue();
  },

  uninit() {
    Services.obs.removeObserver(this, TorConnectTopics.StateChange);
  },

  /**
   * Set the page to display.
   *
   * @param {string} page - The page to show.
   */
  setPage(page) {
    this._page = page;
    this._dialog.classList.toggle("show-entry-page", page === "entry");
    this._dialog.classList.toggle("show-result-page", page === "result");
    this.takeFocus();
    this.updateResult();
    this.updateAcceptDisabled();
    this.onAcceptStateChange();
  },

  /**
   * Reset focus position in the dialog.
   */
  takeFocus() {
    switch (this._page) {
      case "entry":
        this._textarea.focus();
        break;
      case "result":
        // Move focus to the table.
        // In particular, we do not want to keep the focus on the (same) accept
        // button (with now different text).
        this._bridgeGrid.focus();
        break;
    }
  },

  /**
   * Callback for whenever the input value changes.
   */
  onValueChange() {
    this.updateAcceptDisabled();
    // Reset errors whenever the value changes.
    this.updateError(null);
  },

  /**
   * Callback for whenever the accept button may need to change.
   */
  onAcceptStateChange() {
    let connect = false;
    if (this._page === "entry") {
      this._acceptButton.setAttribute(
        "data-l10n-id",
        "user-provide-bridge-dialog-next-button"
      );
    } else {
      connect = TorConnect.canBeginBootstrap;
      this._acceptButton.setAttribute(
        "data-l10n-id",
        connect ? "bridge-dialog-button-connect" : "bridge-dialog-button-accept"
      );
    }
    this._result.connect = connect;
    this._acceptButton.classList.toggle("tor-button", connect);
  },

  /**
   * Whether the dialog accept button is disabled.
   *
   * @type {boolean}
   */
  _acceptDisabled: false,
  /**
   * Callback for whenever the accept button's might need to be disabled.
   */
  updateAcceptDisabled() {
    const disabled =
      this._page === "entry" && (this.isEmpty() || this._loxLoading);
    this._acceptDisabled = disabled;
    // Spoof the button to look and act as if it is disabled, but still allow
    // keyboard focus so the user can sit on this button whilst we are loading.
    this._acceptButton.classList.toggle("spoof-button-disabled", disabled);
    if (disabled) {
      this._acceptButton.setAttribute("aria-disabled", "true");
    } else {
      this._acceptButton.removeAttribute("aria-disabled");
    }
  },

  /**
   * The lox loading state.
   *
   * @type {boolean}
   */
  _loxLoading: false,

  /**
   * Set the lox loading state. I.e. whether we are connecting to the lox
   * server.
   *
   * @param {boolean} isLoading - Whether we are loading or not.
   */
  setLoxLoading(isLoading) {
    this._loxLoading = isLoading;
    this._textarea.readOnly = isLoading;
    this._dialog.classList.toggle("show-connecting", isLoading);
    this.updateAcceptDisabled();
  },

  /**
   * Callback for when the accept button is pressed.
   *
   * @param {Event} event - The dialogaccept event.
   */
  onDialogAccept(event) {
    if (this._acceptDisabled) {
      // Prevent closing.
      event.preventDefault();
      return;
    }

    if (this._page === "result") {
      this._result.accepted = true;
      // Continue to close the dialog.
      return;
    }
    // Prevent closing the dialog.
    event.preventDefault();

    if (this._loxLoading) {
      // User can still click Next whilst loading.
      console.error("Already have a pending lox invite");
      return;
    }

    // Clear the result from any previous attempt.
    delete this._result.loxId;
    delete this._result.addresses;
    // Clear any previous error.
    this.updateError(null);

    const value = this.checkValue();
    if (!value) {
      // Not valid.
      return;
    }
    if (value.loxInvite) {
      this.setLoxLoading(true);
      Lox.redeemInvite(value.loxInvite)
        .finally(() => {
          // Set set the loading to false before setting the errors.
          this.setLoxLoading(false);
        })
        .then(
          loxId => {
            this._result.loxId = loxId;
            this.setPage("result");
          },
          loxError => {
            console.error("Redeeming failed", loxError);
            switch (loxError instanceof LoxError ? loxError.code : null) {
              case LoxError.BadInvite:
                // TODO: distinguish between a bad invite, an invite that has
                // expired, and an invite that has already been redeemed.
                this.updateError({ type: "bad-invite" });
                break;
              case LoxError.LoxServerUnreachable:
                this.updateError({ type: "no-server" });
                break;
              default:
                this.updateError({ type: "invite-error" });
                break;
            }
          }
        );
      return;
    }

    if (!value.addresses?.length) {
      // Not valid
      return;
    }
    this._result.addresses = value.addresses;
    this.setPage("result");
  },

  /**
   * Update the displayed error.
   *
   * @param {object?} error - The error to show, or null if no error should be
   *   shown. Should include the "type" property.
   */
  updateError(error) {
    // First clear the existing error.
    this._errorEl.removeAttribute("data-l10n-id");
    this._errorEl.textContent = "";
    if (error) {
      this._textarea.setAttribute("aria-invalid", "true");
    } else {
      this._textarea.removeAttribute("aria-invalid");
    }
    this._textarea.classList.toggle("invalid-input", !!error);
    this._dialog.classList.toggle("show-error", !!error);

    if (!error) {
      return;
    }

    let errorId;
    let errorArgs;
    switch (error.type) {
      case "invalid-address":
        errorId = "user-provide-bridge-dialog-address-error";
        errorArgs = { line: error.line };
        break;
      case "multiple-invites":
        errorId = "user-provide-bridge-dialog-multiple-invites-error";
        break;
      case "mixed":
        errorId = "user-provide-bridge-dialog-mixed-error";
        break;
      case "not-allowed-invite":
        errorId = "user-provide-bridge-dialog-invite-not-allowed-error";
        break;
      case "bad-invite":
        errorId = "user-provide-bridge-dialog-bad-invite-error";
        break;
      case "no-server":
        errorId = "user-provide-bridge-dialog-no-server-error";
        break;
      case "invite-error":
        // Generic invite error.
        errorId = "user-provide-bridge-dialog-generic-invite-error";
        break;
    }

    document.l10n.setAttributes(this._errorEl, errorId, errorArgs);
  },

  /**
   * The condition for the value to be empty.
   *
   * @type {RegExp}
   */
  _emptyRegex: /^\s*$/,
  /**
   * Whether the input is considered empty.
   *
   * @returns {boolean} true if it is considered empty.
   */
  isEmpty() {
    return this._emptyRegex.test(this._textarea.value);
  },

  /**
   * Check the current value in the textarea.
   *
   * @returns {object?} - The bridge addresses, or lox invite, or null if no
   *   valid value.
   */
  checkValue() {
    if (this.isEmpty()) {
      // If empty, we just disable the button, rather than show an error.
      this.updateError(null);
      return null;
    }

    // Only check if this looks like a Lox invite when the Lox module is
    // enabled.
    if (Lox.enabled) {
      let loxInvite = null;
      for (let line of this._textarea.value.split(/\r?\n/)) {
        line = line.trim();
        if (!line) {
          continue;
        }
        // TODO: Once we have a Lox invite encoding, distinguish between a valid
        // invite and something that looks like it should be an invite.
        const isLoxInvite = Lox.validateInvitation(line);
        if (isLoxInvite) {
          if (!this._allowLoxInvite) {
            // Lox is enabled, but not allowed invites when editing bridge
            // addresses.
            this.updateError({ type: "not-allowed-invite" });
            return null;
          }
          if (loxInvite) {
            this.updateError({ type: "multiple-invites" });
            return null;
          }
          loxInvite = line;
        } else if (loxInvite) {
          this.updateError({ type: "mixed" });
          return null;
        }
      }

      if (loxInvite) {
        return { loxInvite };
      }
    }

    const validation = validateBridgeLines(this._textarea.value);
    if (validation.errorLines.length) {
      // Report first error.
      this.updateError({
        type: "invalid-address",
        line: validation.errorLines[0],
      });
      return null;
    }

    return { addresses: validation.validBridges };
  },

  /**
   * Update the shown result on the last page.
   */
  updateResult() {
    if (this._page !== "result") {
      return;
    }

    const loxId = this._result.loxId;

    document.l10n.setAttributes(
      this._resultDescription,
      loxId
        ? "user-provide-bridge-dialog-result-invite"
        : "user-provide-bridge-dialog-result-addresses"
    );

    this._bridgeGrid.replaceChildren();

    const bridgeResult = loxId ? Lox.getBridges(loxId) : this._result.addresses;

    for (const bridgeLine of bridgeResult) {
      let details;
      try {
        details = TorParsers.parseBridgeLine(bridgeLine);
      } catch (e) {
        console.error(`Detected invalid bridge line: ${bridgeLine}`, e);
      }

      const rowEl = this._rowTemplate.content.children[0].cloneNode(true);

      const emojiBlock = rowEl.querySelector(".tor-bridges-emojis-block");
      const BridgeEmoji = customElements.get("tor-bridge-emoji");
      for (const cell of BridgeEmoji.createForAddress(bridgeLine)) {
        // Each emoji is its own cell, we rely on the fact that createForAddress
        // always returns four elements.
        cell.setAttribute("role", "cell");
        cell.classList.add("tor-bridges-grid-cell", "tor-bridges-emoji-cell");
        emojiBlock.append(cell);
      }

      const transport = details?.transport ?? "vanilla";
      const typeCell = rowEl.querySelector(".tor-bridges-type-cell");
      if (transport === "vanilla") {
        document.l10n.setAttributes(
          typeCell,
          "tor-bridges-type-prefix-generic"
        );
      } else {
        document.l10n.setAttributes(typeCell, "tor-bridges-type-prefix", {
          type: transport,
        });
      }

      rowEl.querySelector(".tor-bridges-address-cell-text").textContent =
        bridgeLine;

      this._bridgeGrid.append(rowEl);
    }
  },

  observe(subject, topic) {
    switch (topic) {
      case TorConnectTopics.StateChange:
        this.onAcceptStateChange();
        break;
    }
  },
};

document.subDialogSetDefaultFocus = () => {
  // Set the focus to the text area on load.
  gProvideBridgeDialog.takeFocus();
};

window.addEventListener(
  "DOMContentLoaded",
  () => {
    gProvideBridgeDialog.init();
    window.addEventListener(
      "unload",
      () => {
        gProvideBridgeDialog.uninit();
      },
      { once: true }
    );
  },
  { once: true }
);
