/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 684:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const state_1 = __webpack_require__(975);
// The message listener to listen to experimental-apis calls
// After, those calls get passed on to the content scripts.
const callback = async (newGuid) => {
    console.log(`Something happened: ${newGuid}`);
    const credentials = await browser.addonsSelfsovereignidentity.searchCredentialsAsync("nostr", "nsec", true, newGuid);
    console.log("primary changed!", newGuid, credentials);
    state_1.state.nostr = credentials[0].identifier || "";
    // Send the message to the contents
    browser.tabs
        .query({ status: "complete", discarded: false })
        .then((tabs) => {
        console.log("send to tab: ", tabs);
        for (const tab of tabs) {
            console.log("send to tab: ", tab);
            if (tab.url.startsWith("http")) {
                browser.tabs
                    .sendMessage(tab.id, {
                    action: "nostr/accountChanged",
                    args: { npub: state_1.state.nostr },
                })
                    .catch();
            }
        }
    });
};
browser.addonsSelfsovereignidentity.onPrimaryChange.addListener(callback, "nostr");
async function init() {
    console.log("experimental-api start...");
    const credentials = await browser.addonsSelfsovereignidentity.searchCredentialsAsync("nostr", "nsec", true, "");
    console.log("background init!", credentials);
    state_1.state.nostr = credentials[0].identifier || "";
}
init();


/***/ }),

/***/ 975:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.state = void 0;
exports.state = {
    nostr: "", // pubkey
};


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
__webpack_require__(684);
const state_1 = __webpack_require__(975);
console.info("background-script working!");
// initial action to enable ssb
browser.webNavigation.onCompleted.addListener(() => { });
// The message listener to listen to content calls
// After, return the response to the contents.
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message, sender);
    if (message.action === "nostr/getPublicKey") {
        sendResponse({ data: state_1.state.nostr });
    }
});

})();

/******/ })()
;