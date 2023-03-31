/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from allDownloadsView.js */

const { PrivateBrowsingUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/PrivateBrowsingUtils.sys.mjs"
);

const { DownloadsTorWarning } = ChromeUtils.importESModule(
  "resource:///modules/DownloadsTorWarning.sys.mjs"
);

var ContentAreaDownloadsView = {
  init() {
    let box = document.getElementById("downloadsListBox");

    const torWarning = new DownloadsTorWarning(
      document.getElementById("aboutDownloadsTorWarning"),
      false,
      () => {
        // Try and focus the downloads list.
        // NOTE: If #downloadsListBox is still hidden, this will do nothing.
        // But in this case there are no other focusable targets within the
        // view, so we just leave it up to the focus handler.
        box.focus({ preventFocusRing: true });
      }
    );
    torWarning.activate();
    window.addEventListener("unload", () => {
      torWarning.deactivate();
    });

    let suppressionFlag = DownloadsCommon.SUPPRESS_CONTENT_AREA_DOWNLOADS_OPEN;
    box.addEventListener(
      "InitialDownloadsLoaded",
      () => {
        // Set focus to Downloads list once it is created
        // And prevent it from showing the focus ring around the richlistbox (Bug 1702694)
        // Prevent focusing the list whilst the tor browser warning is shown.
        // Some screen readers (tested with Orca and NVDA) will not read out
        // alerts if they are already present on page load. In that case, a
        // screen reader user may not be aware of the warning before they
        // interact with the downloads list, which we do not want.
        // Some hacky workarounds were tested with Orca to get it to read back
        // the alert before the focus is read, but this was inconsistent and the
        // experience was bad.
        // Without auto-focusing the downloads list, a screen reader should not
        // skip beyond the alert's content.
        if (torWarning.hidden) {
          document
            .getElementById("downloadsListBox")
            .focus({ focusVisible: false });
        }

        // Pause the indicator if the browser is active.
        if (document.visibilityState === "visible") {
          DownloadsCommon.getIndicatorData(window).attentionSuppressed |=
            suppressionFlag;
        }
      },
      { once: true }
    );
    let view = new DownloadsPlacesView(box, true, suppressionFlag);
    document.addEventListener("visibilitychange", () => {
      let indicator = DownloadsCommon.getIndicatorData(window);
      if (document.visibilityState === "visible") {
        indicator.attentionSuppressed |= suppressionFlag;
      } else {
        indicator.attentionSuppressed &= ~suppressionFlag;
      }
    });
    // Do not display the Places downloads in private windows
    if (!PrivateBrowsingUtils.isContentWindowPrivate(window)) {
      view.place = "place:transition=7&sort=4";
    }
  },
};

window.onload = function () {
  ContentAreaDownloadsView.init();
};
