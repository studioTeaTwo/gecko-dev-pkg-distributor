// Copyright (c) 2021, The Tor Project, Inc.

import { TorStrings } from "resource://gre/modules/TorStrings.sys.mjs";
import {
  TorConnect,
  TorConnectTopics,
} from "resource://gre/modules/TorConnect.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
  HomePage: "resource:///modules/HomePage.sys.mjs",
});

const userHasEverClickedConnectPref =
  "torbrowser.about_torconnect.user_has_ever_clicked_connect";

/*
This object is basically a marshalling interface between the TorConnect module
and a particular about:torconnect page
*/

/**
 * Actor parent class for the about:torconnect page.
 * It adapts and relays the messages from and to the TorConnect module.
 */
export class TorConnectParent extends JSWindowActorParent {
  constructor(...args) {
    super(...args);

    const self = this;

    // JSWindowActiveParent derived objects cannot observe directly, so create a
    // member object to do our observing for us.
    //
    // This object converts the various lifecycle events from the TorConnect
    // module, and maintains a state object which we pass down to our
    // about:torconnect page, which uses the state object to update its UI.
    this.torConnectObserver = {
      observe(subject, topic) {
        const obj = subject?.wrappedJSObject;
        switch (topic) {
          case TorConnectTopics.StageChange:
            self.sendAsyncMessage("torconnect:stage-change", obj);
            break;
          case TorConnectTopics.BootstrapProgress:
            self.sendAsyncMessage("torconnect:bootstrap-progress", obj);
            break;
          case TorConnectTopics.QuickstartChange:
            self.sendAsyncMessage(
              "torconnect:quickstart-change",
              TorConnect.quickstart
            );
            break;
          case TorConnectTopics.RegionNamesChange:
            self.sendAsyncMessage("torconnect:region-names-change");
            break;
        }
      },
    };

    Services.obs.addObserver(
      this.torConnectObserver,
      TorConnectTopics.StageChange
    );
    Services.obs.addObserver(
      this.torConnectObserver,
      TorConnectTopics.BootstrapProgress
    );
    Services.obs.addObserver(
      this.torConnectObserver,
      TorConnectTopics.QuickstartChange
    );
    Services.obs.addObserver(
      this.torConnectObserver,
      TorConnectTopics.RegionNamesChange
    );
  }

  didDestroy() {
    Services.obs.removeObserver(
      this.torConnectObserver,
      TorConnectTopics.StageChange
    );
    Services.obs.removeObserver(
      this.torConnectObserver,
      TorConnectTopics.BootstrapProgress
    );
    Services.obs.removeObserver(
      this.torConnectObserver,
      TorConnectTopics.QuickstartChange
    );
    Services.obs.removeObserver(
      this.torConnectObserver,
      TorConnectTopics.RegionNamesChange
    );
  }

  async receiveMessage(message) {
    switch (message.name) {
      case "torconnect:should-show":
        return Promise.resolve(TorConnect.shouldShowTorConnect);
      case "torconnect:home-page":
        // If there are multiple home pages, just load the first one.
        return Promise.resolve(
          TorConnectParent.fixupURIs(lazy.HomePage.get())[0]
        );
      case "torconnect:set-quickstart":
        TorConnect.quickstart = message.data;
        break;
      case "torconnect:open-tor-preferences":
        this.browsingContext.top.embedderElement.ownerGlobal.openPreferences(
          "connection"
        );
        break;
      case "torconnect:view-tor-logs":
        this.browsingContext.top.embedderElement.ownerGlobal.openPreferences(
          "connection-viewlogs"
        );
        break;
      case "torconnect:restart":
        Services.startup.quit(
          Ci.nsIAppStartup.eRestart | Ci.nsIAppStartup.eAttemptQuit
        );
        break;
      case "torconnect:start-again":
        TorConnect.startAgain();
        break;
      case "torconnect:choose-region":
        TorConnect.chooseRegion();
        break;
      case "torconnect:begin-bootstrapping":
        if (message.data.userClickedConnect) {
          Services.prefs.setBoolPref(userHasEverClickedConnectPref, true);
        }
        TorConnect.beginBootstrapping(message.data.regionCode);
        break;
      case "torconnect:cancel-bootstrapping":
        TorConnect.cancelBootstrapping();
        break;
      case "torconnect:get-init-args":
        // Called on AboutTorConnect.init(), pass down all state data it needs
        // to init.
        return {
          TorStrings,
          Direction: Services.locale.isAppLocaleRTL ? "rtl" : "ltr",
          stage: TorConnect.stage,
          userHasEverClickedConnect: Services.prefs.getBoolPref(
            userHasEverClickedConnectPref,
            false
          ),
          quickstartEnabled: TorConnect.quickstart,
        };
      case "torconnect:get-regions":
        return TorConnect.getFrequentRegions().then(frequent => {
          return { names: TorConnect.getRegionNames(), frequent };
        });
    }
    return undefined;
  }

  /**
   * Open the "about:torconnect" tab.
   *
   * Bootstrapping can also be automatically triggered at the same time, if the
   * current TorConnect stage allows for it.
   *
   * @param {object} [options] - extra options.
   * @param {"soft"|"hard"} [options.beginBootstrapping] - Whether to try and
   *   begin bootstrapping. "soft" will only trigger the bootstrap if we are not
   *   `potentiallyBlocked`. "hard" will try begin the bootstrap regardless.
   * @param {string} [options.regionCode] - A region to pass in for
   *   auto-bootstrapping.
   */
  static open(options) {
    if (!TorConnect.shouldShowTorConnect) {
      // Already bootstrapped, so don't reopen about:torconnect.
      return;
    }

    const win = lazy.BrowserWindowTracker.getTopWindow();
    win.switchToTabHavingURI("about:torconnect", true, {
      ignoreQueryString: true,
    });

    if (
      !options?.beginBootstrapping ||
      (options.beginBootstrapping !== "hard" &&
        TorConnect.potentiallyBlocked) ||
      (options.regionCode && !TorConnect.canBeginAutoBootstrap) ||
      (!options.regionCode && !TorConnect.canBeginNormalBootstrap)
    ) {
      return;
    }

    TorConnect.beginBootstrapping(options.regionCode);
  }

  /**
   * Convert the given url into an about:torconnect page that redirects to it.
   *
   * @param {string} url - The url to convert.
   *
   * @returns {string} - The about:torconnect url.
   */
  static getRedirectURL(url) {
    return `about:torconnect?redirect=${encodeURIComponent(url)}`;
  }

  /**
   * Convert the given object into a list of valid URIs.
   *
   * The object is either from the user's homepage preference (which may
   * contain multiple domains separated by "|") or uris passed to the browser
   * via command-line.
   *
   * @param {string|string[]} uriVariant - The string to extract uris from.
   *
   * @returns {string[]} - The array of uris found.
   */
  static fixupURIs(uriVariant) {
    let uriArray;
    if (typeof uriVariant === "string") {
      uriArray = uriVariant.split("|");
    } else if (
      Array.isArray(uriVariant) &&
      uriVariant.every(entry => typeof entry === "string")
    ) {
      uriArray = uriVariant;
    } else {
      // about:tor as safe fallback
      console.error(`Received unknown variant '${JSON.stringify(uriVariant)}'`);
      uriArray = ["about:tor"];
    }

    // Attempt to convert user-supplied string to a uri, fallback to
    // about:tor if cannot convert to valid uri object
    return uriArray.map(uriString => {
      try {
        return (
          Services.uriFixup.getFixupURIInfo(
            uriString,
            Ci.nsIURIFixup.FIXUP_FLAG_NONE
          ).preferredURI?.spec ?? "about:tor"
        );
      } catch (e) {
        console.error(`Failed to parse ${uriString}`, e);
        return "about:tor";
      }
    });
  }

  /**
   * Replace startup URIs (home pages or command line) with about:torconnect
   * URIs which redirect to them after bootstrapping.
   *
   * @param {string|string[]} uriVariant - The string to extract uris from.
   *
   * @returns {string[]} - The array or uris to use instead.
   */
  static getURIsToLoad(uriVariant) {
    const uris = this.fixupURIs(uriVariant);
    const localUriRx = /^(file:|moz-extension:)/;
    return uris.map(uri =>
      localUriRx.test(uri) ? uri : this.getRedirectURL(uri)
    );
  }
}
