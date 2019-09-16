"use strict";

const { QRCode } = ChromeUtils.importESModule(
  "resource://gre/modules/QRCode.sys.mjs"
);

window.addEventListener(
  "DOMContentLoaded",
  () => {
    const bridgeString = window.arguments[0];

    const target = document.getElementById("bridgeQr-target");
    const style = window.getComputedStyle(target);
    // We are assuming that the style width and height have "px" units.
    // Trailing "px" is not parsed.
    // NOTE: Our QRCode module doesn't seem to use the width or height
    // attributes.
    const width = parseInt(style.width, 10);
    const height = parseInt(style.height, 10);
    new QRCode(target, {
      text: bridgeString,
      width,
      height,
      colorDark: style.color,
      colorLight: style.backgroundColor,
    });
  },
  { once: true }
);
