/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 684:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.init = void 0;
const logger_1 = __webpack_require__(874);
const state_1 = __webpack_require__(975);
// NOTE(ssb): Currently firefox does not support externally_connectable.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable
const SafeProtocols = ["http", "https", "moz-extension"];
const MapBetweenPrefAndState = {
    enabled: "enabled",
    usedBuiltinNip07: "builtinNip07.enabled",
};
async function init() {
    (0, logger_1.log)("experimental-api start...");
    // Get setting values from the prefs.
    const results = {
        ...(await browser.ssi.nostr.getPrefs()),
        ...(await browser.builtinNip.getPrefs()),
    };
    const prefs = {};
    Object.entries(MapBetweenPrefAndState).map(([_state, _pref]) => {
        prefs[_state] = results[_pref];
    });
    state_1.state.nostr = {
        ...state_1.state.nostr,
        prefs,
    };
    (0, logger_1.log)("nostr inited in background", state_1.state.nostr);
}
exports.init = init;
// initial action while the webapps are loading
browser.webNavigation.onDOMContentLoaded.addListener(async (detail) => {
    // It's only injecting functions and doesn't need trusted.
    const injecting = state_1.state.nostr.prefs.enabled &&
        state_1.state.nostr.prefs.usedBuiltinNip07 &&
        supported(detail.url);
    (0, logger_1.log)("nostr init to tab", injecting);
    // Notify init to the contents
    const tab = await browser.tabs.get(detail.tabId);
    (0, logger_1.log)("send to tab", tab);
    sendTab(tab, "nostr/builtinNip07Init", injecting);
}, { url: [{ schemes: SafeProtocols }] });
const onPrefChangedCallback = async (prefKey) => {
    const stateName = Object.entries(MapBetweenPrefAndState)
        .filter(([_state, _pref]) => _pref === prefKey)
        .map(([_state, _pref]) => _state)[0];
    const newVal = !state_1.state.nostr.prefs[stateName];
    state_1.state.nostr.prefs[stateName] = newVal;
    (0, logger_1.log)("pref changed!", prefKey, newVal, state_1.state.nostr);
    // Send the message to the contents
    if (["enabled", "builtinNip07.enabled"].includes(prefKey)) {
        const tabs = await browser.tabs.query({
            status: "complete",
            discarded: false,
        });
        for (const tab of tabs) {
            (0, logger_1.log)("send to tab", tab);
            sendTab(tab, "nostr/builtinNip07Changed", state_1.state.nostr.prefs[stateName]);
        }
    }
};
browser.ssi.nostr.onPrefEnabledChanged.addListener(onPrefChangedCallback);
browser.builtinNip.onPrefBuiltinNip07Changed.addListener(onPrefChangedCallback);
/**
 * Internal Utils
 *
 */
async function sendTab(tab, action, data) {
    if (!supported(tab.url)) {
        // browser origin event is not sent anything
        return;
    }
    browser.tabs
        .sendMessage(tab.id, {
        action,
        args: data,
    })
        .catch();
}
function supported(tabUrl) {
    return SafeProtocols.some(protocol => tabUrl.startsWith(protocol));
}


/***/ }),

/***/ 975:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.state = void 0;
exports.state = {
    nostr: {
        prefs: {
            enabled: false,
            usedBuiltinNip07: false,
        },
    },
};


/***/ }),

/***/ 874:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.log = void 0;
// NOTE(ssb): avoid placing on inpages and contents exposed in tabs as much as possible
// TODO(ssb): review those on inpages and contents
function log(...args) {
    console.info("nip:", args);
}
exports.log = log;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;
var __webpack_unused_export__;

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
__webpack_unused_export__ = ({ value: true });
/* eslint-env webextensions */
const logger_1 = __webpack_require__(874);
const nostr_1 = __webpack_require__(684);
(0, logger_1.log)("background-script working");
(0, nostr_1.init)();

})();

/******/ })()
;