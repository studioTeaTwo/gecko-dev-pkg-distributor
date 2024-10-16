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
