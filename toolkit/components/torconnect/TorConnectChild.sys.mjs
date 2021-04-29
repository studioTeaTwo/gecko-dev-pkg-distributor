// Copyright (c) 2021, The Tor Project, Inc.

import { RemotePageChild } from "resource://gre/actors/RemotePageChild.sys.mjs";

/**
 * Actor child class for the about:torconnect page.
 * Most of the communication happens through RPM* calls, which do not go through
 * this class.
 */
export class TorConnectChild extends RemotePageChild {
  /**
   * Whether we have redirected the page (after bootstrapping) or not.
   *
   * @type {boolean}
   */
  #redirected = false;

  /**
   * If bootstrapping is complete, or TorConnect is disabled, we redirect the
   * page.
   */
  async #maybeRedirect() {
    if (await this.sendQuery("torconnect:should-show")) {
      // Enabled and not yet bootstrapped.
      return;
    }
    if (this.#redirected) {
      return;
    }
    this.#redirected = true;

    const redirect = new URLSearchParams(
      new URL(this.contentWindow.document.location.href).search
    ).get("redirect");

    // Fallback in error cases:
    let replaceURI = "about:tor";
    try {
      const url = new URL(
        redirect
          ? decodeURIComponent(redirect)
          : // NOTE: We expect no redirect when address is entered manually, or
            // about:torconnect is opened from preferences or urlbar.
            // Go to the home page.
            await this.sendQuery("torconnect:home-page")
      );
      // Do not allow javascript URI. See tor-browser#41766
      if (
        ["about:", "file:", "https:", "http:"].includes(url.protocol) ||
        // Allow blank page. See tor-browser#42184.
        // Blank page's are given as a chrome URL rather than "about:blank".
        url.href === "chrome://browser/content/blanktab.html"
      ) {
        replaceURI = url.href;
      } else {
        console.error(`Scheme is not allowed "${redirect}"`);
      }
    } catch {
      console.error(`Invalid redirect URL "${redirect}"`);
    }

    // Replace the destination to prevent "about:torconnect" entering the
    // history.
    // NOTE: This is done here, in the window actor, rather than in content
    // because we have the privilege to redirect to a "chrome:" uri here (for
    // when the HomePage is set to be blank).
    this.contentWindow.location.replace(replaceURI);
  }

  actorCreated() {
    super.actorCreated();
    // about:torconnect could need to be immediately redirected. E.g. if it is
    // reached after bootstrapping.
    this.#maybeRedirect();
  }

  receiveMessage(message) {
    super.receiveMessage(message);

    if (message.name === "torconnect:state-change") {
      this.#maybeRedirect();
    }
  }
}
