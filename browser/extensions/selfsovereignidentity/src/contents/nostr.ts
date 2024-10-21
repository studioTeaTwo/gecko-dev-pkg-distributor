// Mediator for the extension to relay between the web apps and the background
// refs: https://github.com/getAlby/lightning-browser-extension/blob/master/src/extension/content-script/nostr.js

import { shouldInject } from "../shared/shouldInject"

const availableCalls = ["nostr/getPublicKey"]

async function init() {
  if (!shouldInject()) {
    return
  }

  // The message listener to listen to background calls
  // After, emit events to return the response to the inpages.
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("content-script onMessage", request)
    // forward account changed messaged to inpage script
    // if (request.action === "accountChanged") {
    //   window.postMessage(
    //     { action: "accountChanged", scope: "nostr" },
    //     window.location.origin
    //   )
    // }
  })

  // The message listener to listen to inpage calls
  // After, those calls get passed on to the background script
  // and emit events to return the response to the inpages.
  window.addEventListener("message", async (ev) => {
    console.log("content-script eventListener message", ev)
    // Only accept messages from the current window
    if (
      ev.source !== window ||
      ev.data.application !== "SSB" ||
      ev.data.scope !== "nostr"
    ) {
      return
    }

    if (ev.data && !ev.data.response) {
      if (!availableCalls.includes(ev.data.action)) {
        console.error("Function not available. Is the provider enabled?")
        return
      }

      const message: MessageFromContentToBack = {
        action: ev.data.action,
        args: ev.data.args,
      }

      const replyFunction = (response) => {
        console.log("response from background", ev, response)
        postMessage(ev, response)
      }

      console.log("content-script sendMessage to background", message)

      // Send message to the backgrounds and emit events to the inpages
      return browser.runtime.sendMessage(message).then(replyFunction).catch()
    }
  })
}

init()

// Send message to the inpages
function postMessage(ev, response) {
  window.postMessage(
    {
      id: ev.data.id,
      application: "SSB",
      response: true,
      data: response,
      scope: "nostr",
    },
    window.location.origin
  )
}
