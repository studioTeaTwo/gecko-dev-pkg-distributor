// Mediator for the extension to relay between the web apps and the background
// refs: https://github.com/getAlby/lightning-browser-extension/blob/master/src/extension/content-script/nostr.js

import { type MessageBetweenBackAndContent } from "../custom.type";
import { log } from "../shared/logger";
import { shouldInject } from "../shared/shouldInject";

const availableCalls = ["nostr/getPublicKey", "nostr/signEvent"];

export async function init() {
  if (!shouldInject()) {
    return;
  }

  // The message listener to listen to inpage calls
  // After, those calls get passed on to the background script
  // and emit event to return the response to the inpages.
  window.addEventListener("message", async ev => {
    log("content-script eventListener message", ev);
    // Only accept messages from the current window
    if (
      ev.source !== window ||
      ev.data.id === "native" ||
      ev.data.application !== "ssb" ||
      ev.data.scope !== "nostr"
    ) {
      return;
    }

    if (ev.data && !ev.data.response) {
      if (!availableCalls.includes(ev.data.action)) {
        console.error("Function not available. Is the provider enabled?");
        return;
      }

      // Send message to the backgrounds and emit the returned value to the inpages
      const message: MessageBetweenBackAndContent = {
        origin: ev.origin,
        application: ev.data.application,
        action: ev.data.action,
        args: ev.data.args,
      };
      const replyFunction = response => {
        log("response from background", ev, response);
        postMessage(ev, response);
      };
      log("content-script sendMessage to background", message);
      return browser.runtime.sendMessage(message).then(replyFunction).catch();
    }
  });

  // The message listener to listen to background calls
  // After, emit event to return the response to the inpages.
  browser.runtime.onMessage.addListener(request => {
    log("content-script onMessage", request);
    // forward account changed messaged to inpage script
    if (request.action === "nostr/accountChanged") {
      window.postMessage(
        {
          id: "native",
          application: "ssb",
          data: {
            action: request.action.replace("nostr/", ""),
            data: request.args,
          },
          scope: "nostr",
        },
        window.location.origin
      );
    }
  });
}

// Send message to the inpages
function postMessage(ev, response) {
  window.postMessage(
    {
      id: ev.data.id,
      application: "ssb",
      response: true,
      data: response,
      scope: "nostr",
    },
    window.location.origin
  );
}
