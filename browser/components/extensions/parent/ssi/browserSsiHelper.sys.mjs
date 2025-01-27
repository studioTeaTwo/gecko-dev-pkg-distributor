/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals Services */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

let lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
});

const PROTOCOL_NAMES = ["nostr"];
const CREDENTIAL_NAMES = ["nsec"];
const capitalize = function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
const DIALOG_SYSTEM_MESSAGE = protocolName => ({
  read: `read ${capitalize(protocolName)} public key`,
  sign: `sign with ${capitalize(protocolName)}`,
  encrypt: `encrypt with ${capitalize(protocolName)}`,
  decrypt: `decrypt with ${capitalize(protocolName)}`,
  custom: "get your authorization",
});
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
      fire.async().catch(() => {}); // ignore Message Manager disconnects
    };
    Services.prefs.addObserver(prefName, callback);
    return () => {
      Services.prefs.removeObserver(prefName, callback);
    };
  },
  getPrefs(protocolName) {
    // Since this is obtained passively and is not something that the user explicitly takes action on,
    // askConsent is not called. The user controls whether or not to disclose it in the settings.
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
    const regex = /^[A-Za-z0-9\s.,!?'"\-_()]{1,140}$/;
    return regex.test(input);
  },
  getOrigin(context, tabTracker) {
    // TODO(ssb): Background exec check
    const activeTabId = tabTracker.getId(tabTracker.activeTab);

    // FIXME(ssb): Set more robust tabId than activeTab by finding a way to identify the caller. For
    // example, when pending password dialog and when only extension is executing independently.
    const { browser } = context.extension.tabManager.get(activeTabId);

    return {
      browsingContext: browser.browsingContext,
      site: {
        origin: browser.contentPrincipal.originNoSuffix,
        url: browser.contentPrincipal.spec,
        isSystemPrincipal: browser.contentPrincipal.isSystemPrincipal,
      },
      extension: {
        origin: context.xulBrowser.contentPrincipal.originNoSuffix,
        url: context.xulBrowser.contentPrincipal.spec,
      },
    };
  },
  /**
   *
   * @param {Context} context
   * @param {TabTracker} tabTracker
   * @param {object} credential
   * @param {string} credential.protocolName
   * @param {string} credential.credentialName
   * @param {object} dialogInfo
   * @param {string} dialogInfo.type "read" | "sign" | "encrypt" | "decrypt" | "custom"
   * @param {string} dialogInfo.evidence NostrEvent etc.
   * @param {string} dialogInfo.caption
   * @param {string} dialogInfo.submission
   * @param {boolean} dialogInfo.enforce
   * @param {boolean} onlyExtension
   * @returns {Promise<bool>}
   */
  async authorize(context, tabTracker, credential, dialogInfo, onlyExtension) {
    // Prepare stuff
    const { protocolName, credentialName } = credential;
    const { type, evidence, caption, submission, enforce } = dialogInfo;
    const { site, extension, browsingContext } = browserSsiHelper.getOrigin(
      context,
      tabTracker
    );
    console.log(
      "authorize",
      type,
      site.url,
      site.isSystemPrincipal,
      extension.url
    );
    if (site.isSystemPrincipal || site.url.startsWith("about:")) {
      // This is assumed `about:` pages.
      return false;
    }
    if (!site.origin || !extension.origin) {
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

    // NOTE(ssb): Returns true if all settings are explicitly turned off.
    if (
      !internalPrefs["trustedSites.enabled"] &&
      !internalPrefs["primarypassword.toApps.enabled"]
    ) {
      return true;
    }

    // Auth. Check trusted sites and password authorization for the tab app and webextension respectively.
    // TODO(ssb): Even if you call it multiple times in one transaction, the dialog will only be called once.
    const prefs = {
      enabledTrustedSites: internalPrefs["trustedSites.enabled"],
      enabledPrimarypassword: internalPrefs["primarypassword.toApps.enabled"],
    };
    const cacheKey = `${protocolName}:${credentialName}:${credentials[0].identifier}`;
    const auth = Services.ssi.authCache.get(cacheKey);
    const cache = {
      cacheKey,
      trustedSites: auth ? auth.trustedSites : [],
      passwordAuthorizedSites: auth ? auth.passwordAuthorizedSites : [],
      expiryTimePref: internalPrefs["primarypassword.toApps.expiryTime"],
    };
    const dialog = {
      system: DIALOG_SYSTEM_MESSAGE(protocolName)[type],
      evidence,
      caption,
      submission,
      enforce,
      embedderElement: browsingContext.embedderElement,
    };
    const resultExtensiton = await browserSsiHelper.execAuth(
      extension,
      context.extension.name,
      prefs,
      cache,
      dialog
    );
    if (onlyExtension && resultExtensiton) {
      return true;
    }
    const resultSite = await browserSsiHelper.execAuth(
      site,
      "",
      prefs,
      cache,
      dialog
    );
    if (resultExtensiton && resultSite) {
      return true;
    }

    return false;
  },
  /**
   *
   * @param {object} target
   * @param {string} target.origin contentPrincipal.originNoSuffix
   * @param {string} target.url contentPrincipal.spec
   * @param {string} extensionName
   * @param {object} prefs
   * @param {boolean} prefs.enabledTrustedSites
   * @param {boolean} prefs.enabledPrimarypassword
   * @param {object} authCache
   * @param {string} authCache.cacheKey
   * @param {object[]} authCache.trustedSites credential.trustedSites
   * @param {object[]} authCache.passwordAuthorizedSites credential.passwordAuthorizedSites
   * @param {number} authCache.expiryTimePref
   * @param {object} dialogInfo
   * @param {string} dialogInfo.system DIALOG_SYSTEM_MESSAGE
   * @param {string} dialogInfo.evidence
   * @param {string} dialogInfo.caption
   * @param {string} dialogInfo.submission
   * @param {boolean} dialogInfo.enforce
   * @param {object} dialogInfo.embedderElement tab.browser.browsingContext.embedderElement
   * @returns {Promise<boolean>}
   */
  async execAuth(target, extensionName, prefs, authCache, dialogInfo) {
    const { url } = target;
    const { enabledTrustedSites, enabledPrimarypassword } = prefs;
    const { trustedSites, passwordAuthorizedSites } = authCache;
    const { enforce } = dialogInfo;

    if (enabledTrustedSites && !enforce) {
      const trusted = browserSsiHelper.isTrusted(url, trustedSites);
      if (trusted) {
        return true;
      }
      // go to primarypassword cache
    }

    if (enabledPrimarypassword && !enforce) {
      const alreadyAuthorized = browserSsiHelper.isPasswordAuthorized(
        url,
        passwordAuthorizedSites
      );
      if (alreadyAuthorized) {
        return true;
      }
      // go to primarypassword dialog
    }

    if (enabledPrimarypassword || enforce) {
      const isAuthorized = await browserSsiHelper.authPassword(
        target,
        extensionName,
        authCache,
        dialogInfo
      );
      if (isAuthorized) {
        return true;
      }
    }

    return false;
  },
  /**
   *
   * @param {string} url
   * @param {object[]} trustedSites
   * @returns {boolean}
   */
  isTrusted(url, trustedSites) {
    // TODO(ssb): improve the match method, such as supporting glob or WebExtension.UrlFilter
    const trusted = trustedSites.some(site => {
      return site.enabled && url.startsWith(site.url);
    });
    console.log("trustedSites", trusted, url, trustedSites);
    return trusted;
  },
  /**
   *
   * @param {string} url
   * @param {object[]} passwordAuthorizedSites
   * @returns {boolean}
   */
  isPasswordAuthorized(url, passwordAuthorizedSites) {
    const expiryTime = passwordAuthorizedSites.filter(site =>
      url.startsWith(site.url)
    )[0]?.expiryTime;
    const validSite = !!expiryTime && expiryTime > Date.now();

    console.log(
      "primarypassword-cache",
      validSite,
      url,
      passwordAuthorizedSites
    );
    return validSite;
  },
  /**
   *
   * @param {object} target
   * @param {string} target.origin contentPrincipal.originNoSuffix
   * @param {string} target.url contentPrincipal.spec
   * @param {string} extensionName
   * @param {object} authCache
   * @param {string} authCache.cacheKey
   * @param {object[]} authCache.trustedSites credential.trustedSites
   * @param {object[]} authCache.passwordAuthorizedSites credential.passwordAuthorizedSites
   * @param {number} authCache.expiryTimePref
   * @param {object} dialogInfo
   * @param {string} dialogInfo.system DIALOG_SYSTEM_MESSAGE
   * @param {string} dialogInfo.evidence
   * @param {string} dialogInfo.caption
   * @param {string} dialogInfo.submission
   * @param {boolean} dialogInfo.enforce
   * @param {object} dialogInfo.embedderElement tab.browser.browsingContext.embedderElement
   * @returns {boolean}
   */
  async authPassword(target, extensionName, authCache, dialogInfo) {
    const { url, origin } = target;
    const { cacheKey, passwordAuthorizedSites, expiryTimePref } = authCache;
    const { system, evidence, caption, submission, enforce, embedderElement } =
      dialogInfo;
    const eol = AppConstants.platform === "win" ? "\r\n" : "\n";
    const messageText = {
      value: `${
        AppConstants.platform === "win" ? "Nightly is trying to " : ""
      }${system}${eol}to ${origin}`,
    };
    if (caption) {
      messageText.value += `${eol}${JSON.stringify(caption, null, 1)}`;
    }
    if (evidence) {
      messageText.value += `${eol}${eol}${JSON.stringify(evidence, null, 1)}`;
    }
    if (submission) {
      messageText.value += `${eol}${eol}${JSON.stringify(submission, null, 1)}`;
    }
    const captionText = {
      value: AppConstants.platform === "win" ? "Nightly" : "",
    }; // caption only works on windows.
    const isOSAuthEnabled = lazy.SsiHelper.getOSAuthEnabled(
      lazy.SsiHelper.OS_AUTH_FOR_PASSWORDS_PREF
    );
    if (isOSAuthEnabled) {
      const messageId = MESSAGE_ID + "-" + AppConstants.platform;
    }
    let _authExpirationTime = passwordAuthorizedSites.filter(site =>
      url.startsWith(site.url)
    )[0]?.expiryTime;
    if (_authExpirationTime == null) {
      _authExpirationTime = 0;
      Services.ssi.authCache.update(cacheKey, {
        passwordAuthorizedSites: [
          { url: origin, name: extensionName, expiryTime: 0, permissions: [] },
        ],
      });
    }
    if (enforce) {
      _authExpirationTime = 0;
    }

    // Password prompt
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
      const passwordAuthorizedSites = [
        { url: origin, name: extensionName, expiryTime, permissions: [] },
      ];
      Services.ssi.authCache.update(cacheKey, { passwordAuthorizedSites });
    }
    console.log(
      "primarypassword-dialog",
      isAuthorized,
      telemetryEvent,
      origin,
      Services.ssi.authCache.get(cacheKey).passwordAuthorizedSites
    );
    return isAuthorized;
  },
};
