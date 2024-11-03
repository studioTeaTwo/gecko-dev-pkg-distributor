/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import { log } from "../shared/logger"
import { init as nostrInit, doNostrAction } from "./nostr"
import "./nostr"

log("background-script working")

// The message listener to listen to content calls
// After, return the result to the contents.
browser.runtime.onMessage.addListener(
  (message: MessageBetweenBackAndContent, sender: FixMe) => {
    log("background received from content", message, sender)
    if (message.action.includes("nostr/")) {
      return Promise.resolve(
        doNostrAction(
          message.origin,
          message.application,
          message.action,
          message.args
        )
      )
        .then((data) => ({ data }))
        .catch((error) => ({ error }))
    }

    return false
  }
)

nostrInit()
