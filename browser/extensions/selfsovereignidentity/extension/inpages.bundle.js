/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 368:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Interface for the web apps to call the extension
// refs: https://github.com/nostr-protocol/nips/blob/master/07.md
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NostrProvider = exports.init = void 0;
const shouldInject_1 = __webpack_require__(880);
const postMessage_1 = __webpack_require__(323);
function init() {
    if (!(0, shouldInject_1.shouldInject)()) {
        return;
    }
    // Inject
    if (window.nostr == null) {
        window.nostr = new NostrProvider();
        console.info("inages nostr injected!", window.nostr);
        const readyEvent = new Event("nostr:ready");
        window.dispatchEvent(readyEvent);
    }
    // The message listener to listen to content calls
    // After, emit event to return the reponse to the web apps.
    window.addEventListener("message", (event) => {
        if (event.source === window && event.data.scope === "nostr") {
            if (event.data.action === "accountChanged") {
                console.info("accountChanged emit!", event);
                window.dispatchEvent(new CustomEvent("nostr:accountchanged", {
                    detail: event.data.data,
                }));
            }
        }
    });
}
exports.init = init;
// ref: https://github.com/nostr-protocol/nips/blob/master/07.md
class NostrProvider {
    _scope = "nostr";
    getPublicKey() {
        return (0, postMessage_1.postMessage)(this._scope, "getPublicKey", undefined);
    }
    signEvent(event) {
        return (0, postMessage_1.postMessage)(this._scope, "signEvent", event);
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
}
exports.NostrProvider = NostrProvider;


/***/ }),

/***/ 323:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.postMessage = void 0;
const promiseQueue_1 = __webpack_require__(576);
// global queue object
const queue = new promiseQueue_1.PromiseQueue();
function postMessage(scope, action, args) {
    return queue.add(() => new Promise((resolve, reject) => {
        const id = Math.random().toString().slice(4);
        // Post the request to the content script
        window.postMessage({
            id,
            application: "SSB",
            action: `${scope}/${action}`,
            scope,
            args,
        }, window.location.origin);
        function handleWindowMessage(messageEvent) {
            // check if it is a relevant message
            // there are some other events happening
            if (messageEvent.origin !== window.location.origin ||
                !messageEvent.data ||
                !messageEvent.data.response ||
                messageEvent.data.application !== "SSB" ||
                messageEvent.data.scope !== scope ||
                messageEvent.data.id !== id) {
                return;
            }
            console.info("debug", messageEvent.data);
            if (messageEvent.data.data.error) {
                reject(new Error(messageEvent.data.data.error));
            }
            else {
                // 1. data: the message data
                // 2. data: the data passed as data to the message
                // 3. data: the actual response data
                resolve(messageEvent.data.data.data);
            }
            // For some reason must happen only at the end of this function
            window.removeEventListener("message", handleWindowMessage);
        }
        // The message listener to listen to content calls
        // After, return the response to the web apps
        window.addEventListener("message", handleWindowMessage);
    }));
}
exports.postMessage = postMessage;


/***/ }),

/***/ 576:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PromiseQueue = void 0;
class PromiseQueue {
    queue = Promise.resolve(true);
    add(operation) {
        return new Promise((resolve, reject) => {
            this.queue = this.queue.then(operation).then(resolve).catch(reject);
        });
    }
}
exports.PromiseQueue = PromiseQueue;


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
const nostr_1 = __webpack_require__(368);
console.info("inpage-script working!");
(0, nostr_1.init)();

})();

/******/ })()
;