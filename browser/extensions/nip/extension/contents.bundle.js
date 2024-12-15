/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 45:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Mediator for the extension to relay between the web apps and the background
// refs: https://github.com/getAlby/lightning-browser-extension/blob/master/src/extension/content-script/nostr.js
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.init = void 0;
const logger_1 = __webpack_require__(874);
const shouldInject_1 = __webpack_require__(880);
async function init() {
    if (!(0, shouldInject_1.shouldInject)()) {
        return;
    }
    // The message listener to listen to background calls
    // After, emit event to return the response to the inpages.
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        (0, logger_1.log)("content-script onMessage", request);
        // forward account changed messaged to inpage script
        if (request.action === "nostr/builtinNip07Init" ||
            request.action === "nostr/builtinNip07Changed") {
            window.postMessage({
                id: "native",
                application: "nip",
                data: {
                    action: request.action.replace("nostr/", ""),
                    data: request.args,
                },
                scope: "nostr",
            }, window.location.origin);
        }
    });
}
exports.init = init;


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


/***/ }),

/***/ 880:
/***/ ((__unused_webpack_module, exports) => {


// ref: https://github.com/joule-labs/joule-extension/blob/develop/src/content_script/shouldInject.ts
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.shouldInject = void 0;
// Checks the doctype of the current document if it exists
function doctypeCheck() {
    if (window && window.document && window.document.doctype) {
        return window.document.doctype.name === "html";
    }
    return true;
}
// Returns whether or not the extension (suffix) of the current document is prohibited
function suffixCheck() {
    const prohibitedTypes = [/\.xml$/, /\.pdf$/];
    const currentUrl = window.location.pathname;
    for (const type of prohibitedTypes) {
        if (type.test(currentUrl)) {
            return false;
        }
    }
    return true;
}
// Checks the documentElement of the current document
function documentElementCheck() {
    // todo: correct?
    if (!document || !document.documentElement) {
        return false;
    }
    const docNode = document.documentElement.nodeName;
    if (docNode) {
        return docNode.toLowerCase() === "html";
    }
    return true;
}
function shouldInject() {
    const isHTML = doctypeCheck();
    const noProhibitedType = suffixCheck();
    const hasDocumentElement = documentElementCheck();
    return isHTML && noProhibitedType && hasDocumentElement;
}
exports.shouldInject = shouldInject;


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
const nostr_1 = __webpack_require__(45);
(0, logger_1.log)("content-script working", browser.runtime.getURL("inpages.bundle.js"));
function loadInpageScript(url) {
    try {
        if (!document)
            throw new Error("No document");
        const container = document.head || document.documentElement;
        if (!container)
            throw new Error("No container element");
        const scriptEl = document.createElement("script");
        scriptEl.setAttribute("async", "false");
        scriptEl.setAttribute("type", "text/javascript");
        scriptEl.setAttribute("src", url);
        container.appendChild(scriptEl);
    }
    catch (err) {
        console.error("injection failed", err);
    }
}
loadInpageScript(browser.runtime.getURL("inpages.bundle.js"));
(0, nostr_1.init)();

})();

/******/ })()
;