/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import { shouldInject } from "../shared/shouldInject"
import NostrProvider from "./nostr"

console.info("inpage-script working!")

function init() {
  if (!shouldInject()) {
    return
  }

  if (window.nostr == null) {
    window.nostr = new NostrProvider()
    console.info("inages nostr injected!", window.nostr)
    const readyEvent = new Event("nostr:ready")
    window.dispatchEvent(readyEvent)
  }

  // The message listener to listen to content calls
  // After, emit events to the web apps.
  window.addEventListener("message", (event) => {
    // if (event.source === window && event.data.action === "accountChanged") {
    //   eventEmitter(event.data.action, event.data.scope)
    // }
  })
}

// Send message to the web apps
function eventEmitter(action, scope) {
  if (window[scope] && window[scope].emit) {
    window[scope].emit(action)
  }
}
init()
