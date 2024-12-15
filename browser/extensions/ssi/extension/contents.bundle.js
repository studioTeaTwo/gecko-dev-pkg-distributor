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
const availableCalls = ["nostr/getPublicKey", "nostr/signEvent"];
async function init() {
    if (!(0, shouldInject_1.shouldInject)()) {
        return;
    }
    // The message listener to listen to inpage calls
    // After, those calls get passed on to the background script
    // and emit event to return the response to the inpages.
    window.addEventListener("message", async (ev) => {
        (0, logger_1.log)("content-script eventListener message", ev);
        // Only accept messages from the current window
        if (ev.source !== window ||
            ev.data.id === "native" ||
            ev.data.application !== "ssb" ||
            ev.data.scope !== "nostr") {
            return;
        }
        if (ev.data && !ev.data.response) {
            if (!availableCalls.includes(ev.data.action)) {
                console.error("Function not available. Is the provider enabled?");
                return;
            }
            // Send message to the backgrounds and emit the returned value to the inpages
            const message = {
                origin: ev.origin,
                application: ev.data.application,
                action: ev.data.action,
                args: ev.data.args,
            };
            const replyFunction = (response) => {
                (0, logger_1.log)("response from background", ev, response);
                postMessage(ev, response);
            };
            (0, logger_1.log)("content-script sendMessage to background", message);
            return browser.runtime.sendMessage(message).then(replyFunction).catch();
        }
    });
    // The message listener to listen to background calls
    // After, emit event to return the response to the inpages.
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        (0, logger_1.log)("content-script onMessage", request);
        // forward account changed messaged to inpage script
        if (request.action === "nostr/accountChanged") {
            window.postMessage({
                id: "native",
                application: "ssb",
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
// Send message to the inpages
function postMessage(ev, response) {
    window.postMessage({
        id: ev.data.id,
        application: "ssb",
        response: true,
        data: response,
        scope: "nostr",
    }, window.location.origin);
}


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