/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals ExtensionAPI, Services, XPCOMUtils */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
});

this.addonsSelfsovereignidentity = class extends ExtensionAPI {

  getAPI(context) {
    let EventManager = ExtensionCommon.EventManager;

    return {
      addonsSelfsovereignidentity: {
        // If you are checking for 'nightly', also check for 'nightly-try'.
        //
        // Otherwise, just use the standard builds, but be aware of the many
        // non-standard options that also exist (as of August 2018).
        //
        // Standard builds:
        //   'esr' - ESR channel
        //   'release' - release channel
        //   'beta' - beta channel
        //   'nightly' - nightly channel
        // Non-standard / deprecated builds:
        //   'aurora' - deprecated aurora channel (still observed in dxr)
        //   'default' - local builds from source
        //   'nightly-try' - nightly Try builds (QA may occasionally need to test with these)
        async getUpdateChannel() {
          return AppConstants.MOZ_UPDATE_CHANNEL;
        },
        async searchCredentialsAsync(protocolName, credentialName, primary, guid) {
          const params = {}
          if (protocolName) {
            params.protocolName = protocolName
          }
          if (credentialName) {
            params.credentialName = credentialName
          }
          if (primary) {
            params.primary = primary
          }
          if (guid) {
            params.guid = guid
          }

          let credentials = await Services.ssi.searchCredentialsAsync(params)

          return credentials.map(lazy.SsiHelper.credentialToVanillaObject).map(credential => {
            const newVal = {...credential}
            newVal.properties = JSON.parse(credential.properties)

            // Filter to only public-able data
            const filteredVal = {
              // credential info
              protocolName: newVal.protocolName,
              credentialName: newVal.credentialName,
              identifier: newVal.identifier,
              primary: newVal.primary,
              // meta info
              guid: newVal.guid,
              timeCreated: newVal.timeCreated,
              timeLastUsed: newVal.timeLastUsed,
              timeSecretChanged: newVal.timeSecretChanged,
            }
            return filteredVal
          })
        },
      },
    };
  }
};
