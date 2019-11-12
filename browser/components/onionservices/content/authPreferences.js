// Copyright (c) 2020, The Tor Project, Inc.

"use strict";

/* import-globals-from /browser/components/preferences/preferences.js */

/**
 * Onion site preferences.
 */
var OnionServicesAuthPreferences = {
  init() {
    document
      .getElementById("torOnionServiceKeys-savedKeys")
      .addEventListener("click", () => {
        gSubDialog.open(
          "chrome://browser/content/onionservices/savedKeysDialog.xhtml"
        );
      });
  },
};
