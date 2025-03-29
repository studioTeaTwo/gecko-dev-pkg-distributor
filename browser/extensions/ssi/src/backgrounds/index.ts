/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import { type MessageBetweenBackAndContent } from "../custom.type";
import { log } from "../shared/logger";
import { init as nostrInit, doNostrAction } from "./nostr";
import "./nostr";

log("background-script working");

// The message listener to listen to content calls
// After, return the result to the contents.
browser.runtime.onMessage.addListener(
  (message: MessageBetweenBackAndContent, sender) => {
    log("background received from content", message, sender);
    if (message.action.includes("nostr/")) {
      return doNostrAction(
        sender.tab.id,
        message.origin,
        message.action,
        message.args
      );
    }

    return false;
  }
);

nostrInit();
