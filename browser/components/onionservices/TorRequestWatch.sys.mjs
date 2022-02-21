/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const log = console.createInstance({
  maxLogLevelPref: "browser.torRequestWatch.log_level",
  prefix: "TorRequestWatch",
});

/**
 * This request observer blocks all the cross-site requests to *.tor.onion
 * domains to prevent fingerprinting Onion alias mechanisms (or their lack).
 */
class RequestObserver {
  static #topics = [
    "http-on-modify-request",
    "http-on-examine-response",
    "http-on-examine-cached-response",
    "http-on-examine-merged-response",
  ];
  #asObserver(addOrRemove) {
    const action = Services.obs[`${addOrRemove}Observer`].bind(Services.obs);
    for (const topic of RequestObserver.#topics) {
      action(this, topic);
    }
  }

  start() {
    this.#asObserver("add");
    log.debug("Started");
  }
  stop() {
    this.#asObserver("remove");
    log.debug("Stopped");
  }

  // nsIObserver implementation
  observe(subject, topic) {
    try {
      let channel = ChannelWrapper.get(
        subject.QueryInterface(Ci.nsIHttpChannel)
      );
      switch (topic) {
        case "http-on-modify-request":
          this.onRequest(channel);
          break;
        case "http-on-examine-cached-response":
        case "http-on-examine-merged-response":
          channel.isCached = true;
        // falls through
        case "http-on-examine-response":
          this.onResponse(channel);
          break;
      }
    } catch (e) {
      log.error(e);
    }
  }

  onRequest(channel) {
    if (this.shouldBlind(channel, channel.documentURL)) {
      log.warn(`Blocking cross-site ${channel.finalURL} ${channel.type} load.`);
      channel.cancel(Cr.NS_ERROR_ABORT);
    }
  }
  onResponse(channel) {
    if (!channel.documentURL && this.shouldBlind(channel, channel.originURL)) {
      const COOP = "cross-origin-opener-policy";
      // we break window.opener references if needed to mitigate XS-Leaks
      for (let h of channel.getResponseHeaders()) {
        if (h.name.toLowerCase() === COOP && h.value === "same-origin") {
          log.debug(`${COOP} is already same-origin, nothing to do.`);
          return;
        }
      }
      log.warn(`Blinding cross-site ${channel.finalURL} load.`);
      channel.setResponseHeader(COOP, "same-origin-allow-popups");
    }
  }

  isCrossOrigin(url1, url2) {
    return new URL(url1).origin !== new URL(url2).origin;
  }
  shouldBlindCrossOrigin(uri) {
    try {
      let { host } = uri;
      if (host.endsWith(".onion")) {
        const previousPart = host.slice(-10, -6);
        return (
          previousPart && (previousPart === ".tor" || previousPart === ".bit")
        );
      }
    } catch (e) {
      // no host
    }
    return false;
  }
  shouldBlind(channel, sourceURL) {
    return (
      sourceURL &&
      this.shouldBlindCrossOrigin(channel.finalURI) &&
      this.isCrossOrigin(channel.finalURL, sourceURL)
    );
  }
}

let observer;
export const TorRequestWatch = {
  start() {
    if (!observer) {
      (observer = new RequestObserver()).start();
    }
  },
  stop() {
    if (observer) {
      observer.stop();
      observer = null;
    }
  },
};
