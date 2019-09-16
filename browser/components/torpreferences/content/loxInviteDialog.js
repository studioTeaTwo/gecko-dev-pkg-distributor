"use strict";

const { TorSettings, TorSettingsTopics, TorBridgeSource } =
  ChromeUtils.importESModule("resource://gre/modules/TorSettings.sys.mjs");

const { Lox, LoxError, LoxTopics } = ChromeUtils.importESModule(
  "resource://gre/modules/Lox.sys.mjs"
);

/**
 * Fake Lox module

const LoxError = {
  LoxServerUnreachable: "LoxServerUnreachable",
  Other: "Other",
};

const Lox = {
  remainingInvites: 5,
  getRemainingInviteCount() {
    return this.remainingInvites;
  },
  invites: [
    '{"invite": [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22]}',
    '{"invite": [9,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22]}',
  ],
  getInvites() {
    return this.invites;
  },
  failError: null,
  generateInvite() {
    return new Promise((res, rej) => {
      setTimeout(() => {
        if (this.failError) {
          rej({ type: this.failError });
          return;
        }
        if (!this.remainingInvites) {
          rej({ type: LoxError.Other });
          return;
        }
        const invite = JSON.stringify({
          invite: Array.from({ length: 100 }, () =>
            Math.floor(Math.random() * 265)
          ),
        });
        this.invites.push(invite);
        this.remainingInvites--;
        res(invite);
      }, 4000);
    });
  },
};
*/

const gLoxInvites = {
  /**
   * Initialize the dialog.
   */
  init() {
    this._dialog = document.getElementById("lox-invite-dialog");
    this._remainingInvitesEl = document.getElementById(
      "lox-invite-dialog-remaining"
    );
    this._generateArea = document.getElementById(
      "lox-invite-dialog-generate-area"
    );
    this._generateButton = document.getElementById(
      "lox-invite-dialog-generate-button"
    );
    this._errorEl = document.getElementById("lox-invite-dialog-error-message");
    this._inviteListEl = document.getElementById("lox-invite-dialog-list");

    this._generateButton.addEventListener("click", () => {
      this._generateNewInvite();
    });

    const menu = document.getElementById("lox-invite-dialog-item-menu");
    this._inviteListEl.addEventListener("contextmenu", event => {
      if (!this._inviteListEl.selectedItem) {
        return;
      }
      menu.openPopupAtScreen(event.screenX, event.screenY, true);
    });
    menu.addEventListener("popuphidden", () => {
      menu.setAttribute("aria-hidden", "true");
    });
    menu.addEventListener("popupshowing", () => {
      menu.removeAttribute("aria-hidden");
    });
    document
      .getElementById("lox-invite-dialog-copy-menu-item")
      .addEventListener("command", () => {
        const selected = this._inviteListEl.selectedItem;
        if (!selected) {
          return;
        }
        const clipboard = Cc[
          "@mozilla.org/widget/clipboardhelper;1"
        ].getService(Ci.nsIClipboardHelper);
        clipboard.copyString(selected.textContent);
      });

    // NOTE: TorSettings should already be initialized when this dialog is
    // opened.
    Services.obs.addObserver(this, TorSettingsTopics.SettingsChanged);
    Services.obs.addObserver(this, LoxTopics.UpdateActiveLoxId);
    Services.obs.addObserver(this, LoxTopics.UpdateRemainingInvites);
    Services.obs.addObserver(this, LoxTopics.NewInvite);

    // Set initial _loxId value. Can close this dialog.
    this._updateLoxId();

    this._updateRemainingInvites();
    this._updateExistingInvites();
  },

  /**
   * Un-initialize the dialog.
   */
  uninit() {
    Services.obs.removeObserver(this, TorSettingsTopics.SettingsChanged);
    Services.obs.removeObserver(this, LoxTopics.UpdateActiveLoxId);
    Services.obs.removeObserver(this, LoxTopics.UpdateRemainingInvites);
    Services.obs.removeObserver(this, LoxTopics.NewInvite);
  },

  observe(subject, topic) {
    switch (topic) {
      case TorSettingsTopics.SettingsChanged:
        const { changes } = subject.wrappedJSObject;
        if (changes.includes("bridges.source")) {
          this._updateLoxId();
        }
        break;
      case LoxTopics.UpdateActiveLoxId:
        this._updateLoxId();
        break;
      case LoxTopics.UpdateRemainingInvites:
        this._updateRemainingInvites();
        break;
      case LoxTopics.NewInvite:
        this._updateExistingInvites();
        break;
    }
  },

  /**
   * The loxId this dialog is shown for. null if uninitailized.
   *
   * @type {string?}
   */
  _loxId: null,
  /**
   * Update the _loxId value. Will close the dialog if it changes after
   * initialization.
   */
  _updateLoxId() {
    const loxId =
      TorSettings.bridges.source === TorBridgeSource.Lox ? Lox.activeLoxId : "";
    if (!loxId || (this._loxId !== null && loxId !== this._loxId)) {
      // No lox id, or it changed. Close this dialog.
      this._dialog.cancelDialog();
    }
    this._loxId = loxId;
  },

  /**
   * The invites that are already shown.
   *
   * @type {Set<string>}
   */
  _shownInvites: new Set(),

  /**
   * Add a new invite at the start of the list.
   *
   * @param {string} invite - The invite to add.
   */
  _addInvite(invite) {
    if (this._shownInvites.has(invite)) {
      return;
    }
    const newInvite = document.createXULElement("richlistitem");
    newInvite.classList.add("lox-invite-dialog-list-item");
    newInvite.textContent = invite;

    this._inviteListEl.prepend(newInvite);
    this._shownInvites.add(invite);
  },

  /**
   * Update the display of the existing invites.
   */
  _updateExistingInvites() {
    // Add new invites.

    // NOTE: we only expect invites to be appended, so we won't re-order any.
    // NOTE: invites are ordered with the oldest first.
    for (const invite of Lox.getInvites()) {
      this._addInvite(invite);
    }
  },

  /**
   * The shown number or remaining invites we have.
   *
   * @type {integer}
   */
  _remainingInvites: 0,

  /**
   * Update the display of the remaining invites.
   */
  _updateRemainingInvites() {
    this._remainingInvites = Lox.getRemainingInviteCount(this._loxId);

    document.l10n.setAttributes(
      this._remainingInvitesEl,
      "tor-bridges-lox-remaining-invites",
      { numInvites: this._remainingInvites }
    );
    this._updateGenerateButtonState();
  },

  /**
   * Whether we are currently generating an invite.
   *
   * @type {boolean}
   */
  _generating: false,
  /**
   * Set whether we are generating an invite.
   *
   * @param {boolean} isGenerating - Whether we are generating.
   */
  _setGenerating(isGenerating) {
    this._generating = isGenerating;
    this._updateGenerateButtonState();
    this._generateArea.classList.toggle("show-connecting", isGenerating);
  },

  /**
   * Whether the generate button is disabled.
   *
   * @type {boolean}
   */
  _generateDisabled: false,
  /**
   * Update the state of the generate button.
   */
  _updateGenerateButtonState() {
    const disabled = this._generating || !this._remainingInvites;
    this._generateDisabled = disabled;
    // When generating we use "aria-disabled" rather than the "disabled"
    // attribute so that the button can remain focusable whilst we generate
    // invites.
    // NOTE: When we generate the invite the focus will move to the invite list,
    // so it should be safe to make the button non-focusable in this case.
    const spoofDisabled = this._generating;
    this._generateButton.disabled = disabled && !spoofDisabled;
    this._generateButton.classList.toggle(
      "spoof-button-disabled",
      spoofDisabled
    );
    if (spoofDisabled) {
      this._generateButton.setAttribute("aria-disabled", "true");
    } else {
      this._generateButton.removeAttribute("aria-disabled");
    }
  },

  /**
   * Start generating a new invite.
   */
  _generateNewInvite() {
    if (this._generateDisabled) {
      return;
    }
    if (this._generating) {
      console.error("Already generating an invite");
      return;
    }
    this._setGenerating(true);
    // Clear the previous error.
    this._updateGenerateError(null);

    let moveFocus = false;
    Lox.generateInvite(this._loxId)
      .finally(() => {
        // Fetch whether the generate button has focus before we potentially
        // disable it.
        moveFocus = this._generateButton.contains(document.activeElement);
        this._setGenerating(false);
      })
      .then(
        invite => {
          this._addInvite(invite);

          if (!this._inviteListEl.contains(document.activeElement)) {
            // Does not have focus, change the selected item to be the new
            // invite (at index 0).
            this._inviteListEl.selectedIndex = 0;
          }

          if (moveFocus) {
            // Move focus to the new invite before we hide the "Connecting"
            // message.
            this._inviteListEl.focus();
          }
        },
        loxError => {
          console.error("Failed to generate an invite", loxError);
          switch (loxError instanceof LoxError ? loxError.code : null) {
            case LoxError.LoxServerUnreachable:
              this._updateGenerateError("no-server");
              break;
            default:
              this._updateGenerateError("generic");
              break;
          }
        }
      );
  },

  /**
   * Update the shown generation error.
   *
   * @param {string?} type - The error type, or null if no error should be
   *   shown.
   */
  _updateGenerateError(type) {
    // First clear the existing error.
    this._errorEl.removeAttribute("data-l10n-id");
    this._errorEl.textContent = "";
    this._generateArea.classList.toggle("show-error", !!type);

    if (!type) {
      return;
    }

    let errorId;
    switch (type) {
      case "no-server":
        errorId = "lox-invite-dialog-no-server-error";
        break;
      case "generic":
        // Generic error.
        errorId = "lox-invite-dialog-generic-invite-error";
        break;
    }

    document.l10n.setAttributes(this._errorEl, errorId);
  },
};

window.addEventListener(
  "DOMContentLoaded",
  () => {
    gLoxInvites.init();
    window.addEventListener(
      "unload",
      () => {
        gLoxInvites.uninit();
      },
      { once: true }
    );
  },
  { once: true }
);
