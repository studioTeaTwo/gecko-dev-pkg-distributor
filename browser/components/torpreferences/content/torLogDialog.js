"use strict";

const { setTimeout, clearTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { TorProviderBuilder } = ChromeUtils.importESModule(
  "resource://gre/modules/TorProviderBuilder.sys.mjs"
);

window.addEventListener(
  "DOMContentLoaded",
  () => {
    const dialog = document.getElementById("torPreferences-torLog-dialog");
    const copyLogButton = dialog.getButton("extra1");
    copyLogButton.setAttribute("data-l10n-id", "tor-log-dialog-copy-button");

    const logText = document.getElementById(
      "torPreferences-torDialog-textarea"
    );

    let restoreButtonTimeout = null;
    copyLogButton.addEventListener("command", () => {
      // Copy tor log messages to the system clipboard.
      let clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(
        Ci.nsIClipboardHelper
      );
      clipboard.copyString(logText.value);

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

    // A waiting state should not be needed at this point.
    // Also, we probably cannot even arrive here if the provider failed to
    // initialize, otherwise we could use a try/catch, and write the exception
    // text in the logs, instead.
    TorProviderBuilder.build().then(
      provider => (logText.value = provider.getLog())
    );
  },
  { once: true }
);
