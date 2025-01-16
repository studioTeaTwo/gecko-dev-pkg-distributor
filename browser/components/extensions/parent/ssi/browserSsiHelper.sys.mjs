/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals Services */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { AuthCache } from "resource://gre/modules/AuthCache.sys.mjs"; // Treat AuthCache as a singleton

let lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
});

const PROTOCOL_NAMES = ["nostr"];
const CREDENTIAL_NAMES = ["nsec"];
const MESSAGE_ID = "builtinapi-ssi-access-authlocked-os-auth-dialog-message";

/**
 * Internal Helper for browser.ssi.
 * Validation of user input params should be already done by the calling browser.ssi, except for eventListener.
 */
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
  validateDialogText(input) {
    const regex = /^[A-Za-z0-9\s.,!?'"\-_()]{1,144}$/;
    return regex.test(input);
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
  async authorize(
    context,
    tabTracker,
    { protocolName, credentialName },
    { caption, submission }, // dialog
    onlyExtension
  ) {
    console.log("authorize", caption, submission);
    // Prepare stuff
    const { originSite, originExtension, browsingContext } =
      browserSsiHelper.getOrigin(context, tabTracker);
    if (!originSite || !originExtension) {
      return false;
    }
    const internalPrefs = browserSsiHelper.getInternalPrefs(protocolName);
    const credentials = await lazy.SsiHelper.searchCredentialsWithoutSecret({
      protocolName,
      credentialName,
      primary: true,
    });
    if (credentials.length === 0) {
      return false;
    }
    const cacheKey = `${protocolName}:${credentialName}:${credentials[0].identifier}`;
    const auth = AuthCache.get(cacheKey);

    // Auth. Check trusted sites and password authorization for the tab app and webextension respectively.
    const prefs = {
      enabledTrustedSites: internalPrefs["trustedSites.enabled"],
      enabledPrimarypassword: internalPrefs["primarypassword.toApps.enabled"],
    };
    const cache = {
      cacheKey,
      trustedSites: auth.trustedSites,
      passwordAuthorizedSites: auth.passwordAuthorizedSites,
      expiryTimePref: internalPrefs["primarypassword.toApps.expiryTime"],
    };
    const dialog = {
      caption,
      submission,
      embedderElement: browsingContext.embedderElement,
    };
    const resultExtensiton = await browserSsiHelper.execAuth(
      originExtension,
      context.extension.name,
      prefs,
      cache,
      dialog
    );
    if (onlyExtension && resultExtensiton) {
      return true;
    }
    const resultSite = await browserSsiHelper.execAuth(
      originSite,
      "",
      prefs,
      cache,
      dialog
    );
    if (resultExtensiton && resultSite) {
      return true;
    }

    // NOTE(ssb): Returns true if all settings are explicitly turned off.
    // eslint-disable-next-line no-unneeded-ternary
    return !internalPrefs["trustedSites.enabled"] &&
      !internalPrefs["primarypassword.toApps.enabled"]
      ? true
      : false;
  },
  async execAuth(
    origin,
    extensionName,
    { enabledTrustedSites, enabledPrimarypassword }, // preference value
    { cacheKey, trustedSites, passwordAuthorizedSites, expiryTimePref }, // auth cache
    { caption, submission, embedderElement } // dialog
  ) {
    if (enabledTrustedSites) {
      const trusted = browserSsiHelper.isTrusted(origin, trustedSites);
      if (trusted) {
        return true;
      }
      // go to primarypassword auth
    }

    if (enabledPrimarypassword) {
      const alreadyAuthorized = browserSsiHelper.isPasswordAuthorized(
        origin,
        passwordAuthorizedSites
      );
      if (alreadyAuthorized) {
        return true;
      }

      // To password dialog
      const isAuthorized = await browserSsiHelper.authPassword(
        origin,
        extensionName,
        {
          cacheKey,
          passwordAuthorizedSites,
          expiryTimePref,
        },
        {
          caption,
          submission,
          embedderElement,
        }
      );
      if (isAuthorized) {
        return true;
      }
    }
    return false;
  },
  isTrusted(origin, trustedSites) {
    // TODO(ssb): improve the match method, such as supporting glob or WebExtension.UrlFilter
    const trusted = trustedSites.some(site => {
      return origin.startsWith(site.url);
    });
    console.log("trustedSites", trusted, origin, trustedSites);
    return trusted;
  },
  isPasswordAuthorized(origin, passwordAuthorizedSites) {
    const expiryTime = passwordAuthorizedSites.filter(
      site => site.url === origin
    )[0]?.expiryTime;
    const validSite = expiryTime && expiryTime > Date.now();

    console.log("primarypassword", origin, validSite, passwordAuthorizedSites);
    return validSite;
  },
  async authPassword(
    origin,
    extensionName,
    { cacheKey, passwordAuthorizedSites, expiryTimePref }, // auth cache
    { caption, submission, embedderElement } // dialog
  ) {
    const eol = AppConstants.platform !== "win" ? "\n" : "\r\n";
    const messageText = {
      value: `${caption}${eol}${origin}${
        submission ? `${eol}${eol}${submission}` : ``
      }`,
    };
    const captionText = { value: "" }; // only windows
    const isOSAuthEnabled = lazy.SsiHelper.getOSAuthEnabled(
      lazy.SsiHelper.OS_AUTH_FOR_PASSWORDS_PREF
    );
    if (isOSAuthEnabled) {
      const messageId = MESSAGE_ID + "-" + AppConstants.platform;
    }
    let _authExpirationTime = passwordAuthorizedSites.filter(
      site => site.url === origin
    )[0]?.expiryTime;
    if (_authExpirationTime == null) {
      _authExpirationTime = 0;
      AuthCache.set(cacheKey, {
        passwordAuthorizedSites: [{ url: origin, expiryTime: 0 }],
      });
    }

    // Auth
    const { isAuthorized, telemetryEvent } = await lazy.SsiHelper.requestReauth(
      embedderElement,
      isOSAuthEnabled,
      _authExpirationTime,
      messageText.value,
      captionText.value
    );

    // Update expiry time if password is newly entered.
    const enteredPassword = [
      "success",
      "success_unsupported_platform",
    ].includes(telemetryEvent.value);
    if (isAuthorized && enteredPassword) {
      const expiryTime = expiryTimePref > 0 ? Date.now() + expiryTimePref : 0;
      const passwordAuthorizedSites = [{ url: origin, expiryTime }];
      if (extensionName) {
        passwordAuthorizedSites[0].name = extensionName;
      }
      AuthCache.set(cacheKey, { passwordAuthorizedSites });
    }
    console.log(
      "primarypassword",
      isAuthorized,
      telemetryEvent,
      origin,
      AuthCache.get(cacheKey)
    );
    return isAuthorized;
  },
};
