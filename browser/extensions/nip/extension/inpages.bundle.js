/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

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
const shouldInject_1 = __webpack_require__(880);
const logger_1 = __webpack_require__(874);
(0, logger_1.log)("inpage-script working");
if ((0, shouldInject_1.shouldInject)()) {
    // The message listener to listen to content calls
    // After, emit event to return the reponse to the web apps.
    window.addEventListener("message", event => {
        if (event.source !== window || event.data.id !== "native") {
            return;
        }
        const action = event.data.data.action;
        const data = event.data.data.data;
        if (event.data.scope === "nostr") {
            if (action === "builtinNip07Init" || action === "builtinNip07Changed") {
                if (data) {
                    // Inject Class here for gaining permission.
                    // TODO(ssb): Move to contents script
                    window.nostr._proxy = new EventTarget();
                    window.nostr.dispatchEvent = (...args) => {
                        return window.nostr._proxy.dispatchEvent(...args);
                    };
                    window.nostr.addEventListener = (...args) => {
                        return window.nostr._proxy.addEventListener(...args);
                    };
                    window.nostr.removeEventListener = (...args) => {
                        return window.nostr._proxy.removeEventListener(...args);
                    };
                    window.ssi.nostr.addEventListener("accountChanged", accountChangedHandler);
                }
                else {
                    // Dispose
                    window.ssi.nostr.removeEventListener("accountChanged", accountChangedHandler);
                }
            }
        }
    });
}
const accountChangedHandler = (event) => {
    const newPublicKey = event.detail;
    (0, logger_1.log)(`inpage accountChanged emit`, event);
    window.nostr.dispatchEvent(new CustomEvent("accountChanged", {
        detail: newPublicKey,
        bubbles: true,
    }));
};

})();

/******/ })()
;