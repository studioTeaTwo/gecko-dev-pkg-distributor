/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

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
            application: "ssb",
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
                messageEvent.data.application !== "ssb" ||
                messageEvent.data.scope !== scope ||
                messageEvent.data.id !== id ||
                messageEvent.data.id === "native" // catch in nostr.ts and ssi.ts
            ) {
                return;
            }
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

/***/ 731:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WindowSSI = exports.init = void 0;
// Interface for window.ssi prototype
const postMessage_1 = __webpack_require__(323);
function init() {
    // It envisions browser-native API, so the object is persisted.
    window.ssi = Object.freeze(exports.WindowSSI);
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
exports.WindowSSI = {
    _scope: "ssi",
    _proxy: new EventTarget(),
    nostr: Object.freeze({
        generate(option) {
            return Promise.resolve("Not implemented");
        },
        getPublicKey(option) {
            return (0, postMessage_1.postMessage)("nostr", "getPublicKey", option);
        },
        sign(message, option) {
            return (0, postMessage_1.postMessage)("nostr", option.type, { message, ...option });
        },
        decrypt(ciphertext, option) {
            return Promise.resolve("Not implemented");
        },
        // NOTE(ssb): A experimental feature for providers. Currently not freeze nor seal.
        // ref: https://github.com/nostr-protocol/nips/pull/1174
        messageBoard: {},
        _proxy: new EventTarget(),
        dispatchEvent(event) {
            return exports.WindowSSI.nostr._proxy.dispatchEvent(event);
        },
        addEventListener(type, callback, options) {
            return exports.WindowSSI.nostr._proxy.addEventListener(type, callback, options);
        },
        removeEventListener(type, callback, options) {
            return exports.WindowSSI.nostr._proxy.removeEventListener(type, callback, options);
        },
    }),
    dispatchEvent(event) {
        return exports.WindowSSI._proxy.dispatchEvent(event);
    },
    addEventListener(type, callback, options) {
        return exports.WindowSSI._proxy.addEventListener(type, callback, options);
    },
    removeEventListener(type, callback, options) {
        return exports.WindowSSI._proxy.removeEventListener(type, callback, options);
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
    console.info("ssb:", args);
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
const ssi_1 = __webpack_require__(731);
(0, logger_1.log)("inpage-script working");
(0, ssi_1.init)();

})();

/******/ })()
;