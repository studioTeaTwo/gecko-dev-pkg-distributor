/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import "./nostr"
import { state } from "./state"

console.info("background-script working!")

// initial action to enable ssb
browser.webNavigation.onCompleted.addListener(() => {})

// The message listener to listen to content calls
// After, return the response to the contents.
browser.runtime.onMessage.addListener(
  (
    message: {
      action: string
      args: any
    },
    sender: FixMe,
    sendResponse: (response: MessageBag) => void
  ) => {
    console.log(message, sender)
    if (message.action === "nostr/getPublicKey") {
      sendResponse({ data: state.nostr })
    }
  }
)
