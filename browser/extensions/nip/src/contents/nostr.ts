// Mediator for the extension to relay between the web apps and the background
// refs: https://github.com/getAlby/lightning-browser-extension/blob/master/src/extension/content-script/nostr.js

import { log } from "../shared/logger"
import { shouldInject } from "../shared/shouldInject"

export async function init() {
  if (!shouldInject()) {
    return
  }

  // The message listener to listen to background calls
  // After, emit event to return the response to the inpages.
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    log("content-script onMessage", request)
    // forward account changed messaged to inpage script
    if (
      request.action === "nostr/builtinNip07Init" ||
      request.action === "nostr/builtinNip07Changed"
    ) {
      window.postMessage(
        {
          id: "native",
          application: "nip",
          data: {
            action: request.action.replace("nostr/", ""),
            data: request.args,
          },
          scope: "nostr",
        },
        window.location.origin
      )
    }
  })
}
