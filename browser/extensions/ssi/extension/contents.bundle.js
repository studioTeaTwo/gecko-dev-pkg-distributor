/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 71:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._callRuntime = exports.removeEventListener = exports.addEventListener = exports._invoke = exports.decrypt = exports.signWithCallback = exports.sign = exports.getPublicKeyWithCallback = exports.getPublicKey = exports.generate = void 0;
const custom_type_1 = __webpack_require__(711);
/**
 * Nostr
 */
function generate(option) {
    return window.Promise.resolve("Not implemented");
}
exports.generate = generate;
function getPublicKey(option) {
    return _callRuntime("nostr/getPublicKey", option);
}
exports.getPublicKey = getPublicKey;
function getPublicKeyWithCallback(callback, option) {
    _callRuntime("nostr/getPublicKey", option).then(publicKey => {
        callback(publicKey);
    });
}
exports.getPublicKeyWithCallback = getPublicKeyWithCallback;
function sign(message, option) {
    return _callRuntime(`nostr/${option.type}`, {
        message,
        ...option,
    });
}
exports.sign = sign;
function signWithCallback(message, callback, option) {
    _callRuntime(`nostr/${option.type}`, {
        message,
        ...option,
    }).then(signature => {
        callback(signature);
    });
}
exports.signWithCallback = signWithCallback;
function decrypt(ciphertext, option) {
    return window.Promise.resolve("Not implemented");
}
exports.decrypt = decrypt;
/**
 * Event
 */
function _invoke(target) {
    return function (action, data) {
        return target.dispatchEvent(new CustomEvent(action, {
            detail: data,
            bubbles: true,
            composed: true,
        }));
    };
}
exports._invoke = _invoke;
function addEventListener(target) {
    return function (type, callback, options) {
        return target.addEventListener(type, callback, options);
    };
}
exports.addEventListener = addEventListener;
function removeEventListener(target) {
    return function (type, callback, options) {
        return target.removeEventListener(type, callback, options);
    };
}
exports.removeEventListener = removeEventListener;
// Function to receive background in inpage.
function _callRuntime(action, option) {
    if (!custom_type_1.availableCalls.includes(action)) {
        throw new window.Error("Function not available. Is the provider enabled?");
    }
    // TODO(ssb): Validate option
    switch (action) {
        case "nostr/signEvent": {
            if (typeof option.message !== "string") {
                throw new window.Error("Invalid message");
            }
        }
    }
    return new window.Promise(resolve => {
        browser.runtime
            .sendMessage({
            origin: location.origin,
            action,
            args: option,
        })
            .then(response => {
            resolve(response);
        });
    });
}
exports._callRuntime = _callRuntime;


/***/ }),

/***/ 45:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.init = exports.nostr = void 0;
const logger_1 = __webpack_require__(874);
const api_1 = __webpack_require__(71);
// Object shared with inpage scripts.
const _nostr = new window.Object();
_nostr.generate = exportFunction(api_1.generate, window);
_nostr.getPublicKey = exportFunction(api_1.getPublicKey, window);
_nostr.getPublicKeyWithCallback = exportFunction(api_1.getPublicKeyWithCallback, window);
_nostr.sign = exportFunction(api_1.sign, window);
_nostr.signWithCallback = exportFunction(api_1.signWithCallback, window);
_nostr.decrypt = exportFunction(api_1.decrypt, window);
// NOTE(ssb): A experimental feature for providers. Currently not freeze nor seal.
// ref: https://github.com/nostr-protocol/nips/pull/1174
_nostr.messageBoard = cloneInto({}, window);
_nostr._proxy = new window.EventTarget();
// TODO(ssb): Ideally should conceal
_nostr._invoke = exportFunction((0, api_1._invoke)(_nostr._proxy), window);
_nostr.addEventListener = exportFunction((0, api_1.addEventListener)(_nostr._proxy), window);
_nostr.removeEventListener = exportFunction((0, api_1.removeEventListener)(_nostr._proxy), window);
exports.nostr = _nostr;
async function init() {
    // The message listener to listen to background calls
    // After, emit event to return the response to the inpages.
    browser.runtime.onMessage.addListener(request => {
        (0, logger_1.log)("content-script onMessage", request);
        const action = request.action.replace("nostr/", "");
        const data = request.args;
        // forward account changed messaged to inpage script
        if (action === "accountChanged") {
            window.wrappedJSObject.ssi.nostr._invoke(action, data);
            XPCNativeWrapper(window.wrappedJSObject.ssi);
        }
    });
}
exports.init = init;


/***/ }),

/***/ 711:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.availableCalls = void 0;
exports.availableCalls = [
    "nostr/getPublicKey",
    "nostr/signEvent",
];
const verifiedSymbol = Symbol("verified");


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
const nostr_1 = __webpack_require__(45);
const api_1 = __webpack_require__(71);
(0, logger_1.log)("content-script working", browser.runtime.getURL("contents.bundle.js"));
// Object shared with inpage scripts.
const windowSSI = new window.Object();
windowSSI._scope = "ssi";
windowSSI.nostr = nostr_1.nostr;
windowSSI._proxy = new window.EventTarget();
// TODO(ssb): Ideally should conceal
windowSSI._invoke = exportFunction((0, api_1._invoke)(windowSSI._proxy), window);
windowSSI.addEventListener = exportFunction((0, api_1.addEventListener)(windowSSI._proxy), window);
windowSSI.removeEventListener = exportFunction((0, api_1.removeEventListener)(windowSSI._proxy), window);
if ((0, shouldInject_1.shouldInject)()) {
    // It envisions browser-native API, so the object is persisted.
    window.wrappedJSObject.ssi = windowSSI;
    for (const api of [
        window.wrappedJSObject.ssi,
        window.wrappedJSObject.ssi.nostr,
    ]) {
        for (const property of Object.getOwnPropertyNames(api)) {
            Object.defineProperty(window.wrappedJSObject.ssi.nostr, property, {
                writable: false,
                configurable: false,
            });
        }
    }
    Object.defineProperty(window.wrappedJSObject, "ssi", {
        writable: false,
        configurable: false,
    });
    XPCNativeWrapper(window.wrappedJSObject.ssi);
    (0, nostr_1.init)();
}

})();

/******/ })()
;