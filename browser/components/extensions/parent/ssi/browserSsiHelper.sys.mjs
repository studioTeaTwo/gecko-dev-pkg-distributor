/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Internal Helper for browser.ssi.
 * Validation for user input params should be already done by the calling browser.ssi, except for eventListener.
 */

/**
 * @typedef {object} Target
 * @property {string} origin contentPrincipal.originNoSuffix
 * @property {string} url contentPrincipal.spec
 */

/**
 * @typedef {string} MethodType "read" | "sign" | "encrypt" | "decrypt" | "custom"
 */

/**
 * @typedef {object} Prefs
 * @property {boolean} enabledTrustedSites
 * @property {boolean} enabledDialogicAuthorization
 * @property {string[]} nallowedMethodPreset
 * @property {string[]} dialogDisplayOptionPreset
 * @property {number} expirationTime
 * @property {string[]=} excludedKindsPreset nostr only
 */

/**
 * @typedef {object} Credential
 * @property {string} protocolName
 * @property {string} credentialName
 */

/**
 * @typedef {object} AuthCache
 * @property {string} cacheKey
 * @property {object[]} trustedSites credential.trustedSites
 * @property {object[]} dialogicAuthorizedSites credential.dialogicAuthorizedSites
 */

/**
 * @typedef {object} DialogInfo
 * @property {MethodType} type
 * @property {object} evidence NostrEvent etc.
 * @property {string} caption
 * @property {string} submission
 * @property {boolean} enforce
 * @property {object=} embedderElement tab.browser.browsingContext.embedderElement
 * @property {object=} window nativeTab.ownerGlobal
 */

/* globals Services */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

let lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
});

const CREDENTIAL_MAP = {
  bitcoin: ["bip39"],
  nostr: ["nsec"],
};
const PROTOCOL_NAMES = Object.keys(CREDENTIAL_MAP);
const CREDENTIAL_NAMES = Object.values(CREDENTIAL_MAP).flat();
const capitalize = function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
const DIALOG_SYSTEM_MESSAGE = protocolName => ({
  generate: `generate ${capitalize(protocolName)} key`,
  read: `read ${capitalize(protocolName)} public key`,
  sign: `sign with ${capitalize(protocolName)}`,
  encrypt: `encrypt with ${capitalize(protocolName)}`,
  decrypt: `decrypt with ${capitalize(protocolName)}`,
  custom: "get your authorization",
});
const MESSAGE_ID = "builtinapi-ssi-access-authlocked-os-auth-dialog-message";

// below is from browser/components/selfsovereignindividual/src/components/shared/constants.ts
const SpecialCards = ["*", "<all_urls>"];

export const browserSsiHelper = {
  CREDENTIAL_MAP,
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

    const obsTopic = `SSI_PRIMARY_KEY_CHANGED_IN_${protocolName.toUpperCase()}`;
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
    try {
      // Check permission
      const enabled = Services.prefs.getBoolPref(
        `selfsovereignindividual.${protocolName}.enabled`
      );
      if (!enabled) {
        return null;
      }

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
  validateHierarchy(hierarchy) {
    if (hierarchy == null) {
      return false;
    }

    // TODO(ssb)

    return true;
  },
  /**
   *
   * @param {object} context
   * @param {number} tabId
   * @returns {object}
   */
  getOrigin(context, tabId) {
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
  },
  /**
   * Executes authorization.
   * This applies to both the web extension that called it directly and the tab app at the top of the call stack.
   *
   * @param {Context} context
   * @param {number} tabId
   * @param {Credential} credential
   * @param {DialogInfo} dialogInfo
   * @param {boolean} onlyExtension
   * @returns {Promise<boolean>}
   */
  async authorize(context, tabId, credential, dialogInfo, onlyExtension) {
    // Prepare stuff
    const { protocolName, credentialName } = credential;
    const { type, evidence, caption, submission, enforce } = dialogInfo;
    const { site, extension, browsingContext, window } =
      browserSsiHelper.getOrigin(context, tabId);
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
      // TODO(ssb): Consider whether this validation is necessary
      // return false;
    }
    if ((!onlyExtension && !site.origin) || !extension.origin) {
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
      enabledDialogicAuthorization:
        internalPrefs["primarypassword.toApps.enabled"],
      dialogDisplayOptionPreset: internalPrefs[
        "primarypassword.toApps.dialogDisplayOptionPreset"
      ]
        ? internalPrefs[
            "primarypassword.toApps.dialogDisplayOptionPreset"
          ].split(",")
        : [],
      expirationTime: internalPrefs["primarypassword.toApps.expirationTime"],
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
      dialogicAuthorizedSites: auth ? auth.dialogicAuthorizedSites : [],
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
 * 1. Registered in Trusted Sites? - on background
 * 2. Has the dialogic authorization not yet expired? - on background
 * 3. Did the user interactively consent? - on dialog
 *
 * @param {Target} target
 * @param {string} extensionName
 * @param {Prefs} prefs
 * @param {AuthCache} authCache
 * @param {DialogInfo} dialogInfo
 * @returns {Promise<boolean>}
 */
async function execAuth(target, extensionName, prefs, authCache, dialogInfo) {
  const { url } = target;
  const { enabledTrustedSites, enabledDialogicAuthorization } = prefs;
  const { cacheKey, trustedSites, dialogicAuthorizedSites } = authCache;
  const { type } = dialogInfo;

  const protocolName = cacheKey.split(":")[0];
  const _isAuthMandatory = isAuthMandatory(
    url,
    protocolName,
    dialogicAuthorizedSites,
    dialogInfo
  );

  // 1. Registered in Trusted Site? - on background
  if (enabledTrustedSites && !_isAuthMandatory) {
    const trusted = isTrusted(url, type, trustedSites);
    console.log("trustedSites", trusted, url, trustedSites);
    if (trusted) {
      return true;
    }
    // go to password cache
  }

  // 2. Has the dialogic authorization not yet expired? - on background
  if (enabledDialogicAuthorization && !_isAuthMandatory) {
    const validCache = isDialogicAuthorized(target, type, authCache);
    if (validCache) {
      return true;
    }
    // go to password dialog
  }

  // 3. Did the user interactively consent? - on dialog
  if (enabledDialogicAuthorization) {
    const isAuthorized = await authByDialogs(
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
 * @param {string} url
 * @param {MethodType} type
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

  // Is this method-limit trusted?
  const trusted = found.permissions.nallowedMethod.includes(type);
  if (trusted) {
    return true;
  }

  // It's full trust, so return true. Note that it's lower priority than method-limit.
  if (found.permissions.nallowedMethod.length === 0) {
    return true;
  }

  return false;
}

/**
 *
 * @param {Target} target
 * @param {MethodType} type
 * @param {AuthCache} authCache
 * @returns {boolean}
 */
function isDialogicAuthorized(target, type, authCache) {
  const { url } = target;
  const { dialogicAuthorizedSites } = authCache;

  let dialogicAuthorizedSite = dialogicAuthorizedSites.find(site =>
    url.startsWith(site.url)
  );

  if (!dialogicAuthorizedSite) {
    return false;
  }

  // This is lower priority than `skippedDialog`, so it differenciate _isAuthMandatory.
  const authorizedEveryTime =
    dialogicAuthorizedSite.permissions.everyTimeAuthorizedMethods.includes(
      type
    );
  if (authorizedEveryTime) {
    return false;
  }

  const notExpired = dialogicAuthorizedSite.expirationTime > Date.now();
  console.log("dialogic-cache", notExpired, url, dialogicAuthorizedSites);
  return notExpired;
}

/**
 * Execute two-step auth dialogs
 * 1. confirmation dialog
 * 2. password prompt
 *
 * @param {Target} target
 * @param {string} extensionName
 * @param {Prefs} prefs
 * @param {AuthCache} authCache
 * @param {DialogInfo} dialogInfo
 * @returns {boolean}
 */
async function authByDialogs(
  target,
  extensionName,
  prefs,
  authCache,
  dialogInfo
) {
  const { url, origin } = target;
  const { cacheKey, trustedSites, dialogicAuthorizedSites } = authCache;
  const { type, embedderElement } = dialogInfo;

  // Prepare expiration time.
  const protocolName = cacheKey.split(":")[0];
  let dialogicAuthorizedSite = dialogicAuthorizedSites.find(site =>
    url.startsWith(site.url)
  );
  if (!dialogicAuthorizedSite) {
    dialogicAuthorizedSite = {
      url: origin,
      name: extensionName,
      expirationTime: 0,
      permissions: {
        everyTimeAuthorizedMethods: [],
        skippedDialog: prefs.dialogDisplayOptionPreset,
      },
    };
    if (protocolName === "nostr") {
      dialogicAuthorizedSite.permissions.excludedKinds =
        prefs.excludedKindsPreset;
    }
    await Services.ssi.authCache.update(cacheKey, {
      dialogicAuthorizedSites: [{ ...dialogicAuthorizedSite }],
    });
  }
  let _authExpirationTime = dialogicAuthorizedSite.expirationTime;

  // Special cases of mandatory authorization.
  // Don't need to update cache, do as it is.
  const _isAuthMandatory = isAuthMandatory(
    url,
    protocolName,
    dialogicAuthorizedSites,
    dialogInfo
  );
  // This is lower priority than `skippedDialog`, so it differenciate _isAuthMandatory.
  const authorizedEveryTime =
    dialogicAuthorizedSite.permissions.everyTimeAuthorizedMethods.includes(
      type
    );
  if (_isAuthMandatory || authorizedEveryTime) {
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
  const skippedConfirm =
    dialogicAuthorizedSite.permissions.skippedDialog.includes(
      `${type}-passwordOnly`
    );
  if (_isAuthMandatory || !skippedConfirm) {
    const permissionText = `Permission: ${baseCaption}`;
    const result = await lazy.SsiHelper.showConfirmAuthorizationDialog({
      window: dialogInfo.window,
      permission: {
        text: permissionText,
        method: type,
        expirationTime: prefs.expirationTime,
        enforce: dialogInfo.enforce,
      },
      description: {
        caption: dialogInfo.caption,
        evidence: dialogInfo.evidence,
        submission: dialogInfo.submission,
      },
      previousSelectionOnConfirm:
        dialogicAuthorizedSite.permissions.previousSelectionOnConfirm,
    });
    // Update settings except `result.settingValue = "noop"`. "noop" is correspond with !result.confirmed.
    if (result.confirmed) {
      // Save new setting value
      dialogicAuthorizedSite.permissions.previousSelectionOnConfirm =
        result.settingValue;
      await Services.ssi.authCache.update(cacheKey, {
        dialogicAuthorizedSites: [{ ...dialogicAuthorizedSite }],
      });

      const skippedPassword =
        !_isAuthMandatory &&
        dialogicAuthorizedSite.permissions.skippedDialog.includes(
          `${type}-confirmOnly`
        );
      // Update for each individual result
      if (["password", "everytime"].includes(result.settingValue)) {
        if (result.settingValue === "password") {
          dialogicAuthorizedSite.permissions.everyTimeAuthorizedMethods = [];
          await updateExpirationTime(prefs, cacheKey, dialogicAuthorizedSite);
        } else if (
          result.settingValue === "everytime" &&
          !dialogicAuthorizedSite.permissions.everyTimeAuthorizedMethods.includes(
            type
          )
        ) {
          dialogicAuthorizedSite.permissions.everyTimeAuthorizedMethods.push(
            type
          );
          await Services.ssi.authCache.update(cacheKey, {
            dialogicAuthorizedSites: [{ ...dialogicAuthorizedSite }],
          });
        }

        if (skippedPassword) {
          return true;
        }
        // go to password dialog
      } else if (["fullTrust", "methodTrust"].includes(result.settingValue)) {
        // Save new trusted site
        const idx = trustedSites.findIndex(site => site.url === origin);
        let newVal;
        if (idx >= 0) {
          newVal = { ...trustedSites[idx] };
          newVal.enabled = true;
          if (result.settingValue === "fullTrust") {
            newVal.permissions.nallowedMethod = [];
          }
        } else {
          newVal = {
            url: origin,
            name: extensionName,
            enabled: true,
            permissions: { nallowedMethod: [] },
          };
        }
        if (
          result.settingValue === "methodTrust" &&
          !newVal.permissions.nallowedMethod.includes(type)
        ) {
          newVal.permissions.nallowedMethod.push(type);
        }
        await Services.ssi.authCache.update(cacheKey, {
          trustedSites: [newVal],
        });
        // Since it was trusted, we will round it up.
        return true;
      } else {
        // `result.settingValue` is "noop", because `type` is "generate" or `dialogInfo.enforce` is true.
        // eslint-disable-next-line no-lonely-if
        if (type === "generate" && skippedPassword) {
          await updateExpirationTime(prefs, cacheKey, dialogicAuthorizedSite);
          return true;
        }
        // go to password dialog
      }
    } else {
      // The user has canceled, so return false.
      return false;
    }
  }

  // 2. Suggest password prompt
  const skippedPassword =
    dialogicAuthorizedSite.permissions.skippedDialog.includes(
      `${type}-confirmOnly`
    );
  if (_isAuthMandatory || !skippedPassword) {
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
      await updateExpirationTime(prefs, cacheKey, dialogicAuthorizedSite);
    }
    console.log(
      "dialogic-prompt",
      isAuthorized,
      telemetryEvent,
      origin,
      type,
      Services.ssi.authCache.get(cacheKey).dialogicAuthorizedSites
    );
    return isAuthorized;
  }

  // Reaching patterns
  // - when skippedConfirm && skippedPassword are true
  return false;
}
/**
 * Determines whether it's the top priority to display authorization dialogs,
 * even if the trusted sites or the dialogic authorization period is valid.
 *
 * @param {string} url
 * @param {string} protocolName
 * @param {object[]} dialogicAuthorizedSites
 * @param {DialogInfo} dialogInfo
 * @returns {boolean}
 */
function isAuthMandatory(
  url,
  protocolName,
  dialogicAuthorizedSites,
  dialogInfo
) {
  const { evidence, enforce } = dialogInfo;

  // NOTE(ssb): exclude it for now to avoid duplication with tab apps. We need to reconsider here to cover the use case of extension only.
  if (url.startsWith("moz-extension:")) {
    return false;
  }

  const dialogicAuthorizedSite = dialogicAuthorizedSites.find(site =>
    url.startsWith(site.url)
  );

  if (enforce) {
    return true;
  }

  if (protocolName === "nostr") {
    const hasKind =
      evidence && evidence.kind && typeof evidence.kind === "number";
    const hasExcludedKinds =
      dialogicAuthorizedSite &&
      dialogicAuthorizedSite.permissions &&
      dialogicAuthorizedSite.permissions.excludedKinds;
    if (
      hasKind &&
      hasExcludedKinds &&
      dialogicAuthorizedSite.permissions.excludedKinds.includes(
        evidence.kind.toString()
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 *
 * @param {Prefs} prefs
 * @param {string} cacheKey
 * @param {object} dialogicAuthorizedSite
 */
async function updateExpirationTime(prefs, cacheKey, dialogicAuthorizedSite) {
  const shouldUpdate = prefs.expirationTime > 0;
  dialogicAuthorizedSite.expirationTime = shouldUpdate
    ? Date.now() + prefs.expirationTime
    : 0;
  await Services.ssi.authCache.update(cacheKey, {
    dialogicAuthorizedSites: [{ ...dialogicAuthorizedSite }],
  });
}
