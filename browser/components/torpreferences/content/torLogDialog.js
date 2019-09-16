"use strict";

const { setTimeout, clearTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { TorProviderBuilder, TorProviderTopics } = ChromeUtils.importESModule(
  "resource://gre/modules/TorProviderBuilder.sys.mjs"
);

const gTorLogDialog = {
  init() {
    const dialog = document.getElementById("torPreferences-torLog-dialog");
    const copyLogButton = dialog.getButton("extra1");
    copyLogButton.setAttribute("data-l10n-id", "tor-log-dialog-copy-button");

    this._logTable = document.getElementById("tor-log-table");
    this._logBody = document.getElementById("tor-log-body");

    let restoreButtonTimeout = null;
    copyLogButton.addEventListener("command", () => {
      // Copy tor log messages to the system clipboard.
      let clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(
        Ci.nsIClipboardHelper
      );
      // The copied text should match the text content the user would get if
      // they hand-selected the entire table.
      clipboard.copyString(
        Array.from(
          this._logTable.querySelectorAll("td"),
          el => el.textContent
        ).join("\n")
      );

      copyLogButton.setAttribute(
        "data-l10n-id",
        "tor-log-dialog-copy-button-copied"
      );
      copyLogButton.classList.add("primary");

      const RESTORE_TIME = 1200;
      if (restoreButtonTimeout !== null) {
        clearTimeout(restoreButtonTimeout);
      }
      restoreButtonTimeout = setTimeout(() => {
        copyLogButton.setAttribute(
          "data-l10n-id",
          "tor-log-dialog-copy-button"
        );
        copyLogButton.classList.remove("primary");
        restoreButtonTimeout = null;
      }, RESTORE_TIME);
    });

    // Intercept the copy event.
    // NOTE: We attach this to the window rather than the _logTable because if
    // the whole table is selected it will not receive the "copy" event.
    window.addEventListener("copy", event => {
      event.preventDefault();
      event.clipboardData.setData(
        "text",
        // By default the selected text will insert "\n\t" between the <td>
        // elements, which separates the timestamp from the message column.
        // We drop this "\t" character, to just keep the "\n".
        window.getSelection().toString().replace(/^\t/gm, "")
      );
    });

    Services.obs.addObserver(this, TorProviderTopics.TorLog);
    window.addEventListener(
      "unload",
      () => {
        Services.obs.removeObserver(this, TorProviderTopics.TorLog);
      },
      { once: true }
    );

    for (const logEntry of TorProviderBuilder.getLog()) {
      this.addLogEntry(logEntry, true);
    }
    // Set the initial scroll to the bottom.
    this._logTable.scrollTo({
      top: this._logTable.scrollTopMax,
      behaviour: "instant",
    });
  },

  observe(subject, topic) {
    if (topic === TorProviderTopics.TorLog) {
      this.addLogEntry(subject.wrappedJSObject, false);
    }
  },

  addLogEntry(logEntry, initial) {
    const timeEl = document.createElement("td");
    timeEl.textContent = logEntry.timestamp;
    timeEl.classList.add("time");
    const messageEl = document.createElement("td");
    messageEl.textContent = `[${logEntry.type}] ${logEntry.msg}`;
    messageEl.classList.add("message");

    const row = document.createElement("tr");
    row.append(timeEl, messageEl);

    // If this is a new entry, and we are currently scrolled to the bottom (with
    // a 6px allowance) we keep the scroll position at the bottom to "follow"
    // the updates.
    const scrollToBottom =
      !initial && this._logTable.scrollTop >= this._logTable.scrollTopMax - 6;

    this._logBody.append(row);
    if (scrollToBottom) {
      this._logTable.scrollTo({ top: this._logTable.scrollTopMax });
    }
  },
};

window.addEventListener(
  "DOMContentLoaded",
  () => {
    gTorLogDialog.init();
  },
  { once: true }
);
