// Mediator for the extension to relay between the web apps and the background
// refs: https://github.com/getAlby/lightning-browser-extension/blob/master/src/extension/content-script/nostr.js

import { availableCalls } from "../custom.type";
import { log } from "../shared/logger";
import { shouldInject } from "../shared/shouldInject";

// Function to inject in inpage.
function callBackground(action: (typeof availableCalls)[number], option) {
  if (!availableCalls.includes(action)) {
    console.error("Function not available. Is the provider enabled?");
    return;
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

export async function init() {
  if (!shouldInject()) {
    return;
  }

  exportFunction(callBackground, window, {
    defineAs: "callBackground",
  });

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
