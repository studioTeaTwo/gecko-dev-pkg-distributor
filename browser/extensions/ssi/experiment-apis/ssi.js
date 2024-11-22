/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict"

/* globals ExtensionAPI, Services, ChromeUtils */

ChromeUtils.defineESModuleGetters(this, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
  experimentApiSsiHelper:
    "resource://builtin-addons/ssi/experiment-apis/ssiHelper.sys.mjs",
})

this.ssi = class extends ExtensionAPI {
  getAPI(context) {
    let EventManager = ExtensionCommon.EventManager

    return {
      ssi: {
        async searchCredentialsWithoutSecret(
          protocolName,
          credentialName,
          primary, // TODO(ssb): should remove?
          guid // TODO(ssb): should remove?
        ) {
          // Check permission
          const enabled = {
            nostr: Services.prefs.getBoolPref(
              `selfsovereignidentity.nostr.enabled`
            ),
          }

          const params = {}
          if (protocolName) {
            if (!enabled[protocolName]) return []
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

          let credentials
          try {
            credentials = await SsiHelper.searchCredentialsWithoutSecret(params)
          } catch (e) {
            throw e
          }

          return credentials
            .filter((credential) => {
              if (!enabled[credential.protocolName]) return false

              return true
            })
            .map((credential) => {
              // Filter only the data to need
              const filteredVal = {
                // credential info
                protocolName: credential.protocolName,
                credentialName: credential.credentialName,
                identifier: credential.identifier,
                primary: credential.primary, // TODO(ssb): should remove?
                trustedSites: JSON.parse(credential.trustedSites), // TODO(ssb): move to experimental API.
                // meta info
                guid: credential.guid, // TODO(ssb): should remove?
              }
              return filteredVal
            })
        },
      },
    }
  }
}
