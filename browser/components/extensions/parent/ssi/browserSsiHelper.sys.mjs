/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals Services */

import { AuthCache } from "resource://gre/modules/AuthCache.sys.mjs"; // Treat AuthCache as a singleton

const PROTOCOL_NAMES = ["nostr"];
const CREDENTIAL_NAMES = ["nsec"];

export const browserSsiHelper = {
  // ref: https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/events.html
  onPrimaryChangedRegister: protocolName => fire => {
    // Validate params
    if (!browserSsiHelper.validateProtocolName(protocolName)) {
      return;
    }

    const callback = () => {
      // Check permission
      const enabled = Services.prefs.getBoolPref(
        `selfsovereignidentity.${protocolName}.enabled`
      );
      const usedAccountChanged = Services.prefs.getBoolPref(
        `selfsovereignidentity.${protocolName}.event.accountChanged.enabled`
      );
      if (!enabled || !usedAccountChanged) {
        return;
      }

      fire.async().catch(() => {}); // ignore Message Manager disconnects
    };

    let obsTopic;
    if (protocolName === "nostr") {
      obsTopic = "SSI_PRIMARY_KEY_CHANGED_IN_NOSTR";
    }

    Services.obs.addObserver(callback, obsTopic);
    return () => {
      Services.obs.removeObserver(callback, obsTopic);
    };
  },
  onPrefEnabledChangedRegister: protocolName => fire => {
    // Validate params
    if (!browserSsiHelper.validateProtocolName(protocolName)) {
      return;
    }

    const prefName = `selfsovereignidentity.${protocolName}.enabled`;

    const callback = () => {
      // No need to check permission
      fire.async("enabled").catch(() => {}); // ignore Message Manager disconnects
    };
    Services.prefs.addObserver(prefName, callback);
    return () => {
      Services.prefs.removeObserver(prefName, callback);
    };
  },
  onPrefAccountChangedRegister: protocolName => fire => {
    // Validate params
    if (!browserSsiHelper.validateProtocolName(protocolName)) {
      return;
    }

    const prefName = `selfsovereignidentity.${protocolName}.event.accountChanged.enabled`;

    const callback = () => {
      // Check permission
      const enabled = Services.prefs.getBoolPref(
        `selfsovereignidentity.${protocolName}.enabled`
      );
      if (!enabled) {
        return;
      }

      fire.async("event.accountChanged.enabled").catch(() => {}); // ignore Message Manager disconnects
    };
    Services.prefs.addObserver(prefName, callback);
    return () => {
      Services.prefs.removeObserver(prefName, callback);
    };
  },
  getPrefs(protocolName) {
    // Since this is obtained passively and is not something that the user explicitly takes action on,
    // askPermission is not called. The user controls whether or not to disclose it in the settings.
    // Here, only values that are based on such assumptions should be returned.

    // Validate params
    if (!browserSsiHelper.validateProtocolName(protocolName)) {
      return null;
    }

    // Check permission
    const enabled = Services.prefs.getBoolPref(
      `selfsovereignidentity.${protocolName}.enabled`
    );
    if (!enabled) {
      return null;
    }

    try {
      const prefs = {
        enabled,
      };
      return prefs;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  getInternalPrefs(protocolName) {
    // Validate params
    if (!browserSsiHelper.validateProtocolName(protocolName)) {
      return null;
    }

    try {
      const prefs = {
        "trustedSites.enabled": Services.prefs.getBoolPref(
          `selfsovereignidentity.${protocolName}.trustedSites.enabled`
        ),
        "primarypassword.toApps.enabled": Services.prefs.getBoolPref(
          `selfsovereignidentity.${protocolName}.primarypassword.toApps.enabled`
        ),
        "primarypassword.toApps.expiryTime": Services.prefs.getIntPref(
          `selfsovereignidentity.${protocolName}.primarypassword.toApps.expiryTime`
        ),
      };
      return prefs;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  validateProtocolName(protocolName) {
    return PROTOCOL_NAMES.includes(protocolName);
  },
  validateCredentialName(credentialName) {
    return CREDENTIAL_NAMES.includes(credentialName);
  },
  getOrigin(context, tabTracker) {
    // TODO(ssb): Background exec check
    const activeTabId = tabTracker.getId(tabTracker.activeTab);

    // FIXME(ssb): Set more robust tabId than activeTab by finding a way to identify the caller. For
    // example, when pending password dialog and when only extension is executing independently.
    const { browser } = context.extension.tabManager.get(activeTabId);
    const originSite = browser.contentPrincipal.originNoSuffix;
    const originExtension = context.xulBrowser.contentPrincipal.originNoSuffix;

    return {
      browsingContext: browser.browsingContext,
      originSite, // If only extension is executing independently, return "".
      originExtension,
    };
  },
  isAuthorized(credential, context, tabTracker, onlyExtension = false) {
    const internalPrefs = browserSsiHelper.getInternalPrefs(
      credential.protocolName
    );

    let { originSite, originExtension } = browserSsiHelper.getOrigin(
      context,
      tabTracker
    );
    if (onlyExtension) {
      originSite = "";
    }
    const authKey = `${credential.protocolName}:${credential.credentialName}:${credential.identifier}`;
    const auth = AuthCache.get(authKey);
    if (!auth) {
      return false;
    }

    if (internalPrefs["primarypassword.toApps.enabled"]) {
      const trusted = browserSsiHelper.isTrusted(
        { site: originSite, extension: originExtension, onlyExtension },
        auth.trustedSites
      );
      if (trusted) {
        return true;
      }
      // go to primarypassword auth
    }

    if (internalPrefs["primarypassword.toApps.enabled"]) {
      const expiryTimeForSite = auth.passwordAuthorizedSites.filter(
        site => site.url === originSite
      )[0]?.expiryTime;
      const expiryTimeForExtension = auth.passwordAuthorizedSites.filter(
        site => site.url === originExtension
      )[0]?.expiryTime;
      const validSite = expiryTimeForSite && expiryTimeForSite > Date.now();
      const validExtension =
        expiryTimeForExtension && expiryTimeForExtension > Date.now();
      if ((validSite && validExtension) || (onlyExtension && validExtension)) {
        return true;
      }
      // go to self-sovereign check
    }

    return browserSsiHelper.isSelfsovereignty(credential.protocolName);
  },
  isTrusted(
    {
      site, // If onlyExtension is true, set ""
      extension,
      onlyExtension = false,
    },
    trustedSites
  ) {
    if (onlyExtension) {
      site = "";
    }

    // TODO(ssb): improve the match method, such as supporting glob or WebExtension.UrlFilter
    const trusted = trustedSites.some(_site => {
      if (onlyExtension) {
        return extension.startsWith(_site.url);
      }
      return site.startsWith(_site.url) && extension.startsWith(_site.url);
    });
    return trusted;
  },
  isSelfsovereignty(protocolName) {
    const internalPrefs = browserSsiHelper.getInternalPrefs(protocolName);

    // NOTE(ssb): Returns true if all settings are explicitly turned off.
    // eslint-disable-next-line no-unneeded-ternary
    return !internalPrefs["trustedSites.enabled"] &&
      !internalPrefs["primarypassword.toApps.enabled"]
      ? true
      : false;
  },
};
