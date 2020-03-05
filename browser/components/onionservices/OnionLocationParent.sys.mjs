// Copyright (c) 2020, The Tor Project, Inc.

import { TorStrings } from "resource://gre/modules/TorStrings.sys.mjs";

// Prefs

// We keep the "prioritizeonions" name, even if obsolete, in order to
// prevent the notification from being shown again to upgrading users.
const NOTIFICATION_PREF = "privacy.prioritizeonions.showNotification";

// Element IDs
const ONIONLOCATION_BOX_ID = "onion-location-box";
const ONIONLOCATION_LABEL_ID = "onion-label";

// Notification IDs
const NOTIFICATION_ID = "onion-location";
const NOTIFICATION_ANCHOR_ID = "onion-location-box";

// Strings
const STRING_ONION_AVAILABLE = TorStrings.onionLocation.onionAvailable;
const NOTIFICATION_CANCEL_LABEL = TorStrings.onionLocation.notNow;
const NOTIFICATION_CANCEL_ACCESSKEY = TorStrings.onionLocation.notNowAccessKey;
const NOTIFICATION_OK_LABEL = TorStrings.onionLocation.loadOnion;
const NOTIFICATION_OK_ACCESSKEY = TorStrings.onionLocation.loadOnionAccessKey;
const NOTIFICATION_TITLE = TorStrings.onionLocation.tryThis;
const NOTIFICATION_DESCRIPTION = TorStrings.onionLocation.description;
const NOTIFICATION_LEARN_MORE_URL =
  TorStrings.onionLocation.learnMoreURLNotification;

/**
 * This class contains the parent part of Onion Location.
 */
export class OnionLocationParent extends JSWindowActorParent {
  // Listeners are added in BrowserGlue.jsm
  receiveMessage(aMsg) {
    switch (aMsg.name) {
      case "OnionLocation:Set":
        let browser = this.browsingContext.embedderElement;
        OnionLocationParent.setOnionLocation(browser);
        break;
    }
  }

  static buttonClick(event) {
    if (event.button !== 0) {
      return;
    }
    const win = event.target.ownerGlobal;
    if (win.gBrowser) {
      const browser = win.gBrowser.selectedBrowser;
      OnionLocationParent.redirect(browser);
    }
  }

  static redirect(browser) {
    let windowGlobal = browser.browsingContext.currentWindowGlobal;
    let actor = windowGlobal.getActor("OnionLocation");
    if (actor) {
      actor.sendAsyncMessage("OnionLocation:Refresh", {});
      OnionLocationParent.setDisabled(browser);
    }
  }

  static onStateChange(browser) {
    delete browser._onionLocation;
    OnionLocationParent.hideNotification(browser);
  }

  static setOnionLocation(browser) {
    browser._onionLocation = true;
    let tabBrowser = browser.getTabBrowser();
    if (tabBrowser && browser === tabBrowser.selectedBrowser) {
      OnionLocationParent.updateOnionLocationBadge(browser);
    }
  }

  static hideNotification(browser) {
    const win = browser.ownerGlobal;
    if (browser._onionLocationPrompt) {
      win.PopupNotifications.remove(browser._onionLocationPrompt);
    }
  }

  static showNotification(browser) {
    const mustShow = Services.prefs.getBoolPref(NOTIFICATION_PREF, true);
    if (!mustShow) {
      return;
    }

    const win = browser.ownerGlobal;
    Services.prefs.setBoolPref(NOTIFICATION_PREF, false);

    const mainAction = {
      label: NOTIFICATION_OK_LABEL,
      accessKey: NOTIFICATION_OK_ACCESSKEY,
      callback() {
        OnionLocationParent.redirect(browser);
      },
    };

    const cancelAction = {
      label: NOTIFICATION_CANCEL_LABEL,
      accessKey: NOTIFICATION_CANCEL_ACCESSKEY,
      callback: () => {},
    };

    win.document.getElementById("onion-location-body-text").textContent =
      NOTIFICATION_DESCRIPTION;

    const options = {
      autofocus: true,
      persistent: true,
      removeOnDismissal: false,
      eventCallback(aTopic) {
        if (aTopic === "removed") {
          delete browser._onionLocationPrompt;
        }
      },
      learnMoreURL: NOTIFICATION_LEARN_MORE_URL,
      hideClose: true,
      popupOptions: {
        position: "bottomright topright",
      },
    };

    // A hacky way of setting the popup anchor outside the usual url bar icon
    // box, similar to CRF and addons.
    // See: https://searchfox.org/mozilla-esr115/rev/7962d6b7b17ee105ad64ab7906af2b9179f6e3d2/toolkit/modules/PopupNotifications.sys.mjs#46
    browser[NOTIFICATION_ANCHOR_ID + "popupnotificationanchor"] =
      win.document.getElementById(NOTIFICATION_ANCHOR_ID);

    browser._onionLocationPrompt = win.PopupNotifications.show(
      browser,
      NOTIFICATION_ID,
      NOTIFICATION_TITLE,
      NOTIFICATION_ANCHOR_ID,
      mainAction,
      [cancelAction],
      options
    );
  }

  static setEnabled(browser) {
    const win = browser.ownerGlobal;
    const label = win.document.getElementById(ONIONLOCATION_LABEL_ID);
    label.textContent = STRING_ONION_AVAILABLE;
    const elem = win.document.getElementById(ONIONLOCATION_BOX_ID);
    elem.removeAttribute("hidden");
  }

  static setDisabled(browser) {
    const win = browser.ownerGlobal;
    const elem = win.document.getElementById(ONIONLOCATION_BOX_ID);
    elem.setAttribute("hidden", true);
  }

  static updateOnionLocationBadge(browser) {
    if (browser._onionLocation) {
      OnionLocationParent.setEnabled(browser);
      OnionLocationParent.showNotification(browser);
    } else {
      OnionLocationParent.setDisabled(browser);
    }
  }
}
