/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Internal Helper for browser.ssi.
 * Validation for user input params should be already done by the calling browser.ssi, except for eventListener.
 */

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

// below is from browser/components/selfsovereignindividual/src/components/nostr/contants.ts
const SpecialCards = ["*", "<all_urls>"];

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
        `selfsovereignindividual.${protocolName}.enabled`
      );
      const usedAccountChanged = Services.prefs.getBoolPref(
        `selfsovereignindividual.${protocolName}.event.accountChanged.enabled`
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

    const prefName = `selfsovereignindividual.${protocolName}.enabled`;

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
      `selfsovereignindividual.${protocolName}.enabled`
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
          `selfsovereignindividual.${protocolName}.trustedSites.enabled`
        ),
        "trustedSites.nallowedMethodPreset": Services.prefs.getStringPref(
          `selfsovereignindividual.${protocolName}.trustedSites.nallowedMethodPreset`
        ),
        "primarypassword.toApps.enabled": Services.prefs.getBoolPref(
          `selfsovereignindividual.${protocolName}.primarypassword.toApps.enabled`
        ),
        "primarypassword.toApps.expirationTime": Services.prefs.getIntPref(
          `selfsovereignindividual.${protocolName}.primarypassword.toApps.expirationTime`
        ),
        "primarypassword.toApps.dialogDisplayOptionPreset":
          Services.prefs.getStringPref(
            `selfsovereignindividual.${protocolName}.primarypassword.toApps.dialogDisplayOptionPreset`
          ),
      };
      if (protocolName === "nostr") {
        prefs["primarypassword.toApps.excludedKindsPreset"] =
          Services.prefs.getStringPref(
            "selfsovereignindividual.nostr.primarypassword.toApps.excludedKindsPreset"
          );
      }
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
  validateCiphertext(ciphertext) {
    if (ciphertext == null) {
      return false;
    }
    // TODO(ssb): validate in the terms of cryptography

    return true;
  },
  validateConversationPartnerPubkey(pubkey) {
    if (pubkey == null) {
      return false;
    }
    // TODO(ssb): validate in the terms of cryptography. e.g. `function isProbPub` in toolkit/components/ssi/protocols/noble-curves/abstract/weierstrass.sys.mjs

    return true;
  },
  /**
   *
   * @param {Context} context
   * @param {number} tabId
   * @param {object} credential
   * @param {string} credential.protocolName
   * @param {string} credential.credentialName
   * @param {object} dialogInfo
   * @param {string} dialogInfo.type "read" | "sign" | "encrypt" | "decrypt" | "custom"
   * @param {object} dialogInfo.evidence NostrEvent etc.
   * @param {string} dialogInfo.caption
   * @param {string} dialogInfo.submission
   * @param {boolean} dialogInfo.enforce
   * @param {boolean} onlyExtension
   * @returns {Promise<bool>}
   */
  async authorize(context, tabId, credential, dialogInfo, onlyExtension) {
    // Prepare stuff
    const { protocolName, credentialName } = credential;
    const { type, evidence, caption, submission, enforce } = dialogInfo;
    const { site, extension, browsingContext, window } = getOrigin(
      context,
      tabId
    );
    const internalPrefs = browserSsiHelper.getInternalPrefs(protocolName);
    console.log(
      "authorize",
      type,
      site.url,
      site.isSystemPrincipal,
      extension.url
    );

    // Check permission
    if (site.isSystemPrincipal || site.url.startsWith("about:")) {
      // This is assumed `about:` pages.
      return false;
    }
    if (!site.origin || !extension.origin) {
      return false;
    }
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

    // Build parameters
    const prefs = {
      enabledTrustedSites: internalPrefs["trustedSites.enabled"],
      nallowedMethodPreset: internalPrefs["trustedSites.nallowedMethodPreset"]
        ? internalPrefs["trustedSites.nallowedMethodPreset"].split(",")
        : [],
      enabledPrimarypassword: internalPrefs["primarypassword.toApps.enabled"],
      dialogDisplayOptionPreset:
        internalPrefs["primarypassword.toApps.dialogDisplayOptionPreset"].split(
          ","
        ),
    };
    if (protocolName === "nostr") {
      prefs.excludedKindsPreset = internalPrefs[
        "primarypassword.toApps.excludedKindsPreset"
      ]
        ? internalPrefs["primarypassword.toApps.excludedKindsPreset"].split(",")
        : [];
    }
    const cacheKey = `${protocolName}:${credentialName}:${credentials[0].identifier}`;
    const auth = Services.ssi.authCache.get(cacheKey);
    const cache = {
      cacheKey,
      trustedSites: auth ? auth.trustedSites : [],
      passwordAuthorizedSites: auth ? auth.passwordAuthorizedSites : [],
      expirationTimePref:
        internalPrefs["primarypassword.toApps.expirationTime"],
    };
    const dialog = {
      type,
      evidence,
      caption,
      submission,
      enforce,
      embedderElement: browsingContext.embedderElement,
      window,
    };

    // Auth. Check trusted sites and password authorization for the tab app and webextension respectively.
    // TODO(ssb): Even if you call it multiple times in one transaction, the dialog will only be called once.
    const resultExtensiton = await execAuth(
      extension,
      context.extension.name,
      prefs,
      cache,
      dialog
    );
    if (onlyExtension && resultExtensiton) {
      return true;
    }
    const resultSite = await execAuth(site, "", prefs, cache, dialog);
    if (resultExtensiton && resultSite) {
      return true;
    }

    return false;
  },
};

/**
 * Executes authorization toward individual URL.
 * Three steps to proceed:
 * 1. Registered in Trusted Site? - on background
 * 2. Is the password authentication valid for the period? - on background
 * 3. Is correct password entered? - on dialog
 *
 * @param {object} target
 * @param {string} target.origin contentPrincipal.originNoSuffix
 * @param {string} target.url contentPrincipal.spec
 * @param {string} extensionName
 * @param {object} prefs
 * @param {boolean} prefs.enabledTrustedSites
 * @param {boolean} prefs.enabledPrimarypassword
 * @param {string[]} prefs.nallowedMethodPreset
 * @param {string[]} prefs.dialogDisplayOptionPreset
 * @param {string[]=} prefs.excludedKindsPreset
 * @param {object} authCache
 * @param {string} authCache.cacheKey
 * @param {object[]} authCache.trustedSites credential.trustedSites
 * @param {object[]} authCache.passwordAuthorizedSites credential.passwordAuthorizedSites
 * @param {number} authCache.expirationTimePref
 * @param {object} dialogInfo
 * @param {string} dialogInfo.type "read" | "sign" | "encrypt" | "decrypt" | "custom"
 * @param {object} dialogInfo.evidence
 * @param {string} dialogInfo.caption
 * @param {string} dialogInfo.submission
 * @param {boolean} dialogInfo.enforce
 * @param {object} dialogInfo.embedderElement tab.browser.browsingContext.embedderElement
 * @param {boolean} dialogInfo.window nativeTab.ownerGlobal
 * @returns {Promise<boolean>}
 */
async function execAuth(target, extensionName, prefs, authCache, dialogInfo) {
  const { url } = target;
  const { enabledTrustedSites, enabledPrimarypassword } = prefs;
  const { cacheKey, trustedSites, passwordAuthorizedSites } = authCache;
  const { evidence, enforce, type } = dialogInfo;

  const protocolName = cacheKey.split(":")[0];
  const _isAuthMandatory = isAuthMandatory(
    url,
    protocolName,
    passwordAuthorizedSites,
    enforce,
    evidence
  );

  // 1. Registered in Trusted Site? - on background
  if (enabledTrustedSites && !_isAuthMandatory) {
    const trusted = isTrusted(url, type, trustedSites);
    console.log("trustedSites", trusted, url, trustedSites);
    if (trusted) {
      return true;
    }
    // go to primarypassword cache
  }

  // 2. Is the password authentication valid for the period? - on background
  if (enabledPrimarypassword && !_isAuthMandatory) {
    const validCache = isPasswordAuthorized(target, authCache);
    if (validCache) {
      return true;
    }
    // go to primarypassword dialog
  }

  // 3. Is correct password entered? - on dialog
  if (enabledPrimarypassword) {
    const isAuthorized = await authWithPassword(
      target,
      extensionName,
      prefs,
      authCache,
      dialogInfo
    );
    if (isAuthorized) {
      return true;
    }
  }

  return false;
}

/**
 *
 * @param {object} context
 * @param {number} tabId
 * @returns
 */
function getOrigin(context, tabId) {
  const { browser, window } = context.extension.tabManager.get(tabId);

  return {
    browsingContext: browser.browsingContext,
    window,
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
}
/**
 *
 * @param {string} url
 * @param {string} type "read" | "sign" | "encrypt" | "decrypt" | "custom"
 * @param {object[]} trustedSites
 * @returns {boolean}
 */
function isTrusted(url, type, trustedSites) {
  const found = trustedSites.find(site => {
    if (!site.enabled) {
      return false;
    }
    if (SpecialCards.includes(site.url)) {
      return true;
    }

    // Check to match pattern
    const escapedUrlString = site.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Currently support only '*' as wildcard.
    const regexString = escapedUrlString.replace(/\\\*/g, ".*");
    const regex = new RegExp("^" + regexString);
    return regex.test(url);
  });
  if (!found) {
    return false;
  }

  // It's full trust, so return true.
  if (found.permissions.nallowedMethod.length === 0) {
    return true;
  }

  // Is this method-limit trusted?
  const trusted = found.permissions.nallowedMethod.includes(type);
  if (trusted) {
    return true;
  }

  return false;
}

/**
 *
 * @param {object} target
 * @param {string} target.origin contentPrincipal.originNoSuffix
 * @param {string} target.url contentPrincipal.spec
 * @param {object} authCache
 * @param {string} authCache.cacheKey
 * @param {object[]} authCache.trustedSites credential.trustedSites
 * @param {object[]} authCache.passwordAuthorizedSites credential.passwordAuthorizedSites
 * @param {number} authCache.expirationTimePref
 * @returns {boolean}
 */
function isPasswordAuthorized(target, authCache) {
  const { url } = target;
  const { passwordAuthorizedSites } = authCache;

  let passwordAuthorizedSite = passwordAuthorizedSites.find(site =>
    url.startsWith(site.url)
  );

  if (!passwordAuthorizedSite) {
    return false;
  }

  const validSite = passwordAuthorizedSite.expirationTime > Date.now();
  console.log("primarypassword-cache", validSite, url, passwordAuthorizedSites);
  return validSite;
}

/**
 * Execute two-step auth dialogs
 * 1. confirmation dialog
 * 2. password prompt
 *
 * @param {object} target
 * @param {string} target.origin contentPrincipal.originNoSuffix
 * @param {string} target.url contentPrincipal.spec
 * @param {string} extensionName
 * @param {object} prefs
 * @param {boolean} prefs.enabledTrustedSites
 * @param {boolean} prefs.enabledPrimarypassword
 * @param {string[]} prefs.nallowedMethodPreset
 * @param {string[]} prefs.dialogDisplayOptionPreset
 * @param {string[]=} prefs.excludedKindsPreset
 * @param {object} authCache
 * @param {string} authCache.cacheKey
 * @param {object[]} authCache.trustedSites credential.trustedSites
 * @param {object[]} authCache.passwordAuthorizedSites credential.passwordAuthorizedSites
 * @param {number} authCache.expirationTimePref
 * @param {object} dialogInfo
 * @param {string} dialogInfo.type "read" | "sign" | "encrypt" | "decrypt" | "custom"
 * @param {object} dialogInfo.evidence
 * @param {string} dialogInfo.caption
 * @param {string} dialogInfo.submission
 * @param {boolean} dialogInfo.enforce
 * @param {object} dialogInfo.embedderElement tab.browser.browsingContext.embedderElement
 * @param {object} dialogInfo.window nativeTab.ownerGlobal
 * @returns {boolean}
 */
async function authWithPassword(
  target,
  extensionName,
  prefs,
  authCache,
  dialogInfo
) {
  const { url, origin } = target;
  const { cacheKey, passwordAuthorizedSites, expirationTimePref } = authCache;
  const { type, evidence, enforce, embedderElement } = dialogInfo;

  // Prepare expiration time.
  const protocolName = cacheKey.split(":")[0];
  let passwordAuthorizedSite = passwordAuthorizedSites.find(site =>
    url.startsWith(site.url)
  );
  if (!passwordAuthorizedSite) {
    passwordAuthorizedSite = {
      url: origin,
      name: extensionName,
      expirationTime: 0,
      permissions: { skippedDialog: prefs.dialogDisplayOptionPreset },
    };
    if (protocolName === "nostr") {
      passwordAuthorizedSite.permissions.excludedKinds =
        prefs.excludedKindsPreset;
    }
    Services.ssi.authCache.update(cacheKey, {
      passwordAuthorizedSites: [passwordAuthorizedSite],
    });
  }
  let _authExpirationTime = passwordAuthorizedSite.expirationTime;

  // Special cases of mandatory authorization.
  // Don't need to update cache, do as it is.
  const _isAuthMandatory = isAuthMandatory(
    url,
    protocolName,
    passwordAuthorizedSites,
    enforce,
    evidence
  );
  if (_isAuthMandatory) {
    _authExpirationTime = 0;
  }

  // Do we have a recent authorization?
  if (Date.now() < _authExpirationTime) {
    return true;
  }

  // Proceed Dialogs

  // Common text among two dialogs
  const systemMessage = DIALOG_SYSTEM_MESSAGE(protocolName)[type];
  const eol = AppConstants.platform === "win" ? "\r\n" : "\n";
  const baseCaption = `${systemMessage}${eol}to ${origin}`;

  // 1. Dispaly confirmation dialog
  const skippedConfirm = passwordAuthorizedSite.permissions.skippedDialog.some(
    method => method === `${type}-passwordOnly`
  );
  if (_isAuthMandatory || !skippedConfirm) {
    const permissionText = `Permission: ${baseCaption}`;
    const result = await lazy.SsiHelper.showConfirmAuthorizationDialog({
      window: dialogInfo.window,
      permission: {
        text: permissionText,
        method: type,
        cacheKey,
      },
      caption: dialogInfo.caption,
      evidence: dialogInfo.evidence,
      submission: dialogInfo.submission,
    });
    // The user has trusted this time, so return true.
    if (
      result.confirmed &&
      ["fullTrust", "methodTrust", "confirmOnly", "passwordOnly"].includes(
        result.settingValue
      )
    ) {
      // Save new setting value
      if (result.settingValue === "confirmOnly") {
        passwordAuthorizedSite.permissions.skippedDialog.push(
          `${type}-${result.settingValue}`
        );
        passwordAuthorizedSite.expirationTime =
          expirationTimePref > 0 ? Date.now() + expirationTimePref : 0;
        Services.ssi.authCache.update(cacheKey, {
          passwordAuthorizedSites: [{ ...passwordAuthorizedSite }],
        });
        // Since it's considered as approval only with the confirmation dialog, we will round it up.
        return true;
      } else if (result.settingValue === "passwordOnly") {
        passwordAuthorizedSite.permissions.skippedDialog.push(
          `${type}-${result.settingValue}`
        );
        Services.ssi.authCache.update(cacheKey, {
          passwordAuthorizedSites: [{ ...passwordAuthorizedSite }],
        });
        // go to primarypassword dialog
      } else {
        // Save new trusted site
        const auth = Services.ssi.authCache.get(cacheKey);
        const idx = auth.trustedSites.findIndex(site => site.url === origin);
        let newVal;
        if (idx >= 0) {
          newVal = { ...auth.trustedSites[idx] };
          newVal.enabled = true;
        } else {
          newVal = {
            url: origin,
            name: extensionName,
            enabled: true,
            permissions: { nallowedMethod: [] },
          };
        }
        if (result.settingValue === "methodTrust") {
          newVal.permissions.nallowedMethod.push(type);
        }
        Services.ssi.authCache.update(cacheKey, {
          trustedSites: [newVal],
        });
        // Since it was trusted, we will round it up.
        return true;
      }
    } else if (!result.confirmed) {
      // The user has canceled, so return false.
      return false;
    }
  }

  // 2. Suggest password prompt
  const skippedPassword = passwordAuthorizedSite.permissions.skippedDialog.some(
    method => method === `${type}-confirmOnly`
  );
  if (!skippedPassword) {
    const isOSAuthEnabled = lazy.SsiHelper.getOSAuthEnabled(
      lazy.SsiHelper.OS_AUTH_FOR_PASSWORDS_PREF
    );
    const isPrimaryPasswordSet = lazy.SsiHelper.isPrimaryPasswordSet;
    // Linux currently only supports Primary Password.
    if (!isOSAuthEnabled && !isPrimaryPasswordSet) {
      lazy.SsiHelper.showAlertPrimaryPasswordDialog(dialogInfo.window);
      return false;
    }

    const messageText = {
      value: `${
        AppConstants.platform === "win" ? "Nightly is trying to " : ""
      }${baseCaption}`,
    };
    const captionText = {
      value: AppConstants.platform === "win" ? "Nightly" : "",
    }; // caption only works on windows.
    if (isOSAuthEnabled) {
      const messageId = MESSAGE_ID + "-" + AppConstants.platform;
    }
    const { isAuthorized, telemetryEvent } = await lazy.SsiHelper.requestReauth(
      embedderElement,
      isOSAuthEnabled,
      _authExpirationTime,
      messageText.value,
      captionText.value
    );

    // Update expiration time if password is newly entered.
    const enteredPassword = [
      "success",
      "success_unsupported_platform",
    ].includes(telemetryEvent.value);
    if (isAuthorized && enteredPassword) {
      passwordAuthorizedSite.expirationTime =
        expirationTimePref > 0 ? Date.now() + expirationTimePref : 0;
      Services.ssi.authCache.update(cacheKey, {
        passwordAuthorizedSites: [{ ...passwordAuthorizedSite }],
      });
    }
    console.log(
      "primarypassword-dialog",
      isAuthorized,
      telemetryEvent,
      origin,
      type,
      Services.ssi.authCache.get(cacheKey).passwordAuthorizedSites
    );
    return isAuthorized;
  }
  return true;
}
/**
 *
 * @param {string} url
 * @param {string} protocolName
 * @param {object[]} passwordAuthorizedSites
 * @param {boolean} enforce
 * @param {object} evidence
 * @returns {boolean}
 */
function isAuthMandatory(
  url,
  protocolName,
  passwordAuthorizedSites,
  enforce,
  evidence
) {
  // NOTE(ssb): exclude it for now to avoid duplication with tab apps. We need to reconsider here to cover the use case of extension only.
  if (url.startsWith("moz-extension:")) {
    return false;
  }
  const passwordAuthorizedSite = passwordAuthorizedSites.find(site =>
    url.startsWith(site.url)
  );
  if (!passwordAuthorizedSite) {
    return false;
  }

  if (enforce) {
    return true;
  }
  if (protocolName === "nostr") {
    const hasKind =
      evidence && evidence.kind && typeof evidence.kind === "number";
    const hasExcludedKinds =
      passwordAuthorizedSite &&
      passwordAuthorizedSite.permissions &&
      passwordAuthorizedSite.permissions.excludedKinds &&
      Array.isArray(passwordAuthorizedSite.permissions.excludedKinds);
    if (
      hasKind &&
      hasExcludedKinds &&
      passwordAuthorizedSite.permissions.excludedKinds.includes(
        evidence.kind.toString()
      )
    ) {
      return true;
    }
  }

  return false;
}
