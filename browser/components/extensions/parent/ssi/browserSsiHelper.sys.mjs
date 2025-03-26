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

// below is from browser/components/selfsovereignindividual/src/components/nostr/contants.ts
const SpecialCards = ["*", "<all_urls>"];

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
        "primarypassword.toApps.enabled": Services.prefs.getBoolPref(
          `selfsovereignindividual.${protocolName}.primarypassword.toApps.enabled`
        ),
        "primarypassword.toApps.expiryTime": Services.prefs.getIntPref(
          `selfsovereignindividual.${protocolName}.primarypassword.toApps.expiryTime`
        ),
      };
      if (protocolName === "nostr") {
        prefs.excludedKindsPreset = Services.prefs.getStringPref(
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
   * @param {TabTracker} tabTracker
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
  async authorize(context, tabTracker, credential, dialogInfo, onlyExtension) {
    // Prepare stuff
    const { protocolName, credentialName } = credential;
    const { type, evidence, caption, submission, enforce } = dialogInfo;
    const { site, extension, browsingContext, window } = getOrigin(
      context,
      tabTracker
    );
    const internalPrefs = browserSsiHelper.getInternalPrefs(protocolName);
    console.log(
      "authorize",
      type,
      site.url,
      site.isSystemPrincipal,
      extension.url
    );

    await openPopup(window, extension.name);

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
      enabledPrimarypassword: internalPrefs["primarypassword.toApps.enabled"],
    };
    if (protocolName === "nostr") {
      prefs.excludedKindsPreset = internalPrefs.excludedKindsPreset
        ? internalPrefs.excludedKindsPreset.split(",")
        : [];
    }
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
 *
 * @param {object} target
 * @param {string} target.origin contentPrincipal.originNoSuffix
 * @param {string} target.url contentPrincipal.spec
 * @param {string} extensionName
 * @param {object} prefs
 * @param {boolean} prefs.enabledTrustedSites
 * @param {boolean} prefs.enabledPrimarypassword
 * @param {string[]=} prefs.excludedKindsPreset
 * @param {object} authCache
 * @param {string} authCache.cacheKey
 * @param {object[]} authCache.trustedSites credential.trustedSites
 * @param {object[]} authCache.passwordAuthorizedSites credential.passwordAuthorizedSites
 * @param {number} authCache.expiryTimePref
 * @param {object} dialogInfo
 * @param {string} dialogInfo.system DIALOG_SYSTEM_MESSAGE
 * @param {object} dialogInfo.evidence
 * @param {string} dialogInfo.caption
 * @param {string} dialogInfo.submission
 * @param {boolean} dialogInfo.enforce
 * @param {object} dialogInfo.embedderElement tab.browser.browsingContext.embedderElement
 * @returns {Promise<boolean>}
 */
async function execAuth(target, extensionName, prefs, authCache, dialogInfo) {
  const { url } = target;
  const { enabledTrustedSites, enabledPrimarypassword } = prefs;
  const { cacheKey, trustedSites, passwordAuthorizedSites } = authCache;
  const { evidence, enforce } = dialogInfo;

  const protocolName = cacheKey.split(":")[0];
  const _isAuthMandatory = isAuthMandatory(
    url,
    protocolName,
    passwordAuthorizedSites,
    enforce,
    evidence
  );

  if (enabledTrustedSites && !_isAuthMandatory) {
    const trusted = isTrusted(url, trustedSites);
    if (trusted) {
      return true;
    }
    // go to primarypassword cache
  }

  if (enabledPrimarypassword && !_isAuthMandatory) {
    const validCache = isPasswordAuthorized(target, authCache);
    if (validCache) {
      return true;
    }
    // go to primarypassword dialog
  }

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

function getOrigin(context, tabTracker) {
  // TODO(ssb): Background exec check
  const activeTabId = tabTracker.getId(tabTracker.activeTab);

  // FIXME(ssb): Set more robust tabId than activeTab by finding a way to identify the caller. For
  // example, when pending password dialog and when only extension is executing independently.
  const { browser, window } = context.extension.tabManager.get(activeTabId);

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
 * @param {object[]} trustedSites
 * @returns {boolean}
 */
function isTrusted(url, trustedSites) {
  const trusted = trustedSites.some(site => {
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
  console.log("trustedSites", trusted, url, trustedSites);
  return trusted;
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
 * @param {number} authCache.expiryTimePref
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

  const validSite = passwordAuthorizedSite.expiryTime > Date.now();
  console.log("primarypassword-cache", validSite, url, passwordAuthorizedSites);
  return validSite;
}

/**
 *
 * @param {object} target
 * @param {string} target.origin contentPrincipal.originNoSuffix
 * @param {string} target.url contentPrincipal.spec
 * @param {string} extensionName
 * @param {object} prefs
 * @param {boolean} prefs.enabledTrustedSites
 * @param {boolean} prefs.enabledPrimarypassword
 * @param {string[]=} prefs.excludedKindsPreset
 * @param {object} authCache
 * @param {string} authCache.cacheKey
 * @param {object[]} authCache.trustedSites credential.trustedSites
 * @param {object[]} authCache.passwordAuthorizedSites credential.passwordAuthorizedSites
 * @param {number} authCache.expiryTimePref
 * @param {object} dialogInfo
 * @param {string} dialogInfo.system DIALOG_SYSTEM_MESSAGE
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
  const { cacheKey, passwordAuthorizedSites, expiryTimePref } = authCache;
  const { system, evidence, caption, submission, enforce, embedderElement } =
    dialogInfo;

  // Build Dialog
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

  // Prepare expiration time.
  const protocolName = cacheKey.split(":")[0];
  let passwordAuthorizedSite = passwordAuthorizedSites.find(site =>
    url.startsWith(site.url)
  );
  if (!passwordAuthorizedSite) {
    passwordAuthorizedSite = {
      url: origin,
      name: extensionName,
      expiryTime: 0,
      permissions: {},
    };
    if (protocolName === "nostr") {
      passwordAuthorizedSite.permissions.excludedKinds =
        prefs.excludedKindsPreset;
    }
    Services.ssi.authCache.update(cacheKey, {
      passwordAuthorizedSites: [passwordAuthorizedSite],
    });
  }
  let _authExpirationTime = passwordAuthorizedSite.expiryTime;

  // Special cases of mandatory authorization.
  // Don't need to update cache, do as it is.
  if (
    isAuthMandatory(
      url,
      protocolName,
      passwordAuthorizedSites,
      enforce,
      evidence
    )
  ) {
    _authExpirationTime = 0;
  }

  // Suggest password prompt
  const { isAuthorized, telemetryEvent } = await lazy.SsiHelper.requestReauth(
    embedderElement,
    isOSAuthEnabled,
    _authExpirationTime,
    messageText.value,
    captionText.value
  );

  // Update expiry time if password is newly entered.
  const enteredPassword = ["success", "success_unsupported_platform"].includes(
    telemetryEvent.value
  );
  if (isAuthorized && enteredPassword) {
    const expiryTime = expiryTimePref > 0 ? Date.now() + expiryTimePref : 0;
    passwordAuthorizedSite.expiryTime = expiryTime;
    Services.ssi.authCache.update(cacheKey, {
      passwordAuthorizedSites: [{ ...passwordAuthorizedSite }],
    });
  }
  console.log(
    "primarypassword-dialog",
    isAuthorized,
    telemetryEvent,
    origin,
    system,
    Services.ssi.authCache.get(cacheKey).passwordAuthorizedSites
  );
  return isAuthorized;
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
async function openPopup(window, extensionName) {
  console.dir("panel", window);
  // const template = `
  //   <div>
  //     <div id="dialogStack" hidden="true"/>
  //     <div id="dialogTemplate" class="dialogOverlay" align="center" topmost="true" pack="center" hidden="true">
  //       <div class="dialogBox"
  //             pack="end"
  //             role="dialog"
  //             aria-labelledby="dialogTitle">
  //         <div class="dialogTitleBar" align="center">
  //           <label class="dialogTitle" flex="1"/>
  //           <button class="dialogClose close-icon"
  //                   data-l10n-id="close-button"/>
  //         </div>
  //         <browser class="dialogFrame"
  //                 autoscroll="false"
  //                 disablehistory="true"/>
  //       </div>
  //     </div>
  //   </div>
  // `;
  // const parser = new DOMParser();
  // // parser.forceEnableXULXBL();
  // const parsed = parser.parseFromString(template, "text/html");
  // console.dir(parsed);
  // // const newNode = window.document.importNode(template, true);
  // window.document.body.insertAdjacentHTML("afterend", template);
  // const gSubDialog = new lazy.SubDialogManager({
  //   dialogStack: window.document.getElementById("dialogStack"),
  //   dialogTemplate: window.document.getElementById("dialogTemplate"),
  //   dialogOptions: {
  //     styleSheets: [
  //       "chrome://browser/skin/preferences/dialog.css",
  //       "chrome://browser/skin/preferences/preferences.css",
  //     ],
  //     // resizeCallback: async ({ title, frame }) => {
  //     //   // Search within main document and highlight matched keyword.
  //     //   await gSearchResultsPane.searchWithinNode(
  //     //     title,
  //     //     gSearchResultsPane.query
  //     //   );

  //     //   // Search within sub-dialog document and highlight matched keyword.
  //     //   await gSearchResultsPane.searchWithinNode(
  //     //     frame.contentDocument.firstElementChild,
  //     //     gSearchResultsPane.query
  //     //   );

  //     //   // Creating tooltips for all the instances found
  //     //   for (let node of gSearchResultsPane.listSearchTooltips) {
  //     //     if (!node.tooltipNode) {
  //     //       gSearchResultsPane.createSearchTooltip(
  //     //         node,
  //     //         gSearchResultsPane.query
  //     //       );
  //     //     }
  //     //   }
  //     // },
  //   },
  // });
  // await gSubDialog.open(
  //   "chrome://browser/content/preferences/dialogs/addEngine.xhtml",
  //   { features: "resizable=no, modal=yes" }
  // );
  let div = window.document.querySelector(`#${extensionName}-popup`);
  if (!div) {
    div = window.document.createElement("div");
    div.id = `${extensionName}-popup`;
    div.classList.add(`browser-ssi-popup`);
    div.innerHTML = `
      <style>
        .browser-ssi-popup {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);

          background-color: white;
          max-width: 500px;
        }
        .header {
          color: red;
        }
      </style>
      <div class="header">
        Nightly
      </div>
      <div class="content">
        test
      </div>
      <div class="bottom">
        <button id="button-next" oncommand="console.log('clicked!')">next</button>
        bottom
      </div>
    `;
    window.document.body.appendChild(div);
  }
}
