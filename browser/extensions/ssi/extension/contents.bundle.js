/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 71:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._callRuntime = exports.removeEventListener = exports.addEventListener = exports._invoke = exports.NostrApi = exports.BitcoinApi = void 0;
const custom_type_1 = __webpack_require__(711);
/**
 * We waive Xray, so we prepend the global window object with `window.`.
 * ref: https://firefox-source-docs.mozilla.org/dom/scriptSecurity/xray_vision.html
 */
/**
 * Bitcoin
 */
exports.BitcoinApi = {
    generate(option) {
        return _callRuntime("bitcoin/generate", option);
    },
    generateSync(callback, option) {
        _callRuntime("bitcoin/generate", option)
            .then(identifier => {
            callback(null, identifier);
        })
            .catch(error => {
            callback(error, undefined);
        });
    },
    shareWith(pubkey, option) {
        return _callRuntime(`bitcoin/shareWith`, {
            pubkey,
            ...option,
        });
    },
    shareWithSync(pubkey, callback, option) {
        return _callRuntime(`bitcoin/shareWith`, {
            pubkey,
            ...option,
        })
            .then(sharedSecret => {
            callback(null, sharedSecret);
        })
            .catch(error => {
            callback(error, null);
        });
    },
};
/**
 * Nostr
 */
exports.NostrApi = {
    generate() {
        return window.Promise.resolve("Not implemented");
    },
    getPublicKey(option) {
        return _callRuntime("nostr/getPublicKey", option);
    },
    getPublicKeySync(callback, option) {
        _callRuntime("nostr/getPublicKey", option)
            .then(publicKey => {
            callback(null, publicKey);
        })
            .catch(error => {
            callback(error, undefined);
        });
    },
    sign(message, option) {
        return _callRuntime(`nostr/${option.type}`, {
            message,
            ...option,
        });
    },
    signSync(message, callback, option) {
        _callRuntime(`nostr/${option.type}`, {
            message,
            ...option,
        })
            .then(signature => {
            callback(null, signature);
        })
            .catch(error => {
            callback(error, undefined);
        });
    },
    encrypt(plaintext, option) {
        return _callRuntime(`nostr/${option.type}/encrypt`, {
            plaintext,
            ...option,
        });
    },
    encryptSync(plaintext, callback, option) {
        return _callRuntime(`nostr/${option.type}/encrypt`, {
            plaintext,
            ...option,
        })
            .then(ciphertext => {
            callback(null, ciphertext);
        })
            .catch(error => {
            callback(error, undefined);
        });
    },
    decrypt(ciphertext, option) {
        return _callRuntime(`nostr/${option.type}/decrypt`, {
            ciphertext,
            ...option,
        });
    },
    decryptSync(ciphertext, callback, option) {
        return _callRuntime(`nostr/${option.type}/decrypt`, {
            ciphertext,
            ...option,
        })
            .then(plaintext => {
            callback(null, plaintext);
        })
            .catch(error => {
            callback(error, undefined);
        });
    },
};
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
    // Validate
    if (!custom_type_1.availableCalls.includes(action)) {
        throw new window.Error("Function not available. Is the provider enabled?");
    }
    // TODO(ssb): Validate option
    switch (action) {
        case "bitcoin/generate": {
            if (option.type == null || typeof option.type !== "string") {
                throw new window.Error("Missing the type for required");
            }
            break;
        }
        case "bitcoin/shareWith": {
            if (option.pubkey == null || typeof option.pubkey !== "string") {
                throw new window.Error("Missing the pubkey for required");
            }
            if (option.type == null || typeof option.type !== "string") {
                throw new window.Error("Missing the type for required");
            }
            break;
        }
        case "nostr/signEvent": {
            if (option.message == null || typeof option.message !== "string") {
                throw new window.Error("Invalid message");
            }
            break;
        }
        case "nostr/nip04/encrypt":
        case "nostr/nip44/encrypt": {
            if (option.plaintext == null || typeof option.plaintext !== "string") {
                throw new window.Error("Invalid plaintext");
            }
            if (option.pubkey == null || typeof option.pubkey !== "string") {
                throw new window.Error("Invalid partner's pubkey");
            }
            break;
        }
        case "nostr/nip04/decrypt":
        case "nostr/nip44/decrypt": {
            // TODO(ssb): validate in the terms of cryptography
            if (option.ciphertext == null || typeof option.ciphertext !== "string") {
                throw new window.Error("Invalid ciphertext");
            }
            if (option.pubkey == null || typeof option.pubkey !== "string") {
                throw new window.Error("Invalid partner's pubkey");
            }
            break;
        }
    }
    return new window.Promise((resolve, reject) => {
        browser.runtime
            .sendMessage({
            origin: location.origin,
            action,
            args: option,
        })
            .then(response => {
            if (["string", "number", "bigint", "boolean", "undefined"].includes(typeof response)) {
                resolve(response);
            }
            else if (["object"].includes(typeof response)) {
                resolve(cloneInto(response, window));
            }
            else {
                throw new window.Error("Not supported response type");
            }
        })
            .catch(error => {
            reject(cloneInto(error, window));
        });
    });
}
exports._callRuntime = _callRuntime;


/***/ }),

/***/ 653:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.init = exports.bitcoin = void 0;
const logger_1 = __webpack_require__(874);
const api_1 = __webpack_require__(71);
/**
 * We waive Xray, so we prepend the global window object with `window.`.
 * ref: https://firefox-source-docs.mozilla.org/dom/scriptSecurity/xray_vision.html
 */
// Object shared with inpage scripts.
const _bitcoin = new window.Object();
_bitcoin.generate = exportFunction(api_1.BitcoinApi.generate, window);
_bitcoin.generateSync = exportFunction(api_1.BitcoinApi.generateSync, window);
_bitcoin.shareWith = exportFunction(api_1.BitcoinApi.shareWith, window);
_bitcoin.shareWithSync = exportFunction(api_1.BitcoinApi.shareWithSync, window);
_bitcoin._proxy = new window.EventTarget();
// TODO(ssb): Ideally should conceal
_bitcoin._invoke = exportFunction((0, api_1._invoke)(_bitcoin._proxy), window);
_bitcoin.addEventListener = exportFunction((0, api_1.addEventListener)(_bitcoin._proxy), window);
_bitcoin.removeEventListener = exportFunction((0, api_1.removeEventListener)(_bitcoin._proxy), window);
exports.bitcoin = _bitcoin;
async function init() {
    // The message listener to listen to background calls
    // After, emit event to return the response to the inpages.
    browser.runtime.onMessage.addListener(request => {
        (0, logger_1.log)("content-script onMessage", request);
        const action = request.action.replace("bitcoin/", "");
        const data = request.args;
        // forward account changed messaged to inpage script
        if (action === "accountChanged") {
            window.wrappedJSObject.ssi.bitcoin._invoke(action, data);
            XPCNativeWrapper(window.wrappedJSObject.ssi);
        }
    });
}
exports.init = init;


/***/ }),

/***/ 45:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.init = exports.nostr = void 0;
const logger_1 = __webpack_require__(874);
const api_1 = __webpack_require__(71);
/**
 * We waive Xray, so we prepend the global window object with `window.`.
 * ref: https://firefox-source-docs.mozilla.org/dom/scriptSecurity/xray_vision.html
 */
// Object shared with inpage scripts.
const _nostr = new window.Object();
_nostr.generate = exportFunction(api_1.NostrApi.generate, window);
_nostr.getPublicKey = exportFunction(api_1.NostrApi.getPublicKey, window);
_nostr.getPublicKeySync = exportFunction(api_1.NostrApi.getPublicKeySync, window);
_nostr.sign = exportFunction(api_1.NostrApi.sign, window);
_nostr.signSync = exportFunction(api_1.NostrApi.signSync, window);
_nostr.encrypt = exportFunction(api_1.NostrApi.encrypt, window);
_nostr.encryptSync = exportFunction(api_1.NostrApi.encryptSync, window);
_nostr.decrypt = exportFunction(api_1.NostrApi.decrypt, window);
_nostr.decryptSync = exportFunction(api_1.NostrApi.decryptSync, window);
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
exports.availableCalls = exports.availableCallsNostr = exports.availableCallsBitcoin = void 0;
exports.availableCallsBitcoin = [
    "bitcoin/generate",
    "bitcoin/shareWith",
];
exports.availableCallsNostr = [
    "nostr/getPublicKey",
    "nostr/signEvent",
    "nostr/nip04/encrypt",
    "nostr/nip04/decrypt",
    "nostr/nip44/encrypt",
    "nostr/nip44/decrypt",
];
exports.availableCalls = [
    ...exports.availableCallsBitcoin,
    ...exports.availableCallsNostr,
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
    window.console.info("ssb:", args);
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
    if (!window.document || !window.document.documentElement) {
        return false;
    }
    const docNode = window.document.documentElement.nodeName;
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
const bitcoin_1 = __webpack_require__(653);
const nostr_1 = __webpack_require__(45);
const api_1 = __webpack_require__(71);
/**
 * We waive Xray, so we prepend the global window object with `window.`.
 * ref: https://firefox-source-docs.mozilla.org/dom/scriptSecurity/xray_vision.html
 */
(0, logger_1.log)("content-script working", browser.runtime.getURL("contents.bundle.js"));
// Object shared with inpage scripts.
const windowSSI = new window.Object();
windowSSI._scope = "ssi";
windowSSI.bitcoin = bitcoin_1.bitcoin;
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
        window.wrappedJSObject.ssi.bitcoin,
        window.wrappedJSObject.ssi.nostr,
    ]) {
        for (const property of window.Object.getOwnPropertyNames(api)) {
            window.Object.defineProperty(api, property, {
                writable: false,
                configurable: false,
            });
        }
    }
    window.Object.defineProperty(window.wrappedJSObject, "ssi", {
        writable: false,
        configurable: false,
    });
    XPCNativeWrapper(window.wrappedJSObject.ssi);
    (0, bitcoin_1.init)();
    (0, nostr_1.init)();
}

})();

/******/ })()
;