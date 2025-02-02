// Mediator for the extension to relay between the web apps and the background
// refs: https://github.com/getAlby/lightning-browser-extension/blob/master/src/extension/content-script/nostr.js

import { availableCalls } from "../custom.type";
import { log } from "../shared/logger";
import { shouldInject } from "../shared/shouldInject";

export async function init() {
  if (!shouldInject()) {
    return;
  }

  // Inject to inpages.
  const ssi = new window.Object() as InternalSSI;
  ssi._callRuntime = exportFunction(callRuntime, window);
  window.wrappedJSObject._ssi = ssi;
  Object.defineProperty(window.wrappedJSObject._ssi, "_callRuntime", {
    writable: false,
    configurable: false,
  });
  Object.defineProperty(window.wrappedJSObject, "_ssi", {
    writable: false,
    configurable: false,
  });
  XPCNativeWrapper(window.wrappedJSObject._ssi);

  // The message listener to listen to background calls
  // After, emit event to return the response to the inpages.
  browser.runtime.onMessage.addListener(request => {
    log("content-script onMessage", request);
    const action = request.action.replace("nostr/", "");
    const data = request.args;

    // forward account changed messaged to inpage script
    if (action === "accountChanged") {
      window.wrappedJSObject.ssi.nostr._invoke(action, data);
      XPCNativeWrapper(window.wrappedJSObject.ssi);
    }
  });
}

// Function to receive background in inpage.
function callRuntime(action: (typeof availableCalls)[number], option) {
  if (!availableCalls.includes(action)) {
    throw new Error("Function not available. Is the provider enabled?");
  }
  // TODO(ssb): Validate option
  switch (action) {
    case "nostr/signEvent": {
      if (typeof option.message !== "string") {
        throw new Error("Invalid message");
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
