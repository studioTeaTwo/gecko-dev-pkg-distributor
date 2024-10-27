/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import { init as nostrInit, doNostrAction } from "./nostr"

console.info("background-script working!")

// initial action to enable ssb when the webapps are loaded
browser.webNavigation.onCompleted.addListener(() => {})

// The message listener to listen to content calls
// After, return the result to the contents.
browser.runtime.onMessage.addListener(
  (
    message: {
      action: string
      args: any
    },
    sender: FixMe
  ) => {
    console.info("background received from content: ", message, sender)
    if (message.action.includes("nostr/")) {
      return Promise.resolve(doNostrAction(message.action, message.args)).then(
        (data) => ({ data })
      )
    }

    return false
  }
)

nostrInit()
