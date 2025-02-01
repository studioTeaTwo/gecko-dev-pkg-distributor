/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 368:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.nostr = void 0;
exports.nostr = Object.create(null, {
    generate: {
        value: function (option) {
            return Promise.resolve("Not implemented");
        },
        enumerable: true,
    },
    getPublicKey: {
        value: async function (option) {
            return callBackground("nostr/getPublicKey", option);
        },
        enumerable: true,
    },
    sign: {
        value: function (message, option) {
            return callBackground(`nostr/${option.type}`, {
                message,
                ...option,
            });
        },
        enumerable: true,
    },
    decrypt: {
        value: function (ciphertext, option) {
            return Promise.resolve("Not implemented");
        },
        enumerable: true,
    },
    // NOTE(ssb): A experimental feature for providers. Currently not freeze nor seal.
    // ref: https://github.com/nostr-protocol/nips/pull/1174
    messageBoard: {
        value: {},
        enumerable: true,
        writable: true,
    },
    _proxy: {
        value: new EventTarget(),
        enumerable: true,
    },
    // TODO(ssb): Ideally should conceal
    _invoke: {
        value: function (action, data) {
            exports.nostr._proxy.dispatchEvent(new CustomEvent(action, {
                detail: data,
                bubbles: false,
                composed: true,
            }));
        },
        enumerable: true,
    },
    addEventListener: {
        value: function (type, callback, options) {
            return exports.nostr._proxy.addEventListener(type, callback, options);
        },
        enumerable: true,
    },
    removeEventListener: {
        value: function (type, callback, options) {
            return exports.nostr._proxy.removeEventListener(type, callback, options);
        },
        enumerable: true,
    },
});


/***/ }),

/***/ 874:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.log = void 0;
// NOTE(ssb): avoid placing on inpages and contents exposed in tabs as much as possible
// TODO(ssb): review those on inpages and contents
function log(...args) {
    console.info("ssb:", args);
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
const nostr_1 = __webpack_require__(368);
(0, logger_1.log)("inpage-script working");
const windowSSI = Object.create(null, {
    _scope: {
        value: "ssi",
        enumerable: true,
    },
    _proxy: {
        value: new EventTarget(),
        enumerable: true,
    },
    nostr: {
        value: nostr_1.nostr,
        enumerable: true,
    },
    // TODO(ssb): Ideally should conceal
    _invoke: {
        value: function (event) {
            return windowSSI._proxy.dispatchEvent(event);
        },
        enumerable: true,
    },
    addEventListener: {
        value: function (type, callback, options) {
            return windowSSI._proxy.addEventListener(type, callback, options);
        },
        enumerable: true,
    },
    removeEventListener: {
        value: function (type, callback, options) {
            return windowSSI._proxy.removeEventListener(type, callback, options);
        },
        enumerable: true,
    },
});
if ((0, shouldInject_1.shouldInject)()) {
    // It envisions browser-native API, so the object is persisted.
    window.ssi = windowSSI;
    Object.defineProperty(window, "ssi", {
        writable: false,
        configurable: false,
    });
}

})();

/******/ })()
;