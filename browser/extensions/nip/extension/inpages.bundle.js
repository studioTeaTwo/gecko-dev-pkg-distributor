/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 368:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Interface for the web apps to call the extension
// refs: https://github.com/nostr-protocol/nips/blob/master/07.md
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NostrProvider = exports.init = void 0;
const logger_1 = __webpack_require__(874);
const shouldInject_1 = __webpack_require__(880);
function init() {
    if (!(0, shouldInject_1.shouldInject)()) {
        return;
    }
    // The message listener to listen to content calls
    // After, emit event to return the reponse to the web apps.
    window.addEventListener("message", (event) => {
        if (event.source !== window || event.data.id !== "native") {
            return;
        }
        const action = event.data.data.action;
        const data = event.data.data.data;
        if (event.data.scope === "nostr") {
            if (action === "init" || action === "providerChanged") {
                // TODO(ssb): It depends on the standard spec with other providers.
                if (data) {
                    // Inject
                    window.nostr = new NostrProvider();
                    window.nip07Loaded = Array.isArray(window.nip07Loaded)
                        ? window.nip07Loaded.concat({ ssb: true })
                        : [{ ssb: true }];
                    window.ssi.nostr.addEventListener("accountChanged", accountChangedHandler);
                }
                else {
                    // Dispose
                    window.nostr && delete window.nostr;
                    window.nip07Loaded = Array.isArray(window.nip07Loaded)
                        ? window.nip07Loaded.concat({ ssb: false })
                        : [{ ssb: false }];
                    window.ssi.nostr.removeEventListener("accountChanged", accountChangedHandler);
                }
                (0, logger_1.log)(`inpage ${action} emit`, event);
                window.dispatchEvent(new CustomEvent(action, {
                    detail: data,
                }));
            }
        }
    });
}
exports.init = init;
const accountChangedHandler = (event) => {
    const action = event.data.data.action;
    const data = event.data.data.data;
    (0, logger_1.log)(`inpage accountChanged emit`, event);
    window.nostr.dispatchEvent(new CustomEvent(action, {
        detail: data,
        bubbles: false,
    }));
};
// ref: https://github.com/nostr-protocol/nips/blob/master/07.md
class NostrProvider {
    _scope = "nostr";
    _provider = "ssb";
    #proxy;
    constructor() {
        this.#proxy = new EventTarget();
        this.#proxy.proxied = this;
    }
    getPublicKey() {
        return window.ssi.nostr.getPublicKey();
    }
    async signEvent(event) {
        return window.ssi.nostr.sign(JSON.stringify(event), { type: "signEvent" });
    }
    nip04 = {
        encrypt(pubkey, plaintext) {
            return;
        },
        decrypt(pubkey, ciphertext) {
            return;
        },
    };
    nip44 = {
        encrypt(pubkey, plaintext) {
            return;
        },
        decrypt(pubkey, ciphertext) {
            return;
        },
    };
    dispatchEvent(...args) {
        return this.#proxy.dispatchEvent(...args);
    }
    addEventListener(...args) {
        return this.#proxy.addEventListener(...args);
    }
    removeEventListener(...args) {
        return this.#proxy.removeEventListener(...args);
    }
}
exports.NostrProvider = NostrProvider;


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
const nostr_1 = __webpack_require__(368);
(0, logger_1.log)("inpage-script working");
(0, nostr_1.init)();

})();

/******/ })()
;