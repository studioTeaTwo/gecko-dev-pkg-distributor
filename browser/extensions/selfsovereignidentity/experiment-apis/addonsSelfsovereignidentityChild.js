/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* global ExtensionAPI, Services, XPCOMUtils */

this.addonsSelfsovereignidentity = class extends ExtensionAPI {
  getAPI(context) {

    return {
      addonsSelfsovereignidentity: {
        gainPermission(protocolName) {
          try {
            // TODO(ssb): move to experimental API.
          } catch (_) {
          }
        },
      },
    };
  }
};
