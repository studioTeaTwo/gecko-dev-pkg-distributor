/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* global SSI_PANEL:false */

function onDOMLoaded() {
  if (!window.theSSI_PANEL) {
    var theSSI_PANEL = new SSI_PANEL();
    /* global theSSI_PANEL */
    window.theSSI_PANEL = theSSI_PANEL;
    theSSI_PANEL.initHome();
  }
  window.theSSI_PANEL.create();
}

if (document.readyState != `loading`) {
  onDOMLoaded();
} else {
  document.addEventListener(`DOMContentLoaded`, onDOMLoaded);
}
