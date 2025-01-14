/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* global ExtensionAPI */

this.ssi = class extends ExtensionAPI {
  getAPI(context) {
    const { childManager } = context;

    return {
      ssi: {
        // TODO(ssb): Not yet implemented
        async askPermissionChild(protocolName) {
          console.dir("here is child");

          try {
            // let result = await childManager.callParentAsyncFunction(
            //   "ssi.askPermission",
            //   ["nostr"]
            // );
          } catch (e) {
            console.error(e);
          }
        },
      },
    };
  }
};
