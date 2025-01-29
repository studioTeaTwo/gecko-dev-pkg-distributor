/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 368:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.nostr = exports.init = void 0;
function init() {
    window.addEventListener("message", event => {
        if (event.source !== window || event.data.id !== "native") {
            return;
        }
        const action = event.data.data.action;
        const data = event.data.data.data;
        if (event.data.scope === "nostr") {
            window.ssi.nostr.dispatchEvent(new CustomEvent(action, {
                detail: data,
                bubbles: false,
                composed: true,
            }));
        }
    });
}
exports.init = init;
exports.nostr = Object.freeze({
    generate(option) {
        return Promise.resolve("Not implemented");
    },
    async getPublicKey(option) {
        return callBackground("nostr/getPublicKey", option);
    },
    sign(message, option) {
        return callBackground(`nostr/${option.type}`, {
            message,
            ...option,
        });
    },
    decrypt(ciphertext, option) {
        return Promise.resolve("Not implemented");
    },
    // NOTE(ssb): A experimental feature for providers. Currently not freeze nor seal.
    // ref: https://github.com/nostr-protocol/nips/pull/1174
    messageBoard: {},
    _proxy: new EventTarget(),
    dispatchEvent(event) {
        return exports.nostr._proxy.dispatchEvent(event);
    },
    addEventListener(type, callback, options) {
        return exports.nostr._proxy.addEventListener(type, callback, options);
    },
    removeEventListener(type, callback, options) {
        return exports.nostr._proxy.removeEventListener(type, callback, options);
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
const windowSSI = {
    _scope: "ssi",
    _proxy: new EventTarget(),
    nostr: nostr_1.nostr,
    dispatchEvent(event) {
        return windowSSI._proxy.dispatchEvent(event);
    },
    addEventListener(type, callback, options) {
        return windowSSI._proxy.addEventListener(type, callback, options);
    },
    removeEventListener(type, callback, options) {
        return windowSSI._proxy.removeEventListener(type, callback, options);
    },
};
if ((0, shouldInject_1.shouldInject)()) {
    // It envisions browser-native API, so the object is persisted.
    window.ssi = Object.freeze(windowSSI);
    Object.defineProperty(window, "ssi", {
        writable: false,
        configurable: false,
    });
    (0, nostr_1.init)();
}

})();

/******/ })()
;