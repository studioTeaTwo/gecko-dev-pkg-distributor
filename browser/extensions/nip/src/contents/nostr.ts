// Mediator for the extension to relay between the web apps and the background
// refs: https://github.com/getAlby/lightning-browser-extension/blob/master/src/extension/content-script/nostr.js

import { log } from "../shared/logger";
import { shouldInject } from "../shared/shouldInject";

declare global {
  interface WrappedJSObject {
    _builtinNip: {
      _injectBuiltinNip07: () => void;
      _disposeBuiltinNip07: () => void;
    };
  }
}

export async function init() {
  if (!shouldInject()) {
    return;
  }

  // The message listener to listen to background calls
  // After, emit event to return the response to the inpages.
  browser.runtime.onMessage.addListener(request => {
    log("content-script onMessage", request);
    const action = request.action;
    const data = request.args;

    // forward account changed messaged to inpage script
    if (
      ["nostr/builtinNip07Init", "nostr/builtinNip07Changed"].includes(action)
    ) {
      // TODO(ssb): It depends on the standard spec with other providers.
      if (data) {
        // Inject
        window.wrappedJSObject._builtinNip._injectBuiltinNip07();
      } else {
        // Dispose
        window.wrappedJSObject._builtinNip._disposeBuiltinNip07();
      }
      XPCNativeWrapper(window.wrappedJSObject._builtinNip);

      const event = new CustomEvent(action, {
        detail: data,
      });
      window.dispatchEvent(event);
      log(`inpage ${action} emit`, event);
    }
  });
}
