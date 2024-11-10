/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* global ExtensionAPI, Services, XPCOMUtils */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
});

const AUTH_TIMEOUT_MS = 24 * 60 * 60 * 1000 // 1 day
const PRIMARY_PASSWORD_NOTIFICATION_ID = "primary-password-ssi-required"

this.ssi = class extends ExtensionAPI {

  getAPI(context) {
    let _authExpirationTime = Number.NEGATIVE_INFINITY

    return {
      ssi: {
        async askPermission(protocolName) {
          // TODO(ssb): Not yet implemented
        },
      },
    };
  }
};
