/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions */

import { init as nostrInit } from "./nostr"

console.info(
  "content-script working!",
  browser.runtime.getURL("inpages/inpages.bundle.js")
)

function loadInpageScript(url) {
  try {
    if (!document) throw new Error("No document")
    const container = document.head || document.documentElement
    if (!container) throw new Error("No container element")
    const scriptEl = document.createElement("script")
    scriptEl.setAttribute("async", "false")
    scriptEl.setAttribute("type", "text/javascript")
    scriptEl.setAttribute("src", url)
    container.appendChild(scriptEl)
  } catch (err) {
    console.error("injection failed", err)
  }
}
loadInpageScript(browser.runtime.getURL("inpages/inpages.bundle.js"))

nostrInit()
