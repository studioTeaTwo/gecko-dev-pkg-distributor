// Copyright (c) 2020, The Tor Project, Inc.

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  TorProviderBuilder: "resource://gre/modules/TorProviderBuilder.sys.mjs",
});

var gOnionServicesSavedKeysDialog = {
  _tree: undefined,
  _busyCount: 0,
  get _isBusy() {
    // true when loading data, deleting a key, etc.
    return this._busyCount > 0;
  },

  async _deleteSelectedKeys() {
    this._showError(null);
    this._withBusy(async () => {
      const indexesToDelete = [];
      const count = this._tree.view.selection.getRangeCount();
      for (let i = 0; i < count; ++i) {
        const minObj = {};
        const maxObj = {};
        this._tree.view.selection.getRangeAt(i, minObj, maxObj);
        for (let idx = minObj.value; idx <= maxObj.value; ++idx) {
          indexesToDelete.push(idx);
        }
      }

      if (indexesToDelete.length) {
        const provider = await TorProviderBuilder.build();
        try {
          // Remove in reverse index order to avoid issues caused by index
          // changes.
          for (let i = indexesToDelete.length - 1; i >= 0; --i) {
            await this._deleteOneKey(provider, indexesToDelete[i]);
          }
        } catch (e) {
          console.error("Removing a saved key failed", e);
          this._showError(
            "onion-site-saved-keys-dialog-remove-keys-error-message"
          );
        }
      }
    });
  },

  async _deleteAllKeys() {
    this._tree.view.selection.selectAll();
    await this._deleteSelectedKeys();
  },

  _updateButtonsState() {
    const haveSelection = this._tree.view.selection.getRangeCount() > 0;
    this._removeButton.disabled = this._isBusy || !haveSelection;
    this._removeAllButton.disabled = this._isBusy || this.rowCount === 0;
  },

  // Private functions.
  _onLoad() {
    document.mozSubdialogReady = this._init();
  },

  _init() {
    this._populateXUL();
    window.addEventListener("keypress", this._onWindowKeyPress.bind(this));
    this._loadSavedKeys();
  },

  _populateXUL() {
    this._errorMessageContainer = document.getElementById(
      "onionservices-savedkeys-errorContainer"
    );
    this._errorMessageEl = document.getElementById(
      "onionservices-savedkeys-errorMessage"
    );
    this._removeButton = document.getElementById(
      "onionservices-savedkeys-remove"
    );
    this._removeButton.addEventListener("click", () => {
      this._deleteSelectedKeys();
    });
    this._removeAllButton = document.getElementById(
      "onionservices-savedkeys-removeall"
    );
    this._removeButton.addEventListener("click", () => {
      this._deleteAllKeys();
    });

    this._tree = document.getElementById("onionservices-savedkeys-tree");
    this._tree.addEventListener("select", () => {
      this._updateButtonsState();
    });
  },

  async _loadSavedKeys() {
    this._showError(null);
    this._withBusy(async () => {
      try {
        this._tree.view = this;

        const provider = await TorProviderBuilder.build();
        const keyInfoList = await provider.onionAuthViewKeys();
        if (keyInfoList) {
          // Filter out temporary keys.
          this._keyInfoList = keyInfoList.filter(aKeyInfo =>
            aKeyInfo.flags?.includes("Permanent")
          );
          // Sort by the .onion address.
          this._keyInfoList.sort((aObj1, aObj2) => {
            const hsAddr1 = aObj1.address.toLowerCase();
            const hsAddr2 = aObj2.address.toLowerCase();
            if (hsAddr1 < hsAddr2) {
              return -1;
            }
            return hsAddr1 > hsAddr2 ? 1 : 0;
          });
        }

        // Render the tree content.
        this._tree.rowCountChanged(0, this.rowCount);
      } catch (e) {
        console.error("Failed to load keys", e);
        this._showError(
          "onion-site-saved-keys-dialog-fetch-keys-error-message"
        );
      }
    });
  },

  // This method may throw; callers should catch errors.
  async _deleteOneKey(provider, aIndex) {
    const keyInfoObj = this._keyInfoList[aIndex];
    await provider.onionAuthRemove(keyInfoObj.address);
    this._tree.view.selection.clearRange(aIndex, aIndex);
    this._keyInfoList.splice(aIndex, 1);
    this._tree.rowCountChanged(aIndex + 1, -1);
  },

  async _withBusy(func) {
    this._busyCount++;
    if (this._busyCount === 1) {
      this._updateButtonsState();
    }
    try {
      await func();
    } finally {
      this._busyCount--;
      if (this._busyCount === 0) {
        this._updateButtonsState();
      }
    }
  },

  _onWindowKeyPress(event) {
    if (this._isBusy) {
      return;
    }
    if (event.keyCode === KeyEvent.DOM_VK_ESCAPE) {
      window.close();
    } else if (event.keyCode === KeyEvent.DOM_VK_DELETE) {
      this._deleteSelectedKeys();
    }
  },

  /**
   * Show an error, or clear it.
   *
   * @param {?string} messageId - The l10n ID of the message to show, or null to
   *   clear it.
   */
  _showError(messageId) {
    this._errorMessageContainer.classList.toggle("show-error", !!messageId);
    if (messageId) {
      document.l10n.setAttributes(this._errorMessageEl, messageId);
    } else {
      // Clean up.
      this._errorMessageEl.removeAttribute("data-l10n-id");
      this._errorMessageEl.textContent = "";
    }
  },

  // XUL tree widget view implementation.
  get rowCount() {
    return this._keyInfoList?.length ?? 0;
  },

  getCellText(aRow, aCol) {
    if (this._keyInfoList && aRow < this._keyInfoList.length) {
      const keyInfo = this._keyInfoList[aRow];
      if (aCol.id.endsWith("-siteCol")) {
        return keyInfo.address;
      } else if (aCol.id.endsWith("-keyCol")) {
        // keyType is always "x25519", so do not show it.
        return keyInfo.keyBlob;
      }
    }
    return "";
  },

  isSeparator(_index) {
    return false;
  },

  isSorted() {
    return false;
  },

  isContainer(_index) {
    return false;
  },

  setTree(_tree) {},

  getImageSrc(_row, _column) {},

  getCellValue(_row, _column) {},

  cycleHeader(_column) {},

  getRowProperties(_row) {
    return "";
  },

  getColumnProperties(_column) {
    return "";
  },

  getCellProperties(_row, _column) {
    return "";
  },
};

window.addEventListener("load", () => gOnionServicesSavedKeysDialog._onLoad());
