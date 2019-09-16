// Copyright (c) 2022, The Tor Project, Inc.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";

/* import-globals-from /browser/components/preferences/preferences.js */
/* import-globals-from /browser/components/preferences/search.js */

const { setTimeout, clearTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { TorSettings, TorSettingsTopics, TorBridgeSource } =
  ChromeUtils.importESModule("resource://gre/modules/TorSettings.sys.mjs");

const { TorParsers } = ChromeUtils.importESModule(
  "resource://gre/modules/TorParsers.sys.mjs"
);
const { TorProviderBuilder, TorProviderTopics } = ChromeUtils.importESModule(
  "resource://gre/modules/TorProviderBuilder.sys.mjs"
);

const { TorConnect, TorConnectTopics, TorConnectState, TorCensorshipLevel } =
  ChromeUtils.importESModule("resource://gre/modules/TorConnect.sys.mjs");

const { MoatRPC } = ChromeUtils.importESModule(
  "resource://gre/modules/Moat.sys.mjs"
);

const { QRCode } = ChromeUtils.importESModule(
  "resource://gre/modules/QRCode.sys.mjs"
);

const { TorStrings } = ChromeUtils.importESModule(
  "resource://gre/modules/TorStrings.sys.mjs"
);

const { Lox, LoxTopics } = ChromeUtils.importESModule(
  "resource://gre/modules/Lox.sys.mjs"
);

const log = console.createInstance({
  maxLogLevel: "Warn",
  prefix: "connectionPane",
});

/*
 * Fake Lox module:

const Lox = {
  levelHistory: [0, 1],
  // levelHistory: [1, 2],
  // levelHistory: [2, 3],
  // levelHistory: [3, 4],
  // levelHistory: [0, 1, 2],
  // levelHistory: [1, 2, 3],
  // levelHistory: [4, 3],
  // levelHistory: [4, 1],
  // levelHistory: [2, 1],
  //levelHistory: [2, 3, 4, 1, 2],
  // Gain some invites and then loose them all. Shouldn't show any change.
  // levelHistory: [0, 1, 2, 1],
  // levelHistory: [1, 2, 3, 1],
  getEventData() {
    let prevLevel = this.levelHistory[0];
    const events = [];
    for (let i = 1; i < this.levelHistory.length; i++) {
      const level = this.levelHistory[i];
      events.push({ type: level > prevLevel ? "levelup" : "blockage", newLevel: level });
      prevLevel = level;
    }
    return events;
  },
  clearEventData() {
    this.levelHistory = [];
  },
  nextUnlock: { date: "2024-01-31T00:00:00Z", nextLevel: 1 },
  //nextUnlock: { date: "2024-01-31T00:00:00Z", nextLevel: 2 },
  //nextUnlock: { date: "2024-01-31T00:00:00Z", nextLevel: 3 },
  //nextUnlock: { date: "2024-01-31T00:00:00Z", nextLevel: 4 },
  getNextUnlock() {
    return this.nextUnlock;
  },
  remainingInvites: 3,
  // remainingInvites: 0,
  getRemainingInviteCount() {
    return this.remainingInvites;
  },
  invites: [],
  // invites: ["a", "b"],
  getInvites() {
    return this.invites;
  },
};
*/

/**
 * Make changes to TorSettings and save them.
 *
 * Bulk changes will be frozen together.
 *
 * @param {Function} changes - Method to apply changes to TorSettings.
 */
async function setTorSettings(changes) {
  if (!TorSettings.initialized) {
    log.warning("Ignoring changes to uninitialized TorSettings");
    return;
  }
  TorSettings.freezeNotifications();
  try {
    changes();
    // This will trigger TorSettings.#cleanupSettings()
    TorSettings.saveToPrefs();
    try {
      await TorSettings.applySettings();
    } catch (e) {
      console.error("Failed to apply Tor settings", e);
    }
  } finally {
    TorSettings.thawNotifications();
  }
}

/**
 * Get the ID/fingerprint of the bridge used in the most recent Tor circuit.
 *
 * @returns {string?} - The bridge ID or null if a bridge with an id was not
 *   used in the last circuit.
 */
async function getConnectedBridgeId() {
  // TODO: PieroV: We could make sure TorSettings is in sync by monitoring also
  // changes of settings. At that point, we could query it, instead of doing a
  // query over the control port.
  let bridge = null;
  try {
    const provider = await TorProviderBuilder.build();
    bridge = provider.currentBridge;
  } catch (e) {
    console.warn("Could not get current bridge", e);
  }
  return bridge?.fingerprint ?? null;
}

/**
 * Show the bridge QR to the user.
 *
 * @param {string} bridgeString - The string to use in the QR.
 */
function showBridgeQr(bridgeString) {
  gSubDialog.open(
    "chrome://browser/content/torpreferences/bridgeQrDialog.xhtml",
    { features: "resizable=yes" },
    bridgeString
  );
}

// TODO: Instead of aria-live in the DOM, use the proposed ariaNotify
// API if it gets accepted into firefox and works with screen readers.
// See https://github.com/WICG/proposals/issues/112
/**
 * Notification for screen reader users.
 */
const gBridgesNotification = {
  /**
   * The screen reader area that shows updates.
   *
   * @type {Element?}
   */
  _updateArea: null,
  /**
   * The text for the screen reader update.
   *
   * @type {Element?}
   */
  _textEl: null,
  /**
   * A timeout for hiding the update.
   *
   * @type {integer?}
   */
  _hideUpdateTimeout: null,

  /**
   * Initialize the area for notifications.
   */
  init() {
    this._updateArea = document.getElementById("tor-bridges-update-area");
    this._textEl = document.getElementById("tor-bridges-update-area-text");
  },

  /**
   * Post a new notification, replacing any existing one.
   *
   * @param {string} type - The notification type.
   */
  post(type) {
    this._updateArea.hidden = false;
    // First we clear the update area to reset the text to be empty.
    this._textEl.removeAttribute("data-l10n-id");
    this._textEl.textContent = "";
    if (this._hideUpdateTimeout !== null) {
      clearTimeout(this._hideUpdateTimeout);
      this._hideUpdateTimeout = null;
    }

    let updateId;
    switch (type) {
      case "removed-one":
        updateId = "tor-bridges-update-removed-one-bridge";
        break;
      case "removed-all":
        updateId = "tor-bridges-update-removed-all-bridges";
        break;
      case "changed":
      default:
        // Generic message for when bridges change.
        updateId = "tor-bridges-update-changed-bridges";
        break;
    }

    // Hide the area after 5 minutes, when the update is not "recent" any
    // more.
    this._hideUpdateTimeout = setTimeout(() => {
      this._updateArea.hidden = true;
    }, 300000);

    // Wait a small amount of time to actually set the textContent. Otherwise
    // the screen reader (tested with Orca) may not pick up on the change in
    // text.
    setTimeout(() => {
      document.l10n.setAttributes(this._textEl, updateId);
    }, 500);
  },
};

/**
 * Controls the bridge grid.
 */
const gBridgeGrid = {
  /**
   * The grid element.
   *
   * @type {Element?}
   */
  _grid: null,
  /**
   * The template for creating new rows.
   *
   * @type {HTMLTemplateElement?}
   */
  _rowTemplate: null,

  /**
   * @typedef {object} BridgeGridRow
   *
   * @property {Element} element - The row element.
   * @property {Element} optionsButton - The options button.
   * @property {Element} menu - The options menupopup.
   * @property {Element} statusEl - The bridge status element.
   * @property {Element} statusText - The status text.
   * @property {string} bridgeLine - The identifying bridge string for this row.
   * @property {string?} bridgeId - The ID/fingerprint for the bridge, or null
   *   if it doesn't have one.
   * @property {integer} index - The index of the row in the grid.
   * @property {boolean} connected - Whether we are connected to the bridge
   *   (recently in use for a Tor circuit).
   * @property {BridgeGridCell[]} cells - The cells that belong to the row,
   *   ordered by their column.
   */
  /**
   * @typedef {object} BridgeGridCell
   *
   * @property {Element} element - The cell element.
   * @property {Element} focusEl - The element belonging to the cell that should
   *   receive focus. Should be the cell element itself, or an interactive
   *   focusable child.
   * @property {integer} columnIndex - The index of the column this cell belongs
   *   to.
   * @property {BridgeGridRow} row - The row this cell belongs to.
   */
  /**
   * The current rows in the grid.
   *
   * @type {BridgeGridRow[]}
   */
  _rows: [],
  /**
   * The cell that should be the focus target when the user moves focus into the
   * grid, or null if the grid itself should be the target.
   *
   * @type {BridgeGridCell?}
   */
  _focusCell: null,

  /**
   * Initialize the bridge grid.
   */
  init() {
    this._grid = document.getElementById("tor-bridges-grid-display");
    // Initially, make only the grid itself part of the keyboard tab cycle.
    // matches _focusCell = null.
    this._grid.tabIndex = 0;

    this._rowTemplate = document.getElementById(
      "tor-bridges-grid-row-template"
    );

    this._grid.addEventListener("keydown", this);
    this._grid.addEventListener("mousedown", this);
    this._grid.addEventListener("focusin", this);

    Services.obs.addObserver(this, TorSettingsTopics.SettingsChanged);

    // NOTE: Before initializedPromise completes, this area is hidden.
    TorSettings.initializedPromise.then(() => {
      this._updateRows(true);
    });
  },

  /**
   * Uninitialize the bridge grid.
   */
  uninit() {
    Services.obs.removeObserver(this, TorSettingsTopics.SettingsChanged);
    this.deactivate();
  },

  /**
   * Whether the grid is visible and responsive.
   *
   * @type {boolean}
   */
  _active: false,

  /**
   * Activate and show the bridge grid.
   */
  activate() {
    if (this._active) {
      return;
    }

    this._active = true;

    Services.obs.addObserver(this, TorProviderTopics.BridgeChanged);

    this._grid.classList.add("grid-active");

    this._updateConnectedBridge();
  },

  /**
   * Deactivate and hide the bridge grid.
   */
  deactivate() {
    if (!this._active) {
      return;
    }

    this._active = false;

    this._forceCloseRowMenus();

    this._grid.classList.remove("grid-active");

    Services.obs.removeObserver(this, TorProviderTopics.BridgeChanged);
  },

  observe(subject, topic) {
    switch (topic) {
      case TorSettingsTopics.SettingsChanged:
        const { changes } = subject.wrappedJSObject;
        if (
          changes.includes("bridges.source") ||
          changes.includes("bridges.bridge_strings")
        ) {
          this._updateRows();
        }
        break;
      case TorProviderTopics.BridgeChanged:
        this._updateConnectedBridge();
        break;
    }
  },

  handleEvent(event) {
    if (event.type === "keydown") {
      if (event.altKey || event.shiftKey || event.metaKey || event.ctrlKey) {
        // Don't interfere with these events.
        return;
      }

      if (this._rows.some(row => row.menu.open)) {
        // Have an open menu, let the menu handle the event instead.
        return;
      }

      let numRows = this._rows.length;
      if (!numRows) {
        // Nowhere for focus to go.
        return;
      }

      let moveRow = 0;
      let moveColumn = 0;
      const isLTR = this._grid.matches(":dir(ltr)");
      switch (event.key) {
        case "ArrowDown":
          moveRow = 1;
          break;
        case "ArrowUp":
          moveRow = -1;
          break;
        case "ArrowRight":
          moveColumn = isLTR ? 1 : -1;
          break;
        case "ArrowLeft":
          moveColumn = isLTR ? -1 : 1;
          break;
        default:
          return;
      }

      // Prevent scrolling the nearest scroll container.
      event.preventDefault();

      const curCell = this._focusCell;
      let row = curCell ? curCell.row.index + moveRow : 0;
      let column = curCell ? curCell.columnIndex + moveColumn : 0;

      // Clamp in bounds.
      if (row < 0) {
        row = 0;
      } else if (row >= numRows) {
        row = numRows - 1;
      }

      const numCells = this._rows[row].cells.length;
      if (column < 0) {
        column = 0;
      } else if (column >= numCells) {
        column = numCells - 1;
      }

      const newCell = this._rows[row].cells[column];

      if (newCell !== curCell) {
        this._setFocus(newCell);
      }
    } else if (event.type === "mousedown") {
      if (event.button !== 0) {
        return;
      }
      // Move focus index to the clicked target.
      // NOTE: Since the cells and the grid have "tabindex=-1", they are still
      // click-focusable. Therefore, the default mousedown handler will try to
      // move focus to it.
      // Rather than block this default handler, we instead re-direct the focus
      // to the correct cell in the "focusin" listener.
      const newCell = this._getCellFromTarget(event.target);
      // NOTE: If newCell is null, then we do nothing here, but instead wait for
      // the focusin handler to trigger.
      if (newCell && newCell !== this._focusCell) {
        this._setFocus(newCell);
      }
    } else if (event.type === "focusin") {
      const focusCell = this._getCellFromTarget(event.target);
      if (focusCell !== this._focusCell) {
        // Focus is not where it is expected.
        // E.g. the user has clicked the edge of the grid.
        // Restore focus immediately back to the cell we expect.
        this._setFocus(this._focusCell);
      }
    }
  },

  /**
   * Return the cell that was the target of an event.
   *
   * @param {Element} element - The target of an event.
   *
   * @returns {BridgeGridCell?} - The cell that the element belongs to, or null
   *   if it doesn't belong to any cell.
   */
  _getCellFromTarget(element) {
    for (const row of this._rows) {
      for (const cell of row.cells) {
        if (cell.element.contains(element)) {
          return cell;
        }
      }
    }
    return null;
  },

  /**
   * Determine whether the document's active element (focus) is within the grid
   * or not.
   *
   * @returns {boolean} - Whether focus is within this grid or not.
   */
  _focusWithin() {
    return this._grid.contains(document.activeElement);
  },

  /**
   * Set the cell that should be the focus target of the grid, possibly moving
   * the document's focus as well.
   *
   * @param {BridgeGridCell?} cell - The cell to make the focus target, or null
   *   if the grid itself should be the target.
   * @param {boolean} [focusWithin] - Whether focus should be moved within the
   *   grid. If undefined, this will move focus if the grid currently contains
   *   the document's focus.
   */
  _setFocus(cell, focusWithin) {
    if (focusWithin === undefined) {
      focusWithin = this._focusWithin();
    }
    const prevFocusElement = this._focusCell
      ? this._focusCell.focusEl
      : this._grid;
    const newFocusElement = cell ? cell.focusEl : this._grid;

    if (prevFocusElement !== newFocusElement) {
      prevFocusElement.tabIndex = -1;
      newFocusElement.tabIndex = 0;
    }
    // Set _focusCell now, before we potentially call "focus", which can trigger
    // the "focusin" handler.
    this._focusCell = cell;

    if (focusWithin) {
      // Focus was within the grid, so we need to actively move it to the new
      // element.
      newFocusElement.focus({ preventScroll: true });
      // Scroll to the whole cell into view, rather than just the focus element.
      (cell?.element ?? newFocusElement).scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  },

  /**
   * Reset the grids focus to be the first row's first cell, if any.
   *
   * @param {boolean} [focusWithin] - Whether focus should be moved within the
   *   grid. If undefined, this will move focus if the grid currently contains
   *   the document's focus.
   */
  _resetFocus(focusWithin) {
    this._setFocus(
      this._rows.length ? this._rows[0].cells[0] : null,
      focusWithin
    );
  },

  /**
   * The bridge ID/fingerprint of the most recently used bridge (appearing in
   * the latest Tor circuit). Roughly corresponds to the bridge we are currently
   * connected to.
   *
   * null if there are no such bridges.
   *
   * @type {string?}
   */
  _connectedBridgeId: null,
  /**
   * Update _connectedBridgeId.
   */
  async _updateConnectedBridge() {
    const bridgeId = await getConnectedBridgeId();
    if (bridgeId === this._connectedBridgeId) {
      return;
    }
    this._connectedBridgeId = bridgeId;
    for (const row of this._rows) {
      this._updateRowStatus(row);
    }
  },

  /**
   * Update the status of a row.
   *
   * @param {BridgeGridRow} row - The row to update.
   */
  _updateRowStatus(row) {
    const connected = row.bridgeId && this._connectedBridgeId === row.bridgeId;
    // NOTE: row.connected is initially undefined, so won't match `connected`.
    if (connected === row.connected) {
      return;
    }

    row.connected = connected;

    const noStatus = !connected;

    row.element.classList.toggle("hide-status", noStatus);
    row.statusEl.classList.toggle("bridge-status-none", noStatus);
    row.statusEl.classList.toggle("bridge-status-connected", connected);

    if (connected) {
      document.l10n.setAttributes(
        row.statusText,
        "tor-bridges-status-connected"
      );
    } else {
      document.l10n.setAttributes(row.statusText, "tor-bridges-status-none");
    }
  },

  /**
   * Create a new row for the grid.
   *
   * @param {string} bridgeLine - The bridge line for this row, which also acts
   *   as its ID.
   *
   * @returns {BridgeGridRow} - A new row, with then "index" unset and the
   *   "element" without a parent.
   */
  _createRow(bridgeLine) {
    let details;
    try {
      details = TorParsers.parseBridgeLine(bridgeLine);
    } catch (e) {
      console.error(`Detected invalid bridge line: ${bridgeLine}`, e);
    }
    const row = {
      element: this._rowTemplate.content.children[0].cloneNode(true),
      bridgeLine,
      bridgeId: details?.id ?? null,
      cells: [],
    };

    const emojiBlock = row.element.querySelector(".tor-bridges-emojis-block");
    const BridgeEmoji = customElements.get("tor-bridge-emoji");
    for (const cell of BridgeEmoji.createForAddress(bridgeLine)) {
      // Each emoji is its own cell, we rely on the fact that createForAddress
      // always returns four elements.
      cell.setAttribute("role", "gridcell");
      cell.classList.add("tor-bridges-grid-cell", "tor-bridges-emoji-cell");
      emojiBlock.append(cell);
    }

    for (const [columnIndex, element] of row.element
      .querySelectorAll(".tor-bridges-grid-cell")
      .entries()) {
      const focusEl =
        element.querySelector(".tor-bridges-grid-focus") ?? element;
      // Set a negative tabIndex, this makes the element click-focusable but not
      // part of the tab navigation sequence.
      focusEl.tabIndex = -1;
      row.cells.push({ element, focusEl, columnIndex, row });
    }

    const transport = details?.transport ?? "vanilla";
    const typeCell = row.element.querySelector(".tor-bridges-type-cell");
    if (transport === "vanilla") {
      document.l10n.setAttributes(typeCell, "tor-bridges-type-prefix-generic");
    } else {
      document.l10n.setAttributes(typeCell, "tor-bridges-type-prefix", {
        type: transport,
      });
    }

    row.element.querySelector(".tor-bridges-address-cell-text").textContent =
      bridgeLine;

    row.statusEl = row.element.querySelector(
      ".tor-bridges-status-cell .bridge-status-badge"
    );
    row.statusText = row.element.querySelector(".tor-bridges-status-cell-text");

    this._initRowMenu(row);

    this._updateRowStatus(row);
    return row;
  },

  /**
   * The row menu index used for generating new ids.
   *
   * @type {integer}
   */
  _rowMenuIndex: 0,
  /**
   * Generate a new id for the options menu.
   *
   * @returns {string} - The new id.
   */
  _generateRowMenuId() {
    const id = `tor-bridges-individual-options-menu-${this._rowMenuIndex}`;
    // Assume we won't run out of ids.
    this._rowMenuIndex++;
    return id;
  },

  /**
   * Initialize the shared menu for a row.
   *
   * @param {BridgeGridRow} row - The row to initialize the menu of.
   */
  _initRowMenu(row) {
    row.menu = row.element.querySelector(
      ".tor-bridges-individual-options-menu"
    );
    row.optionsButton = row.element.querySelector(
      ".tor-bridges-options-cell-button"
    );

    row.menu.id = this._generateRowMenuId();
    row.optionsButton.setAttribute("aria-controls", row.menu.id);

    row.optionsButton.addEventListener("click", event => {
      row.menu.toggle(event);
    });

    row.menu.addEventListener("hidden", () => {
      // Make sure the button receives focus again when the menu is hidden.
      // Currently, panel-list.js only does this when the menu is opened with a
      // keyboard, but this causes focus to be lost from the page if the user
      // uses a mixture of keyboard and mouse.
      row.optionsButton.focus();
    });

    const qrItem = row.menu.querySelector(
      ".tor-bridges-options-qr-one-menu-item"
    );
    const removeItem = row.menu.querySelector(
      ".tor-bridges-options-remove-one-menu-item"
    );
    row.menu.addEventListener("showing", () => {
      const show =
        this._bridgeSource === TorBridgeSource.UserProvided ||
        this._bridgeSource === TorBridgeSource.BridgeDB;
      qrItem.hidden = !show;
      removeItem.hidden = !show;
    });

    qrItem.addEventListener("click", () => {
      const bridgeLine = row.bridgeLine;
      if (!bridgeLine) {
        return;
      }
      showBridgeQr(bridgeLine);
    });
    row.menu
      .querySelector(".tor-bridges-options-copy-one-menu-item")
      .addEventListener("click", () => {
        const clipboard = Cc[
          "@mozilla.org/widget/clipboardhelper;1"
        ].getService(Ci.nsIClipboardHelper);
        clipboard.copyString(row.bridgeLine);
      });
    removeItem.addEventListener("click", () => {
      const bridgeLine = row.bridgeLine;
      const strings = TorSettings.bridges.bridge_strings;
      const index = strings.indexOf(bridgeLine);
      if (index === -1) {
        return;
      }
      strings.splice(index, 1);

      setTorSettings(() => {
        TorSettings.bridges.bridge_strings = strings;
      });
    });
  },

  /**
   * Force the row menu to close.
   */
  _forceCloseRowMenus() {
    for (const row of this._rows) {
      row.menu.hide(null, { force: true });
    }
  },

  /**
   * The known bridge source.
   *
   * Initially null to indicate that it is unset.
   *
   * @type {integer?}
   */
  _bridgeSource: null,
  /**
   * The bridge sources this is shown for.
   *
   * @type {string[]}
   */
  _supportedSources: [
    TorBridgeSource.BridgeDB,
    TorBridgeSource.UserProvided,
    TorBridgeSource.Lox,
  ],

  /**
   * Update the grid to show the latest bridge strings.
   *
   * @param {boolean} [initializing=false] - Whether this is being called as
   *   part of initialization.
   */
  _updateRows(initializing = false) {
    // Store whether we have focus within the grid, before removing or hiding
    // DOM elements.
    const focusWithin = this._focusWithin();

    let lostAllBridges = false;
    let newSource = false;
    const bridgeSource = TorSettings.bridges.source;
    if (bridgeSource !== this._bridgeSource) {
      newSource = true;

      this._bridgeSource = bridgeSource;

      if (this._supportedSources.includes(bridgeSource)) {
        this.activate();
      } else {
        if (this._active && bridgeSource === TorBridgeSource.Invalid) {
          lostAllBridges = true;
        }
        this.deactivate();
      }
    }

    const ordered = this._active
      ? TorSettings.bridges.bridge_strings.map(bridgeLine => {
          const row = this._rows.find(r => r.bridgeLine === bridgeLine);
          if (row) {
            return row;
          }
          return this._createRow(bridgeLine);
        })
      : [];

    // Whether we should reset the grid's focus.
    // We always reset when we have a new bridge source.
    // We reset the focus if no current Cell has focus. I.e. when adding a row
    // to an empty grid, we want the focus to move to the first item.
    // We also reset the focus if the current Cell is in a row that will be
    // removed (including if all rows are removed).
    // NOTE: In principle, if a row is removed, we could move the focus to the
    // next or previous row (in the same cell column). However, most likely if
    // the grid has the user focus, they are removing a single row using its
    // options button. In this case, returning the user to some other row's
    // options button might be more disorienting since it would not be simple
    // for them to know *which* bridge they have landed on.
    // NOTE: We do not reset the focus in other cases because we do not want the
    // user to loose their place in the grid unnecessarily.
    let resetFocus =
      newSource || !this._focusCell || !ordered.includes(this._focusCell.row);

    // Remove rows no longer needed from the DOM.
    let numRowsRemoved = 0;
    let rowAddedOrMoved = false;

    for (const row of this._rows) {
      if (!ordered.includes(row)) {
        numRowsRemoved++;
        // If the row menu was open, it will also be deleted.
        // NOTE: Since the row menu is part of the row, focusWithin will be true
        // if the menu had focus, so focus should be re-assigned.
        row.element.remove();
      }
    }

    // Go through all the rows to set their ".index" property and to ensure they
    // are in the correct position in the DOM.
    // NOTE: We could use replaceChildren to get the correct DOM structure, but
    // we want to avoid rebuilding the entire tree when a single row is added or
    // removed.
    for (const [index, row] of ordered.entries()) {
      row.index = index;
      const element = row.element;
      // Get the expected previous element, that should already be in the DOM
      // from the previous loop.
      const prevEl = index ? ordered[index - 1].element : null;

      if (
        element.parentElement === this._grid &&
        prevEl === element.previousElementSibling
      ) {
        // Already in the correct position in the DOM.
        continue;
      }

      rowAddedOrMoved = true;
      // NOTE: Any elements already in the DOM, but not in the correct position
      // will be removed and re-added by the below command.
      // NOTE: if the row has document focus, then it should remain there.
      if (prevEl) {
        prevEl.after(element);
      } else {
        this._grid.prepend(element);
      }
    }
    this._rows = ordered;

    // Restore any lost focus.
    if (resetFocus) {
      // If we are not active (and therefore hidden), we will not try and move
      // focus (activeElement), but may still change the *focusable* element for
      // when we are shown again.
      this._resetFocus(this._active && focusWithin);
    }
    if (!this._active && focusWithin) {
      // Move focus out of this element, which has been hidden.
      gBridgeSettings.takeFocus();
    }

    // Notify the user if there was some change to the DOM.
    // If we are initializing, we generate no notification since there has been
    // no change in the setting.
    if (!initializing) {
      let notificationType;
      if (lostAllBridges) {
        // Just lost all bridges, and became de-active.
        notificationType = "removed-all";
      } else if (this._rows.length) {
        // Otherwise, only generate a notification if we are still active, with
        // at least one bridge.
        // I.e. do not generate a message if the new source is "builtin".
        if (newSource) {
          // A change in source.
          notificationType = "changed";
        } else if (numRowsRemoved === 1 && !rowAddedOrMoved) {
          // Only one bridge was removed. This is most likely in response to them
          // manually removing a single bridge or using the bridge row's options
          // menu.
          notificationType = "removed-one";
        } else if (numRowsRemoved || rowAddedOrMoved) {
          // Some other change. This is most likely in response to a manual edit
          // of the existing bridges.
          notificationType = "changed";
        }
        // Else, there was no change.
      }

      if (notificationType) {
        gBridgesNotification.post(notificationType);
      }
    }
  },
};

/**
 * Controls the built-in bridges area.
 */
const gBuiltinBridgesArea = {
  /**
   * The display area.
   *
   * @type {Element?}
   */
  _area: null,
  /**
   * The type name element.
   *
   * @type {Element?}
   */
  _nameEl: null,
  /**
   * The bridge type description element.
   *
   * @type {Element?}
   */
  _descriptionEl: null,
  /**
   * The connection status.
   *
   * @type {Element?}
   */
  _connectionStatusEl: null,

  /**
   * Initialize the built-in bridges area.
   */
  init() {
    this._area = document.getElementById("tor-bridges-built-in-display");
    this._nameEl = document.getElementById("tor-bridges-built-in-type-name");
    this._descriptionEl = document.getElementById(
      "tor-bridges-built-in-description"
    );
    this._connectionStatusEl = document.getElementById(
      "tor-bridges-built-in-connected"
    );

    Services.obs.addObserver(this, TorSettingsTopics.SettingsChanged);

    // NOTE: Before initializedPromise completes, this area is hidden.
    TorSettings.initializedPromise.then(() => {
      this._updateBridgeType(true);
    });
  },

  /**
   * Uninitialize the built-in bridges area.
   */
  uninit() {
    Services.obs.removeObserver(this, TorSettingsTopics.SettingsChanged);
    this.deactivate();
  },

  /**
   * Whether the built-in area is visible and responsive.
   *
   * @type {boolean}
   */
  _active: false,

  /**
   * Activate and show the built-in bridge area.
   */
  activate() {
    if (this._active) {
      return;
    }
    this._active = true;

    Services.obs.addObserver(this, TorProviderTopics.BridgeChanged);

    this._area.classList.add("built-in-active");

    this._updateBridgeIds();
    this._updateConnectedBridge();
  },

  /**
   * Deactivate and hide built-in bridge area.
   */
  deactivate() {
    if (!this._active) {
      return;
    }
    this._active = false;

    this._area.classList.remove("built-in-active");

    Services.obs.removeObserver(this, TorProviderTopics.BridgeChanged);
  },

  observe(subject, topic) {
    switch (topic) {
      case TorSettingsTopics.SettingsChanged:
        const { changes } = subject.wrappedJSObject;
        if (
          changes.includes("bridges.source") ||
          changes.includes("bridges.builtin_type")
        ) {
          this._updateBridgeType();
        }
        if (changes.includes("bridges.bridge_strings")) {
          this._updateBridgeIds();
        }
        break;
      case TorProviderTopics.BridgeChanged:
        this._updateConnectedBridge();
        break;
    }
  },

  /**
   * Updates the shown connected state.
   */
  _updateConnectedState() {
    this._connectionStatusEl.classList.toggle(
      "bridge-status-connected",
      this._bridgeType &&
        this._connectedBridgeId &&
        this._bridgeIds.includes(this._connectedBridgeId)
    );
  },

  /**
   * The currently shown bridge type. Empty if deactivated, and null if
   * uninitialized.
   *
   * @type {string?}
   */
  _bridgeType: null,
  /**
   * The strings for each known bridge type.
   *
   * @type {Object<string,object>}
   */
  _bridgeTypeStrings: {
    obfs4: {
      name: "tor-bridges-built-in-obfs4-name",
      description: "tor-bridges-built-in-obfs4-description",
    },
    snowflake: {
      name: "tor-bridges-built-in-snowflake-name",
      description: "tor-bridges-built-in-snowflake-description",
    },
    "meek-azure": {
      name: "tor-bridges-built-in-meek-azure-name",
      description: "tor-bridges-built-in-meek-azure-description",
    },
  },

  /**
   * The known bridge source.
   *
   * Initially null to indicate that it is unset.
   *
   * @type {integer?}
   */
  _bridgeSource: null,

  /**
   * Update the shown bridge type.
   *
   * @param {boolean} [initializing=false] - Whether this is being called as
   *   part of initialization.
   */
  async _updateBridgeType(initializing = false) {
    let lostAllBridges = false;
    let newSource = false;
    const bridgeSource = TorSettings.bridges.source;
    if (bridgeSource !== this._bridgeSource) {
      newSource = true;

      this._bridgeSource = bridgeSource;

      if (bridgeSource === TorBridgeSource.BuiltIn) {
        this.activate();
      } else {
        if (this._active && bridgeSource === TorBridgeSource.Invalid) {
          lostAllBridges = true;
        }
        const hadFocus = this._area.contains(document.activeElement);
        this.deactivate();
        if (hadFocus) {
          gBridgeSettings.takeFocus();
        }
      }
    }

    const bridgeType = this._active ? TorSettings.bridges.builtin_type : "";

    let newType = false;
    if (bridgeType !== this._bridgeType) {
      newType = true;

      this._bridgeType = bridgeType;

      const bridgeStrings = this._bridgeTypeStrings[bridgeType];
      if (bridgeStrings) {
        document.l10n.setAttributes(this._nameEl, bridgeStrings.name);
        document.l10n.setAttributes(
          this._descriptionEl,
          bridgeStrings.description
        );
      } else {
        // Unknown type, or no type.
        this._nameEl.removeAttribute("data-l10n-id");
        this._nameEl.textContent = bridgeType;
        this._descriptionEl.removeAttribute("data-l10n-id");
        this._descriptionEl.textContent = "";
      }

      this._updateConnectedState();
    }

    // Notify the user if there was some change to the type.
    // If we are initializing, we generate no notification since there has been
    // no change in the setting.
    if (!initializing) {
      let notificationType;
      if (lostAllBridges) {
        // Just lost all bridges, and became de-active.
        notificationType = "removed-all";
      } else if (this._active && (newSource || newType)) {
        // Otherwise, only generate a notification if we are still active, with
        // a bridge type.
        // I.e. do not generate a message if the new source is not "builtin".
        notificationType = "changed";
      }

      if (notificationType) {
        gBridgesNotification.post(notificationType);
      }
    }
  },

  /**
   * The bridge IDs/fingerprints for the built-in bridges.
   *
   * @type {Array<string>}
   */
  _bridgeIds: [],
  /**
   * Update _bridgeIds
   */
  _updateBridgeIds() {
    this._bridgeIds = [];
    for (const bridgeLine of TorSettings.bridges.bridge_strings) {
      try {
        this._bridgeIds.push(TorParsers.parseBridgeLine(bridgeLine).id);
      } catch (e) {
        console.error(`Detected invalid bridge line: ${bridgeLine}`, e);
      }
    }

    this._updateConnectedState();
  },

  /**
   * The bridge ID/fingerprint of the most recently used bridge (appearing in
   * the latest Tor circuit). Roughly corresponds to the bridge we are currently
   * connected to.
   *
   * @type {string?}
   */
  _connectedBridgeId: null,
  /**
   * Update _connectedBridgeId.
   */
  async _updateConnectedBridge() {
    this._connectedBridgeId = await getConnectedBridgeId();
    this._updateConnectedState();
  },
};

/**
 * Controls the bridge pass area.
 */
const gLoxStatus = {
  /**
   * The status area.
   *
   * @type {Element?}
   */
  _area: null,
  /**
   * The area for showing the next unlock and invites.
   *
   * @type {Element?}
   */
  _detailsArea: null,
  /**
   * The day counter for the next unlock.
   *
   * @type {Element?}
   */
  _nextUnlockCounterEl: null,
  /**
   * Shows the number of remaining invites.
   *
   * @type {Element?}
   */
  _remainingInvitesEl: null,
  /**
   * The button to show the invites.
   *
   * @type {Element?}
   */
  _invitesButton: null,
  /**
   * The alert for new unlocks.
   *
   * @type {Element?}
   */
  _unlockAlert: null,
  /**
   * The alert title.
   *
   * @type {Element?}
   */
  _unlockAlertTitle: null,
  /**
   * The alert invites item.
   *
   * @type {Element?}
   */
  _unlockAlertInvitesItem: null,
  /**
   * Button for the user to dismiss the alert.
   *
   * @type {Element?}
   */
  _unlockAlertButton: null,

  /**
   * Initialize the bridge pass area.
   */
  init() {
    if (!Lox.enabled) {
      // Area should remain inactive and hidden.
      return;
    }

    this._area = document.getElementById("tor-bridges-lox-status");
    this._detailsArea = document.getElementById("tor-bridges-lox-details");
    this._nextUnlockCounterEl = document.getElementById(
      "tor-bridges-lox-next-unlock-counter"
    );
    this._remainingInvitesEl = document.getElementById(
      "tor-bridges-lox-remaining-invites"
    );
    this._invitesButton = document.getElementById(
      "tor-bridges-lox-show-invites-button"
    );
    this._unlockAlert = document.getElementById("tor-bridges-lox-unlock-alert");
    this._unlockAlertTitle = document.getElementById(
      "tor-bridge-unlock-alert-title"
    );
    this._unlockAlertInviteItem = document.getElementById(
      "tor-bridges-lox-unlock-alert-invites"
    );
    this._unlockAlertButton = document.getElementById(
      "tor-bridges-lox-unlock-alert-button"
    );

    this._invitesButton.addEventListener("click", () => {
      gSubDialog.open(
        "chrome://browser/content/torpreferences/loxInviteDialog.xhtml",
        { features: "resizable=yes" }
      );
    });
    this._unlockAlertButton.addEventListener("click", () => {
      Lox.clearEventData(this._loxId);
    });

    Services.obs.addObserver(this, TorSettingsTopics.SettingsChanged);
    Services.obs.addObserver(this, LoxTopics.UpdateActiveLoxId);
    Services.obs.addObserver(this, LoxTopics.UpdateEvents);
    Services.obs.addObserver(this, LoxTopics.UpdateNextUnlock);
    Services.obs.addObserver(this, LoxTopics.UpdateRemainingInvites);
    Services.obs.addObserver(this, LoxTopics.NewInvite);

    // NOTE: Before initializedPromise completes, this area is hidden.
    TorSettings.initializedPromise.then(() => {
      this._updateLoxId();
    });
  },

  /**
   * Uninitialize the built-in bridges area.
   */
  uninit() {
    if (!Lox.enabled) {
      return;
    }

    Services.obs.removeObserver(this, TorSettingsTopics.SettingsChanged);
    Services.obs.removeObserver(this, LoxTopics.UpdateActiveLoxId);
    Services.obs.removeObserver(this, LoxTopics.UpdateEvents);
    Services.obs.removeObserver(this, LoxTopics.UpdateNextUnlock);
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
        // NOTE: We do not call _updateLoxId when "bridges.lox_id" is in the
        // changes. Instead we wait until LoxTopics.UpdateActiveLoxId to ensure
        // that the Lox module has responded to the change in ID strictly
        // *before* we do. In particular, we want to make sure the invites and
        // event data has been cleared.
        break;
      case LoxTopics.UpdateActiveLoxId:
        this._updateLoxId();
        break;
      case LoxTopics.UpdateNextUnlock:
        this._updateNextUnlock();
        break;
      case LoxTopics.UpdateEvents:
        this._updatePendingEvents();
        break;
      case LoxTopics.UpdateRemainingInvites:
        this._updateRemainingInvites();
        break;
      case LoxTopics.NewInvite:
        this._updateHaveExistingInvites();
        break;
    }
  },

  /**
   * The Lox id currently shown. Empty if deactivated, and null if
   * uninitialized.
   *
   * @type {string?}
   */
  _loxId: null,

  /**
   * Update the shown bridge pass.
   */
  async _updateLoxId() {
    let loxId =
      TorSettings.bridges.source === TorBridgeSource.Lox ? Lox.activeLoxId : "";
    if (loxId === this._loxId) {
      return;
    }
    this._loxId = loxId;
    // We unset _nextUnlock to ensure the areas no longer use the old value for
    // the new loxId.
    this._updateNextUnlock(true);
    this._updateRemainingInvites();
    this._updateHaveExistingInvites();
    this._updatePendingEvents();
  },

  /**
   * The remaining invites shown, or null if uninitialized or no loxId.
   *
   * @type {integer?}
   */
  _remainingInvites: null,
  /**
   * Update the shown value.
   */
  _updateRemainingInvites() {
    const numInvites = this._loxId
      ? Lox.getRemainingInviteCount(this._loxId)
      : null;
    if (numInvites === this._remainingInvites) {
      return;
    }
    this._remainingInvites = numInvites;
    this._updateUnlockArea();
    this._updateInvitesArea();
  },
  /**
   * Whether we have existing invites, or null if uninitialized or no loxId.
   *
   * @type {boolean?}
   */
  _haveExistingInvites: null,
  /**
   * Update the shown value.
   */
  _updateHaveExistingInvites() {
    const haveInvites = this._loxId ? !!Lox.getInvites().length : null;
    if (haveInvites === this._haveExistingInvites) {
      return;
    }
    this._haveExistingInvites = haveInvites;
    this._updateInvitesArea();
  },
  /**
   * Details about the next unlock, or null if uninitialized or no loxId.
   *
   * @type {UnlockData?}
   */
  _nextUnlock: null,
  /**
   * Tracker id to ensure that the results from later calls to _updateNextUnlock
   * take priority over earlier calls.
   *
   * @type {integer}
   */
  _nextUnlockCallId: 0,
  /**
   * Update the shown value asynchronously.
   *
   * @param {boolean} [unset=false] - Whether to set the _nextUnlock value to
   *   null before waiting for the new value. I.e. ensure that the current value
   *   will not be used.
   */
  async _updateNextUnlock(unset = false) {
    // NOTE: We do not expect the integer to exceed the maximum integer.
    this._nextUnlockCallId++;
    const callId = this._nextUnlockCallId;
    if (unset) {
      this._nextUnlock = null;
    }
    const nextUnlock = this._loxId
      ? await Lox.getNextUnlock(this._loxId)
      : null;
    if (callId !== this._nextUnlockCallId) {
      // Replaced by another update.
      // E.g. if the _loxId changed. Or if getNextUnlock triggered
      // LoxTopics.UpdateNextUnlock.
      return;
    }
    // Should be safe to trigger the update, even when the value hasn't changed.
    this._nextUnlock = nextUnlock;
    this._updateUnlockArea();
  },
  /**
   * The list of events the user has not yet cleared, or null if uninitialized
   * or no loxId.
   *
   * @type {EventData[]?}
   */
  _pendingEvents: null,
  /**
   * Update the shown value.
   */
  _updatePendingEvents() {
    // Should be safe to trigger the update, even when the value hasn't changed.
    this._pendingEvents = this._loxId ? Lox.getEventData(this._loxId) : null;
    this._updateUnlockArea();
  },

  /**
   * Update the display of the current or next unlock.
   */
  _updateUnlockArea() {
    if (
      !this._loxId ||
      this._pendingEvents === null ||
      this._remainingInvites === null ||
      this._nextUnlock === null
    ) {
      // Uninitialized or no Lox source.
      // NOTE: This area may already be hidden by the change in Lox source,
      // but we clean up for the next non-empty id.
      this._area.classList.remove("show-unlock-alert");
      this._area.classList.remove("show-next-unlock");
      return;
    }

    // Grab focus state before changing visibility.
    const alertHadFocus = this._unlockAlert.contains(document.activeElement);
    const detailsHadFocus = this._detailsArea.contains(document.activeElement);

    const pendingEvents = this._pendingEvents;
    const showAlert = !!pendingEvents.length;
    this._area.classList.toggle("show-unlock-alert", showAlert);
    this._area.classList.toggle("show-next-unlock", !showAlert);

    if (showAlert) {
      // At level 0 and level 1, we do not have any invites.
      // If the user starts and ends on level 0 or 1, then overall they would
      // have had no change in their invites. So we do not want to show their
      // latest updates.
      // NOTE: If the user starts at level > 1 and ends with level 1 (levelling
      // down to level 0 should not be possible), then we *do* want to show the
      // user that they now have "0" invites.
      // NOTE: pendingEvents are time-ordered, with the most recent event
      // *last*.
      const firstEvent = pendingEvents[0];
      // NOTE: We cannot get a blockage event when the user starts at level 1 or
      // 0.
      const startingAtLowLevel =
        firstEvent.type === "levelup" && firstEvent.newLevel <= 2;
      const lastEvent = pendingEvents[pendingEvents.length - 1];
      const endingAtLowLevel = lastEvent.newLevel <= 1;

      const showInvites = !(startingAtLowLevel && endingAtLowLevel);

      let blockage = false;
      let levelUp = false;
      let bridgeGain = false;
      // Go through events, in the order that they occurred.
      for (const loxEvent of pendingEvents) {
        if (loxEvent.type === "levelup") {
          levelUp = true;
          if (loxEvent.newLevel === 1) {
            // Gain 2 bridges from level 0 to 1.
            bridgeGain = true;
          }
        } else {
          blockage = true;
        }
      }
      let alertTitleId;
      if (levelUp && !blockage) {
        alertTitleId = "tor-bridges-lox-upgrade";
      } else {
        // Show as blocked bridges replaced.
        // Even if we have a mixture of level ups as well.
        alertTitleId = "tor-bridges-lox-blocked";
      }
      document.l10n.setAttributes(this._unlockAlertTitle, alertTitleId);
      document.l10n.setAttributes(
        this._unlockAlertInviteItem,
        "tor-bridges-lox-new-invites",
        { numInvites: this._remainingInvites }
      );
      this._unlockAlert.classList.toggle(
        "lox-unlock-upgrade",
        levelUp && !blockage
      );
      this._unlockAlert.classList.toggle("lox-unlock-new-bridges", blockage);
      this._unlockAlert.classList.toggle("lox-unlock-gain-bridges", bridgeGain);
      this._unlockAlert.classList.toggle("lox-unlock-invites", showInvites);
    } else {
      // Show next unlock.
      // Number of days until the next unlock, rounded up.
      const numDays = Math.max(
        1,
        Math.ceil(
          (new Date(this._nextUnlock.date).getTime() - Date.now()) /
            (24 * 60 * 60 * 1000)
        )
      );
      document.l10n.setAttributes(
        this._nextUnlockCounterEl,
        "tor-bridges-lox-days-until-unlock",
        { numDays }
      );

      // Gain 2 bridges from level 0 to 1. After that gain invites.
      const bridgeGain = this._nextUnlock.nextLevel === 1;
      const firstInvites = this._nextUnlock.nextLevel === 2;
      const moreInvites = this._nextUnlock.nextLevel > 2;

      this._detailsArea.classList.toggle("lox-next-gain-bridges", bridgeGain);
      this._detailsArea.classList.toggle(
        "lox-next-first-invites",
        firstInvites
      );
      this._detailsArea.classList.toggle("lox-next-more-invites", moreInvites);
    }

    if (alertHadFocus && !showAlert) {
      // Alert has become hidden, move focus back up to the now revealed details
      // area.
      this._nextUnlockCounterEl.focus();
    } else if (detailsHadFocus && showAlert) {
      this._unlockAlertButton.focus();
    }
  },

  /**
   * Update the invites area.
   */
  _updateInvitesArea() {
    let hasInvites;
    if (
      !this._loxId ||
      this._remainingInvites === null ||
      this._haveExistingInvites === null
    ) {
      // Not initialized yet.
      hasInvites = false;
    } else {
      hasInvites = this._haveExistingInvites || !!this._remainingInvites;
    }

    if (!hasInvites) {
      if (
        this._remainingInvitesEl.contains(document.activeElement) ||
        this._invitesButton.contains(document.activeElement)
      ) {
        // About to loose focus.
        // Unexpected for the lox level to loose all invites.
        // Move to the top of the details area, which should be visible if we
        // just had focus.
        this._nextUnlockCounterEl.focus();
      }
    }
    // Hide the invite elements if we have no historic invites or a way of
    // creating new ones.
    this._detailsArea.classList.toggle("lox-has-invites", hasInvites);

    if (hasInvites) {
      document.l10n.setAttributes(
        this._remainingInvitesEl,
        "tor-bridges-lox-remaining-invites",
        { numInvites: this._remainingInvites }
      );
    }
  },
};

/**
 * Controls the bridge settings.
 */
const gBridgeSettings = {
  /**
   * The preferences <groupbox> for bridges
   *
   * @type {Element?}
   */
  _groupEl: null,
  /**
   * The button for controlling whether bridges are enabled.
   *
   * @type {Element?}
   */
  _toggleButton: null,
  /**
   * The area for showing current bridges.
   *
   * @type {Element?}
   */
  _bridgesEl: null,
  /**
   * The heading for the bridge settings.
   *
   * @type {Element?}
   */
  _bridgesSettingsHeading: null,
  /**
   * The current bridges heading, at the start of the area.
   *
   * @type {Element?}
   */
  _currentBridgesHeading: null,
  /**
   * The area for showing no bridges.
   *
   * @type {Element?}
   */
  _noBridgesEl: null,
  /**
   * The heading element for changing bridges.
   *
   * @type {Element?}
   */
  _changeHeadingEl: null,
  /**
   * The button for user to provide a bridge address or share code.
   *
   * @type {Element?}
   */
  _userProvideButton: null,

  /**
   * Initialize the bridge settings.
   */
  init() {
    gBridgesNotification.init();

    this._bridgesSettingsHeading = document.getElementById(
      "torPreferences-bridges-header"
    );
    this._currentBridgesHeading = document.getElementById(
      "tor-bridges-current-heading"
    );
    this._bridgesEl = document.getElementById("tor-bridges-current");
    this._noBridgesEl = document.getElementById("tor-bridges-none");
    this._groupEl = document.getElementById("torPreferences-bridges-group");
    this._toggleButton = document.getElementById("tor-bridges-enabled-toggle");
    // Initially disabled whilst TorSettings may not be initialized.
    this._toggleButton.disabled = true;

    this._toggleButton.addEventListener("toggle", () => {
      if (!this._haveBridges) {
        return;
      }
      setTorSettings(() => {
        TorSettings.bridges.enabled = this._toggleButton.pressed;
      });
    });

    this._changeHeadingEl = document.getElementById(
      "tor-bridges-change-heading"
    );
    this._userProvideButton = document.getElementById(
      "tor-bridges-open-user-provide-dialog-button"
    );

    document.l10n.setAttributes(
      document.getElementById("tor-bridges-user-provide-description"),
      // TODO: Set a different string if we have Lox enabled.
      "tor-bridges-add-addresses-description"
    );

    // TODO: Change to GetLoxBridges if Lox enabled, and the account is set up.
    const telegramUserName = "GetBridgesBot";
    const telegramInstruction = document.getElementById(
      "tor-bridges-provider-instruction-telegram"
    );
    telegramInstruction.querySelector(
      "a"
    ).href = `https://t.me/${telegramUserName}`;
    document.l10n.setAttributes(
      telegramInstruction,
      "tor-bridges-provider-telegram-instruction",
      { telegramUserName }
    );

    document
      .getElementById("tor-bridges-open-built-in-dialog-button")
      .addEventListener("click", () => {
        this._openBuiltinDialog();
      });
    this._userProvideButton.addEventListener("click", () => {
      this._openUserProvideDialog(this._haveBridges ? "replace" : "add");
    });
    document
      .getElementById("tor-bridges-open-request-dialog-button")
      .addEventListener("click", () => {
        this._openRequestDialog();
      });

    Services.obs.addObserver(this, TorSettingsTopics.SettingsChanged);

    gBridgeGrid.init();
    gBuiltinBridgesArea.init();
    gLoxStatus.init();

    this._initBridgesMenu();
    this._initShareArea();

    // NOTE: Before initializedPromise completes, the current bridges sections
    // should be hidden.
    // And gBridgeGrid and gBuiltinBridgesArea are not active.
    TorSettings.initializedPromise.then(() => {
      this._updateEnabled();
      this._updateBridgeStrings();
      this._updateSource();
    });
  },

  /**
   * Un-initialize the bridge settings.
   */
  uninit() {
    gBridgeGrid.uninit();
    gBuiltinBridgesArea.uninit();
    gLoxStatus.uninit();

    Services.obs.removeObserver(this, TorSettingsTopics.SettingsChanged);
  },

  observe(subject, topic) {
    switch (topic) {
      case TorSettingsTopics.SettingsChanged:
        const { changes } = subject.wrappedJSObject;
        if (changes.includes("bridges.enabled")) {
          this._updateEnabled();
        }
        if (changes.includes("bridges.source")) {
          this._updateSource();
        }
        if (changes.includes("bridges.bridge_strings")) {
          this._updateBridgeStrings();
        }
        break;
    }
  },

  /**
   * Update whether the bridges should be shown as enabled.
   */
  _updateEnabled() {
    // Changing the pressed property on moz-toggle should not trigger its
    // "toggle" event.
    this._toggleButton.pressed = TorSettings.bridges.enabled;
  },

  /**
   * The shown bridge source.
   *
   * Initially null to indicate that it is unset for the first call to
   * _updateSource.
   *
   * @type {integer?}
   */
  _bridgeSource: null,

  /**
   * Update _bridgeSource.
   */
  _updateSource() {
    // NOTE: This should only ever be called after TorSettings is already
    // initialized.
    const bridgeSource = TorSettings.bridges.source;
    if (bridgeSource === this._bridgeSource) {
      // Avoid re-activating an area if the source has not changed.
      return;
    }

    this._bridgeSource = bridgeSource;

    // Before hiding elements, we determine whether our region contained the
    // user focus.
    const hadFocus =
      this._bridgesEl.contains(document.activeElement) ||
      this._noBridgesEl.contains(document.activeElement);

    this._bridgesEl.classList.toggle(
      "source-built-in",
      bridgeSource === TorBridgeSource.BuiltIn
    );
    this._bridgesEl.classList.toggle(
      "source-user",
      bridgeSource === TorBridgeSource.UserProvided
    );
    this._bridgesEl.classList.toggle(
      "source-requested",
      bridgeSource === TorBridgeSource.BridgeDB
    );
    this._bridgesEl.classList.toggle(
      "source-lox",
      bridgeSource === TorBridgeSource.Lox
    );

    // Force the menu to close whenever the source changes.
    // NOTE: If the menu had focus then hadFocus will be true, and focus will be
    // re-assigned.
    this._forceCloseBridgesMenu();

    // Update whether we have bridges.
    this._updateHaveBridges();

    if (hadFocus) {
      // Always reset the focus to the start of the area whenever the source
      // changes.
      // NOTE: gBuiltinBridges._updateBridgeType and gBridgeGrid._updateRows
      // may have already called takeFocus in response to them being
      // de-activated. The re-call should be safe.
      this.takeFocus();
    }
  },

  /**
   * Whether we have bridges or not, or null if it is unknown.
   *
   * @type {boolean?}
   */
  _haveBridges: null,

  /**
   * Update the _haveBridges value.
   */
  _updateHaveBridges() {
    // NOTE: We use the TorSettings.bridges.source value, rather than
    // this._bridgeSource because _updateHaveBridges can be called just before
    // _updateSource (via takeFocus).
    const haveBridges = TorSettings.bridges.source !== TorBridgeSource.Invalid;

    if (haveBridges === this._haveBridges) {
      return;
    }

    this._haveBridges = haveBridges;

    this._toggleButton.disabled = !haveBridges;
    // Add classes to show or hide the "no bridges" and "Your bridges" sections.
    // NOTE: Before haveBridges is set, neither class is added, so both sections
    // and hidden.
    this._groupEl.classList.toggle("no-bridges", !haveBridges);
    this._groupEl.classList.toggle("have-bridges", haveBridges);

    document.l10n.setAttributes(
      this._changeHeadingEl,
      haveBridges
        ? "tor-bridges-replace-bridges-heading"
        : "tor-bridges-add-bridges-heading"
    );
    document.l10n.setAttributes(
      this._userProvideButton,
      haveBridges ? "tor-bridges-replace-button" : "tor-bridges-add-new-button"
    );
  },

  /**
   * Force the focus to move to the bridge area.
   */
  takeFocus() {
    if (this._haveBridges === null) {
      // The bridges area has not been initialized yet, which means that
      // TorSettings may not be initialized.
      // Unexpected to receive a call before then, so just return early.
      return;
    }

    // Make sure we have the latest value for _haveBridges.
    // We also ensure that the _currentBridgesHeading element is visible before
    // we focus it.
    this._updateHaveBridges();
    if (this._haveBridges) {
      // Move focus to the start of the area, which is the heading.
      // It has tabindex="-1" so should be focusable, even though it is not part
      // of the usual tab navigation.
      this._currentBridgesHeading.focus();
    } else {
      // Move focus to the top of the bridge settings.
      this._bridgesSettingsHeading.focus();
    }
  },

  /**
   * The bridge strings in a copy-able form.
   *
   * @type {string}
   */
  _bridgeStrings: "",
  /**
   * Whether the bridge strings should be shown as a QR code.
   *
   * @type {boolean}
   */
  _canQRBridges: false,

  /**
   * Update the stored bridge strings.
   */
  _updateBridgeStrings() {
    const bridges = TorSettings.bridges.bridge_strings;

    this._bridgeStrings = bridges.join("\n");
    // TODO: Determine what logic we want.
    this._canQRBridges = bridges.length <= 3;

    this._qrButton.disabled = !this._canQRBridges;
  },

  /**
   * Copy all the bridge addresses to the clipboard.
   */
  _copyBridges() {
    const clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(
      Ci.nsIClipboardHelper
    );
    clipboard.copyString(this._bridgeStrings);
  },

  /**
   * Open the QR code dialog encoding all the bridge addresses.
   */
  _openQR() {
    if (!this._canQRBridges) {
      return;
    }
    showBridgeQr(this._bridgeStrings);
  },

  /**
   * The QR button for copying all QR codes.
   *
   * @type {Element?}
   */
  _qrButton: null,

  _initShareArea() {
    document
      .getElementById("tor-bridges-copy-addresses-button")
      .addEventListener("click", () => {
        this._copyBridges();
      });

    this._qrButton = document.getElementById("tor-bridges-qr-addresses-button");
    this._qrButton.addEventListener("click", () => {
      this._openQR();
    });
  },

  /**
   * The menu for all bridges.
   *
   * @type {Element?}
   */
  _bridgesMenu: null,

  /**
   * Initialize the menu for all bridges.
   */
  _initBridgesMenu() {
    this._bridgesMenu = document.getElementById("tor-bridges-all-options-menu");

    // NOTE: We generally assume that once the bridge menu is opened the
    // this._bridgeStrings value will not change.
    const qrItem = document.getElementById(
      "tor-bridges-options-qr-all-menu-item"
    );
    qrItem.addEventListener("click", () => {
      this._openQR();
    });

    const copyItem = document.getElementById(
      "tor-bridges-options-copy-all-menu-item"
    );
    copyItem.addEventListener("click", () => {
      this._copyBridges();
    });

    const editItem = document.getElementById(
      "tor-bridges-options-edit-all-menu-item"
    );
    editItem.addEventListener("click", () => {
      this._openUserProvideDialog("edit");
    });

    // TODO: Do we want a different item for built-in bridges, rather than
    // "Remove all bridges"?
    document
      .getElementById("tor-bridges-options-remove-all-menu-item")
      .addEventListener("click", async () => {
        // TODO: Should we only have a warning when not built-in?
        const parentWindow =
          Services.wm.getMostRecentWindow("navigator:browser");
        const flags =
          Services.prompt.BUTTON_POS_0 *
            Services.prompt.BUTTON_TITLE_IS_STRING +
          Services.prompt.BUTTON_POS_0_DEFAULT +
          Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_CANCEL;

        const [titleString, bodyString, removeString] =
          await document.l10n.formatValues([
            { id: "remove-all-bridges-warning-title" },
            { id: "remove-all-bridges-warning-description" },
            { id: "remove-all-bridges-warning-remove-button" },
          ]);

        // TODO: Update the text, and remove old strings.
        const buttonIndex = Services.prompt.confirmEx(
          parentWindow,
          titleString,
          bodyString,
          flags,
          removeString,
          null,
          null,
          null,
          {}
        );

        if (buttonIndex !== 0) {
          return;
        }

        setTorSettings(() => {
          // This should always have the side effect of disabling bridges as
          // well.
          TorSettings.bridges.source = TorBridgeSource.Invalid;
        });
      });

    this._bridgesMenu.addEventListener("showing", () => {
      const canShare =
        this._bridgeSource === TorBridgeSource.UserProvided ||
        this._bridgeSource === TorBridgeSource.BridgeDB;
      qrItem.hidden = !canShare || !this._canQRBridges;
      editItem.hidden = this._bridgeSource !== TorBridgeSource.UserProvided;
    });

    const bridgesMenuButton = document.getElementById(
      "tor-bridges-all-options-button"
    );
    bridgesMenuButton.addEventListener("click", event => {
      this._bridgesMenu.toggle(event, bridgesMenuButton);
    });

    this._bridgesMenu.addEventListener("hidden", () => {
      // Make sure the button receives focus again when the menu is hidden.
      // Currently, panel-list.js only does this when the menu is opened with a
      // keyboard, but this causes focus to be lost from the page if the user
      // uses a mixture of keyboard and mouse.
      bridgesMenuButton.focus();
    });
  },

  /**
   * Force the bridges menu to close.
   */
  _forceCloseBridgesMenu() {
    this._bridgesMenu.hide(null, { force: true });
  },

  /**
   * Open a bridge dialog that will change the users bridges.
   *
   * @param {string} url - The url of the dialog to open.
   * @param {object?} inputData - The input data to send to the dialog window.
   * @param {Function} onAccept - The method to call if the bridge dialog was
   *   accepted by the user. This will be passed a "result" object containing
   *   data set by the dialog. This should return a promise that resolves once
   *   the bridge settings have been set, or null if the settings have not
   *   been applied.
   */
  _openDialog(url, inputData, onAccept) {
    const result = { accepted: false, connect: false };
    let savedSettings = null;
    gSubDialog.open(
      url,
      {
        features: "resizable=yes",
        closingCallback: () => {
          if (!result.accepted) {
            return;
          }
          savedSettings = onAccept(result);
          if (!savedSettings) {
            // No change in settings.
            return;
          }
          if (!result.connect) {
            // Do not open about:torconnect.
            return;
          }

          // Wait until the settings are applied before bootstrapping.
          savedSettings.then(() => {
            // The bridge dialog button is "connect" when Tor is not
            // bootstrapped, so do the connect.

            // Start Bootstrapping, which should use the configured bridges.
            // NOTE: We do this regardless of any previous TorConnect Error.
            if (TorConnect.canBeginBootstrap) {
              TorConnect.beginBootstrap();
            }
            // Open "about:torconnect".
            // FIXME: If there has been a previous bootstrapping error then
            // "about:torconnect" will be trying to get the user to use
            // AutoBootstrapping. It is not set up to handle a forced direct
            // entry to plain Bootstrapping from this dialog so the UI will
            // not be aligned. In particular the
            // AboutTorConnect.uiState.bootstrapCause will be aligned to
            // whatever was shown previously in "about:torconnect" instead.
            TorConnect.openTorConnect();
          });
        },
        // closedCallback should be called after gSubDialog has already
        // re-assigned focus back to the document.
        closedCallback: () => {
          if (!savedSettings) {
            return;
          }
          // Wait until the settings have changed, so that the UI could
          // respond, then move focus.
          savedSettings.then(() => gBridgeSettings.takeFocus());
        },
      },
      result,
      inputData
    );
  },

  /**
   * Open the built-in bridge dialog.
   */
  _openBuiltinDialog() {
    this._openDialog(
      "chrome://browser/content/torpreferences/builtinBridgeDialog.xhtml",
      null,
      result => {
        if (!result.type) {
          return null;
        }
        return setTorSettings(() => {
          TorSettings.bridges.enabled = true;
          TorSettings.bridges.source = TorBridgeSource.BuiltIn;
          TorSettings.bridges.builtin_type = result.type;
        });
      }
    );
  },

  /*
   * Open the request bridge dialog.
   */
  _openRequestDialog() {
    this._openDialog(
      "chrome://browser/content/torpreferences/requestBridgeDialog.xhtml",
      null,
      result => {
        if (!result.bridges?.length) {
          return null;
        }
        return setTorSettings(() => {
          TorSettings.bridges.enabled = true;
          TorSettings.bridges.source = TorBridgeSource.BridgeDB;
          TorSettings.bridges.bridge_strings = result.bridges.join("\n");
        });
      }
    );
  },

  /**
   * Open the user provide dialog.
   *
   * @param {string} mode - The mode to open the dialog in: "add", "replace" or
   *   "edit".
   */
  _openUserProvideDialog(mode) {
    this._openDialog(
      "chrome://browser/content/torpreferences/provideBridgeDialog.xhtml",
      { mode },
      result => {
        const loxId = result.loxId;
        if (!loxId && !result.addresses?.length) {
          return null;
        }
        return setTorSettings(() => {
          TorSettings.bridges.enabled = true;
          if (loxId) {
            TorSettings.bridges.source = TorBridgeSource.Lox;
            TorSettings.bridges.lox_id = loxId;
          } else {
            TorSettings.bridges.source = TorBridgeSource.UserProvided;
            TorSettings.bridges.bridge_strings = result.addresses;
          }
        });
      }
    );
  },
};

/**
 * Area to show the internet and tor network connection status.
 */
const gNetworkStatus = {
  /**
   * Initialize the area.
   */
  init() {
    this._internetAreaEl = document.getElementById(
      "network-status-internet-area"
    );
    this._internetResultEl = this._internetAreaEl.querySelector(
      ".network-status-result"
    );
    this._internetTestButton = document.getElementById(
      "network-status-internet-test-button"
    );
    this._internetTestButton.addEventListener("click", () => {
      this._startInternetTest();
    });

    this._torAreaEl = document.getElementById("network-status-tor-area");
    this._torResultEl = this._torAreaEl.querySelector(".network-status-result");
    this._torConnectButton = document.getElementById(
      "network-status-tor-connect-button"
    );
    this._torConnectButton.addEventListener("click", () => {
      TorConnect.openTorConnect({ beginBootstrap: true });
    });

    this._updateInternetStatus("unknown");
    this._updateTorConnectionStatus();

    Services.obs.addObserver(this, TorConnectTopics.StateChange);
  },

  /**
   * Un-initialize the area.
   */
  uninit() {
    Services.obs.removeObserver(this, TorConnectTopics.StateChange);
  },

  observe(subject, topic) {
    switch (topic) {
      // triggered when tor connect state changes and we may
      // need to update the messagebox
      case TorConnectTopics.StateChange: {
        this._updateTorConnectionStatus();
        break;
      }
    }
  },

  /**
   * Whether the test should be disabled.
   *
   * @type {boolean}
   */
  _internetTestDisabled: false,
  /**
   * Start the internet test.
   */
  async _startInternetTest() {
    if (this._internetTestDisabled) {
      return;
    }
    this._internetTestDisabled = true;
    // We use "aria-disabled" rather than the "disabled" attribute so that the
    // button can remain focusable during the test.
    this._internetTestButton.setAttribute("aria-disabled", "true");
    this._internetTestButton.classList.add("spoof-button-disabled");
    try {
      this._updateInternetStatus("testing");
      const mrpc = new MoatRPC();
      let status = null;
      try {
        await mrpc.init();
        status = await mrpc.testInternetConnection();
      } catch (err) {
        log.error("Error while checking the Internet connection", err);
      } finally {
        mrpc.uninit();
      }
      if (status) {
        this._updateInternetStatus(status.successful ? "online" : "offline");
      } else {
        this._updateInternetStatus("unknown");
      }
    } finally {
      this._internetTestButton.removeAttribute("aria-disabled");
      this._internetTestButton.classList.remove("spoof-button-disabled");
      this._internetTestDisabled = false;
    }
  },

  /**
   * Update the shown internet status.
   *
   * @param {string} stateName - The name of the state to show.
   */
  _updateInternetStatus(stateName) {
    let l10nId;
    switch (stateName) {
      case "testing":
        l10nId = "tor-connection-internet-status-testing";
        break;
      case "offline":
        l10nId = "tor-connection-internet-status-offline";
        break;
      case "online":
        l10nId = "tor-connection-internet-status-online";
        break;
    }
    if (l10nId) {
      this._internetResultEl.setAttribute("data-l10n-id", l10nId);
    } else {
      this._internetResultEl.removeAttribute("data-l10n-id");
      this._internetResultEl.textContent = "";
    }

    this._internetAreaEl.classList.toggle(
      "status-loading",
      stateName === "testing"
    );
    this._internetAreaEl.classList.toggle(
      "status-offline",
      stateName === "offline"
    );
  },

  /**
   * Update the shown Tor connection status.
   */
  _updateTorConnectionStatus() {
    const buttonHadFocus = this._torConnectButton.contains(
      document.activeElement
    );
    const isBootstrapped = TorConnect.state === TorConnectState.Bootstrapped;
    const isBlocked = !isBootstrapped && TorConnect.potentiallyBlocked;
    let l10nId;
    if (isBootstrapped) {
      l10nId = "tor-connection-network-status-connected";
    } else if (isBlocked) {
      l10nId = "tor-connection-network-status-blocked";
    } else {
      l10nId = "tor-connection-network-status-not-connected";
    }

    document.l10n.setAttributes(this._torResultEl, l10nId);
    this._torAreaEl.classList.toggle("status-connected", isBootstrapped);
    this._torAreaEl.classList.toggle("status-blocked", isBlocked);
    if (isBootstrapped && buttonHadFocus) {
      // Button has become hidden and will loose focus. Most likely this has
      // happened because the user clicked the button to open about:torconnect.
      // Since this is near the top of the page, we move focus to the search
      // input (for when the user returns).
      gSearchResultsPane.searchInput.focus();
    }
  },
};

/*
  Connection Pane

  Code for populating the XUL in about:preferences#connection, handling input events, interfacing with tor-launcher
*/
const gConnectionPane = (function () {
  /* CSS selectors for all of the Tor Network DOM elements we need to access */
  const selectors = {
    bridges: {
      locationGroup: "#torPreferences-bridges-locationGroup",
      locationLabel: "#torPreferences-bridges-locationLabel",
      location: "#torPreferences-bridges-location",
      locationEntries: "#torPreferences-bridges-locationEntries",
      chooseForMe: "#torPreferences-bridges-buttonChooseBridgeForMe",
    },
  }; /* selectors */

  const retval = {
    // cached frequently accessed DOM elements
    _enableQuickstartCheckbox: null,

    // populate xul with strings and cache the relevant elements
    _populateXUL() {
      // saves tor settings to disk when navigate away from about:preferences
      window.addEventListener("blur", async () => {
        try {
          // Build a new provider each time because this might be called also
          // when closing the browser (if about:preferences was open), maybe
          // when the provider was already uninitialized.
          const provider = await TorProviderBuilder.build();
          provider.flushSettings();
        } catch (e) {
          console.warn("Could not save the tor settings.", e);
        }
      });

      // Quickstart
      this._enableQuickstartCheckbox = document.getElementById(
        "torPreferences-quickstart-toggle"
      );
      this._enableQuickstartCheckbox.addEventListener("command", () => {
        const checked = this._enableQuickstartCheckbox.checked;
        TorSettings.quickstart.enabled = checked;
        TorSettings.saveToPrefs().applySettings();
      });
      this._enableQuickstartCheckbox.checked = TorSettings.quickstart.enabled;
      Services.obs.addObserver(this, TorSettingsTopics.SettingsChanged);

      // Location
      {
        const prefpane = document.getElementById("mainPrefPane");

        const locationGroup = prefpane.querySelector(
          selectors.bridges.locationGroup
        );
        prefpane.querySelector(selectors.bridges.locationLabel).textContent =
          TorStrings.settings.bridgeLocation;
        const location = prefpane.querySelector(selectors.bridges.location);
        const locationEntries = prefpane.querySelector(
          selectors.bridges.locationEntries
        );
        const chooseForMe = prefpane.querySelector(
          selectors.bridges.chooseForMe
        );
        chooseForMe.setAttribute(
          "label",
          TorStrings.settings.bridgeChooseForMe
        );
        chooseForMe.addEventListener("command", () => {
          TorConnect.openTorConnect({
            beginAutoBootstrap: location.value,
          });
        });
        this._populateLocations = () => {
          const currentValue = location.value;
          locationEntries.textContent = "";
          const createItem = (value, label, disabled) => {
            const item = document.createXULElement("menuitem");
            item.setAttribute("value", value);
            item.setAttribute("label", label);
            if (disabled) {
              item.setAttribute("disabled", "true");
            }
            return item;
          };
          const addLocations = codes => {
            const items = [];
            for (const code of codes) {
              items.push(
                createItem(
                  code,
                  TorConnect.countryNames[code]
                    ? TorConnect.countryNames[code]
                    : code
                )
              );
            }
            items.sort((left, right) => left.label.localeCompare(right.label));
            locationEntries.append(...items);
          };
          locationEntries.append(
            createItem("", TorStrings.settings.bridgeLocationAutomatic)
          );
          if (TorConnect.countryCodes.length) {
            locationEntries.append(
              createItem("", TorStrings.settings.bridgeLocationFrequent, true)
            );
            addLocations(TorConnect.countryCodes);
            locationEntries.append(
              createItem("", TorStrings.settings.bridgeLocationOther, true)
            );
          }
          addLocations(Object.keys(TorConnect.countryNames));
          location.value = currentValue;
        };
        this._showAutoconfiguration = () => {
          if (
            !TorConnect.canBeginAutoBootstrap ||
            !TorConnect.potentiallyBlocked
          ) {
            locationGroup.setAttribute("hidden", "true");
            return;
          }
          // Populate locations, even though we will show only the automatic
          // item for a moment. In my opinion showing the button immediately is
          // better then waiting for the Moat query to finish (after a while)
          // and showing the controls only after that.
          this._populateLocations();
          locationGroup.removeAttribute("hidden");
          if (!TorConnect.countryCodes.length) {
            TorConnect.getCountryCodes().then(() => this._populateLocations());
          }
        };
        this._showAutoconfiguration();
      }

      // Advanced setup
      document
        .getElementById("torPreferences-advanced-button")
        .addEventListener("click", () => {
          this.onAdvancedSettings();
        });

      // Tor logs
      document
        .getElementById("torPreferences-buttonTorLogs")
        .addEventListener("click", () => {
          this.onViewTorLogs();
        });

      Services.obs.addObserver(this, TorConnectTopics.StateChange);
    },

    init() {
      gBridgeSettings.init();
      gNetworkStatus.init();

      TorSettings.initializedPromise.then(() => this._populateXUL());

      const onUnload = () => {
        window.removeEventListener("unload", onUnload);
        gConnectionPane.uninit();
      };
      window.addEventListener("unload", onUnload);
    },

    uninit() {
      gBridgeSettings.uninit();
      gNetworkStatus.uninit();

      // unregister our observer topics
      Services.obs.removeObserver(this, TorSettingsTopics.SettingsChanged);
      Services.obs.removeObserver(this, TorConnectTopics.StateChange);
    },

    // whether the page should be present in about:preferences
    get enabled() {
      return TorConnect.enabled;
    },

    //
    // Callbacks
    //

    observe(subject, topic) {
      switch (topic) {
        // triggered when a TorSettings param has changed
        case TorSettingsTopics.SettingsChanged: {
          if (subject.wrappedJSObject.changes.includes("quickstart.enabled")) {
            this._enableQuickstartCheckbox.checked =
              TorSettings.quickstart.enabled;
          }
          break;
        }
        // triggered when tor connect state changes and we may
        // need to update the messagebox
        case TorConnectTopics.StateChange: {
          this._showAutoconfiguration();
          break;
        }
      }
    },

    onAdvancedSettings() {
      gSubDialog.open(
        "chrome://browser/content/torpreferences/connectionSettingsDialog.xhtml",
        { features: "resizable=yes" }
      );
    },

    onViewTorLogs() {
      gSubDialog.open(
        "chrome://browser/content/torpreferences/torLogDialog.xhtml",
        { features: "resizable=yes" }
      );
    },
  };
  return retval;
})(); /* gConnectionPane */
