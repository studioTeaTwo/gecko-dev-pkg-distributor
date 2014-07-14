/**
 * A component for Tor Browser that puts requests from different first party
 * domains on separate Tor circuits.
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import {
  clearInterval,
  setInterval,
} from "resource://gre/modules/Timer.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  TorProviderBuilder: "resource://gre/modules/TorProviderBuilder.sys.mjs",
  TorProviderTopics: "resource://gre/modules/TorProviderBuilder.sys.mjs",
});

XPCOMUtils.defineLazyServiceGetters(lazy, {
  ProtocolProxyService: [
    "@mozilla.org/network/protocol-proxy-service;1",
    "nsIProtocolProxyService",
  ],
});

const logger = console.createInstance({
  prefix: "TorDomainIsolator",
  maxLogLevelPref: "browser.tordomainisolator.loglevel",
});

// The string to use instead of the domain when it is not known.
const CATCHALL_DOMAIN = "--unknown--";

// The maximum lifetime for the catch-all circuit in milliseconds.
// When the catch-all circuit is needed, we check if more than this amount of
// time has passed since we last changed it nonce, and in case we change it
// again.
const CATCHALL_MAX_LIFETIME = 600_000;

// The preference to observe, to know whether isolation should be enabled or
// disabled.
const NON_TOR_PROXY_PREF = "extensions.torbutton.use_nontor_proxy";

// The topic of new identity, to observe to cleanup all the nonces.
const NEW_IDENTITY_TOPIC = "new-identity-requested";

// The topic on which we broacast circuit change notifications.
const TOR_CIRCUIT_TOPIC = "TorCircuitChange";

// We have an interval to delete circuits that are not reclaimed by any browser.
const CLEAR_TIMEOUT = 600_000;

/**
 * @typedef {string} CircuitId A string that we use to identify a circuit.
 * Currently, it is a string that combines SOCKS credentials, to make it easier
 * to use as a map key.
 * It is not related to Tor's CircuitIDs.
 */
/**
 * @typedef {number} BrowserId
 */
/**
 * @typedef {NodeData[]} CircuitData The data about the nodes, ordered from
 * guard (or bridge) to exit.
 */
/**
 * @typedef BrowserCircuits Circuits related to a certain combination of
 * isolators (first-party domain and user context ID, currently).
 * @property {CircuitId} current The id of the last known circuit that has been
 * used to fetch data for the isolated context.
 * @property {CircuitId?} pending The id of the last used circuit for this
 * isolation context. We might or might not know data about it, yet. But if we
 * know it, we should move this id into current.
 */

/**
 * This class implements circuit-isolation based on first-party domains and user
 * context IDs.
 * It takes for granted the tor daemon is configured with IsolateSOCKSAuth (or
 * an equivalent option for other backends), so that it can hijack the proxy
 * configuration to update its username and password.
 *
 * This class also collects the data that will be used by the circuit display.
 */
class TorDomainIsolatorImpl {
  /**
   * A mutable map that records what nonce we are using for each domain.
   *
   * @type {Map<string, string>}
   */
  #noncesForDomains = new Map();

  /**
   * A mutable map that records what nonce we are using for each tab container.
   *
   * @type {Map<string, string>}
   */
  #noncesForUserContextId = new Map();

  /**
   * Tell whether we use SOCKS auth for isolation or not.
   *
   * @type {boolean}
   */
  #isolationEnabled = true;

  /**
   * Specifies when the current catch-all circuit was first used.
   *
   * @type {integer}
   */
  #catchallDirtySince = Date.now();

  /**
   * A map that associates circuit ids to the circuit information.
   *
   * @type {Map<CircuitId, CircuitData>}
   */
  #knownCircuits = new Map();

  /**
   * A map that associates a certain browser to all the circuits it used or it
   * is going to use.
   * The circuits are keyed on the SOCKS username, which we take for granted
   * being a combination of the first-party domain and the user context id.
   *
   * @type {Map<BrowserId, Map<string, BrowserCircuits>>}
   */
  #browsers = new Map();

  /**
   * The handle of the interval we use to cleanup old circuit data.
   *
   * @type {number?}
   */
  #cleanupIntervalId = null;

  /**
   * Initialize the domain isolator.
   * This function will setup the proxy filter that injects the credentials,
   * register some observers, and setup the cleaning interval.
   */
  init() {
    logger.info("Setup circuit isolation by domain and user context");

    if (Services.prefs.getBoolPref(NON_TOR_PROXY_PREF, false)) {
      this.#isolationEnabled = false;
      logger.info(
        `The domain isolation will not be enabled because of ${NON_TOR_PROXY_PREF}.`
      );
    }
    this.#setupProxyFilter();

    Services.prefs.addObserver(NON_TOR_PROXY_PREF, this);
    Services.obs.addObserver(this, NEW_IDENTITY_TOPIC);
    Services.obs.addObserver(
      this,
      lazy.TorProviderTopics.CircuitCredentialsMatched
    );

    this.#cleanupIntervalId = setInterval(
      this.#clearKnownCircuits.bind(this),
      CLEAR_TIMEOUT
    );
  }

  /**
   * Removes the observers added in the initialization and stops the cleaning
   * interval.
   */
  uninit() {
    Services.prefs.removeObserver(NON_TOR_PROXY_PREF, this);
    Services.obs.removeObserver(this, NEW_IDENTITY_TOPIC);
    Services.obs.removeObserver(
      this,
      lazy.TorProviderTopics.CircuitCredentialsMatched
    );
    clearInterval(this.#cleanupIntervalId);
    this.#cleanupIntervalId = null;
    this.clearIsolation();
  }

  enable() {
    logger.trace("Domain isolation enabled");
    this.#isolationEnabled = true;
  }

  disable() {
    logger.trace("Domain isolation disabled");
    this.#isolationEnabled = false;
  }

  /**
   * Get the last circuit used in a certain browser.
   * The returned data is created when the circuit is first seen, therefore it
   * could be stale (i.e., the circuit might not be available anymore).
   *
   * @param {MozBrowser} browser The browser to get data for
   * @param {string} domain The first party domain we want to get the circuit
   * for
   * @param {number} userContextId The user context domain we want to get the
   * circuit for
   * @returns {NodeData[]} The node data, or an empty array if we do not have
   * data for the requested key.
   */
  getCircuit(browser, domain, userContextId) {
    const username = this.#makeUsername(domain, userContextId);
    const circuits = this.#browsers.get(browser.browserId)?.get(username);
    // This is the only place where circuit data can go out, so the only place
    // where it makes a difference to check whether the pending circuit is still
    // pending, or it has actually got data.
    const pending = this.#knownCircuits.get(circuits?.pending);
    if (pending?.length) {
      circuits.current = circuits.pending;
      circuits.pending = null;
      return pending;
    }
    // TODO: At this point we already know if we expect a circuit change for
    // this key: (circuit?.pending && !pending). However, we do not consume this
    // data yet in the frontend, so do not send it for now.
    return this.#knownCircuits.get(circuits?.current) ?? [];
  }

  /**
   * Create a new nonce for the FP domain of the selected browser and reload the
   * tab with a new circuit.
   *
   * @param {object} browser The browser we want to change the circuit for.
   */
  newCircuitForBrowser(browser) {
    const firstPartyDomain = getDomainForBrowser(browser);
    this.newCircuitForDomain(firstPartyDomain);
    const { username, password } = this.#getSocksProxyCredentials(
      firstPartyDomain,
      browser.contentPrincipal.originAttributes.userContextId
    );
    this.#trackBrowser(browser, username, password);
    browser.reloadWithFlags(Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);
  }

  /**
   * Clear the isolation state cache, forcing new circuits to be used for all
   * subsequent requests.
   */
  clearIsolation() {
    logger.trace("Clearing isolation nonces.");

    // Per-domain and per contextId nonces are stored in maps, so simply clear
    // them.
    // Notice that the catch-all circuit is included in #noncesForDomains, so we
    // are implicilty cleaning it. Should this change, we should change its
    // nonce explicitly here.
    this.#noncesForDomains.clear();
    this.#noncesForUserContextId.clear();
    this.#catchallDirtySince = Date.now();

    this.#knownCircuits.clear();
    this.#browsers.clear();
  }

  async observe(subject, topic, data) {
    if (topic === "nsPref:changed" && data === NON_TOR_PROXY_PREF) {
      if (Services.prefs.getBoolPref(NON_TOR_PROXY_PREF)) {
        this.disable();
      } else {
        this.enable();
      }
    } else if (topic === NEW_IDENTITY_TOPIC) {
      logger.info(
        "New identity has been requested, clearing isolation tokens."
      );
      this.clearIsolation();
      try {
        const provider = await lazy.TorProviderBuilder.build();
        await provider.newnym();
      } catch (e) {
        logger.error("Could not send the newnym command", e);
        // TODO: What UX to use here? See tor-browser#41708
      }
    } else if (topic === lazy.TorProviderTopics.CircuitCredentialsMatched) {
      const { username, password, circuit } = subject.wrappedJSObject;
      this.#updateCircuit(username, password, circuit);
    }
  }

  /**
   * Setup a filter that for every HTTPChannel.
   */
  #setupProxyFilter() {
    lazy.ProtocolProxyService.registerChannelFilter(
      {
        applyFilter: (aChannel, aProxy, aCallback) => {
          aCallback.onProxyFilterResult(this.#proxyFilter(aChannel, aProxy));
        },
      },
      0
    );
  }

  /**
   * Replaces the default SOCKS proxy with one that authenticates to the SOCKS
   * server (the tor client process) with a username (the first party domain and
   * userContextId) and a nonce password.
   * Tor provides a separate circuit for each username+password combination.
   *
   * @param {nsIChannel} aChannel The channel we are setting the proxy for
   * @param {nsIProxyInfo} aProxy The original proxy
   * @returns {nsIProxyInfo} The new proxy to use
   */
  #proxyFilter(aChannel, aProxy) {
    if (!this.#isolationEnabled) {
      return aProxy;
    }
    try {
      const channel = aChannel.QueryInterface(Ci.nsIChannel);
      let firstPartyDomain = channel.loadInfo.originAttributes.firstPartyDomain;
      const userContextId = channel.loadInfo.originAttributes.userContextId;
      const scheme = channel.loadInfo.loadingPrincipal?.URI?.scheme;
      const filePath = channel.loadInfo.loadingPrincipal?.URI?.filePath;
      if (
        (scheme === "about" && filePath === "reader") ||
        (scheme === "moz-extension" && filePath === "/readerview.html")
      ) {
        try {
          const searchParams = new URLSearchParams(
            channel.loadInfo.loadingPrincipal.URI.query
          );
          if (searchParams.has("url")) {
            firstPartyDomain = Services.eTLD.getSchemelessSite(
              Services.io.newURI(searchParams.get("url"))
            );
          }
        } catch (e) {
          logger.error("Failed to get first party domain for reader view", e);
        }
      }
      if (!firstPartyDomain) {
        firstPartyDomain = CATCHALL_DOMAIN;
        if (Date.now() - this.#catchallDirtySince > CATCHALL_MAX_LIFETIME) {
          logger.info(
            "tor catchall circuit has reached its maximum lifetime. Rotating."
          );
          this.newCircuitForDomain(CATCHALL_DOMAIN);
        }
      }
      const { username, password } = this.#getSocksProxyCredentials(
        firstPartyDomain,
        userContextId
      );
      const browser = this.#getBrowserForChannel(channel);
      if (browser) {
        this.#trackBrowser(browser, username, password);
      }
      logger.debug(`Requested ${channel.URI.spec} via ${username}:${password}`);
      const proxy = aProxy.QueryInterface(Ci.nsIProxyInfo);
      return lazy.ProtocolProxyService.newProxyInfoWithAuth(
        "socks",
        proxy.host,
        proxy.port,
        username,
        password,
        "", // aProxyAuthorizationHeader
        "", // aConnectionIsolationKey
        proxy.flags,
        proxy.failoverTimeout,
        proxy.failoverProxy
      );
    } catch (e) {
      logger.error("Error while setting a new proxy", e);
      return null;
    }
  }

  /**
   * Return the credentials to use as username and password for the SOCKS proxy,
   * given a certain domain and userContextId.
   * A new random password will be created if not available yet.
   *
   * @param {string} firstPartyDomain The first party domain associated to the
   * requests
   * @param {number} userContextId The context ID associated to the request
   * @returns {object} The credentials
   */
  #getSocksProxyCredentials(firstPartyDomain, userContextId) {
    if (!this.#noncesForDomains.has(firstPartyDomain)) {
      const nonce = this.#nonce();
      logger.info(`New nonce for first party ${firstPartyDomain}: ${nonce}`);
      this.#noncesForDomains.set(firstPartyDomain, nonce);
    }
    if (!this.#noncesForUserContextId.has(userContextId)) {
      const nonce = this.#nonce();
      logger.info(`New nonce for userContextId ${userContextId}: ${nonce}`);
      this.#noncesForUserContextId.set(userContextId, nonce);
    }
    // TODO: How to properly handle the user-context? Should we use
    // (domain, userContextId) pairs, instead of concatenating nonces?
    return {
      username: this.#makeUsername(firstPartyDomain, userContextId),
      password:
        this.#noncesForDomains.get(firstPartyDomain) +
        this.#noncesForUserContextId.get(userContextId),
    };
  }

  /**
   * Combine the needed data into a username for the proxy.
   *
   * @param {string} domain The first-party domain associated to the request
   * @param {integer} userContextId The userContextId associated to the request
   * @returns {string} The username to be passed to the SOCKS proxy
   */
  #makeUsername(domain, userContextId) {
    if (!domain) {
      domain = CATCHALL_DOMAIN;
    }
    return `${domain}:${userContextId}`;
  }

  /**
   * Combine SOCKS username and password into a string to use as ID.
   *
   * @param {string} username The SOCKS username
   * @param {string} password The SOCKS password
   * @returns {CircuitId} A string that combines username and password and can
   * be used for map lookups.
   */
  #credentialsToId(username, password) {
    return `${username}|${password}`;
  }

  /**
   * Generate a new 128 bit random tag.
   *
   * Strictly speaking both using a cryptographic entropy source and using 128
   * bits of entropy for the tag are likely overkill, as correct behavior only
   * depends on how unlikely it is for there to be a collision.
   *
   * @returns {string} The random nonce
   */
  #nonce() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }

  /**
   * Re-generate the nonce for a certain domain.
   *
   * @param {string?} domain The first-party domain to re-create the nonce for.
   * If empty or null, the catchall domain will be used.
   */
  newCircuitForDomain(domain) {
    if (!domain) {
      domain = CATCHALL_DOMAIN;
    }
    this.#noncesForDomains.set(domain, this.#nonce());
    if (domain === CATCHALL_DOMAIN) {
      this.#catchallDirtySince = Date.now();
    }
    logger.info(
      `New domain isolation for ${domain}: ${this.#noncesForDomains.get(
        domain
      )}`
    );
  }

  /**
   * Re-generate the nonce for a userContextId.
   *
   * Currently, this function is not hooked to anything.
   *
   * @param {integer} userContextId The userContextId to re-create the nonce for
   */
  // eslint-disable-next-line no-unused-private-class-members
  #newCircuitForUserContextId(userContextId) {
    this.#noncesForUserContextId.set(userContextId, this.#nonce());
    logger.info(
      `New container isolation for ${userContextId}: ${this.#noncesForUserContextId.get(
        userContextId
      )}`
    );
  }

  /**
   * Try to extract a browser from a channel.
   *
   * @param {nsIChannel} channel The channel to extract the browser from
   * @returns {MozBrowser?} The browser the channel is associated to
   */
  #getBrowserForChannel(channel) {
    const currentBrowser =
      channel.loadInfo.browsingContext?.topChromeWindow?.browser;
    if (
      channel.loadInfo.browsingContext &&
      currentBrowser?.browsingContext === channel.loadInfo.browsingContext
    ) {
      // Android has only one browser, and does not have the browsers property.
      return currentBrowser;
    }
    const browsers =
      channel.loadInfo.browsingContext?.topChromeWindow?.gBrowser?.browsers;
    if (!browsers || !channel.loadInfo.browsingContext?.browserId) {
      logger.debug("Missing data to associate to a browser", channel.loadInfo);
      return null;
    }
    for (const browser of browsers) {
      if (browser.browserId === channel.loadInfo.browsingContext.browserId) {
        logger.debug(
          "Matched browser with browserId",
          channel.loadInfo.browsingContext.browserId
        );
        return browser;
      }
    }
    // Expected to arrive here for example for the update checker.
    // If we find a way to check that, we could raise the level to a warn.
    logger.debug("Browser not matched", channel);
    return null;
  }

  /**
   * Associate the SOCKS credentials to a browser.
   * If needed (the browser is associated for the first time, or it was already
   * known but its credential changed), notify the related circuit display.
   *
   * @param {MozBrowser} browser The browser to track
   * @param {string} username The SOCKS username
   * @param {string} password The SOCKS password
   */
  #trackBrowser(browser, username, password) {
    let browserCircuits = this.#browsers.get(browser.browserId);
    if (!browserCircuits) {
      browserCircuits = new Map();
      this.#browsers.set(browser.browserId, browserCircuits);
    }
    const circuitIds = browserCircuits.get(username) ?? {};
    const id = this.#credentialsToId(username, password);
    if (circuitIds.current === id) {
      // The circuit with these credentials was already built (we already knew
      // its nodes, or we would not have promoted it to the current circuit).
      // We do not need to do anything else, because we cannot detect a change
      // of nodes here.
      return;
    }

    logger.debug(
      `Found new credentials ${username} ${password} for browser`,
      browser
    );
    const circuit = this.#knownCircuits.get(id);
    if (circuit?.length) {
      circuitIds.current = id;
      if (circuitIds.pending === id) {
        circuitIds.pending = null;
      }
      browserCircuits.set(username, circuitIds);
      // FIXME: We only notify the circuit display when we have a change that
      // involves circuits whose nodes are known, for now. We need to resolve a
      // few other techical problems (e.g., associate the circuit to the
      // document?) and develop a UX with some animation to notify the circuit
      // display more often.
      // See tor-browser#41700 and tor-browser!699.
      // In any case, notify the circuit display only after the internal map has
      // been updated.
      this.#notifyCircuitDisplay();
    } else if (circuitIds.pending !== id) {
      // We do not have node data, so we store that we might need to track this.
      // Otherwise, when a circuit is ready, we do not know which browser was it
      // used for.
      circuitIds.pending = id;
      browserCircuits.set(username, circuitIds);
    }
  }

  /**
   * Update a circuit, and notify the related circuit displays if it changed.
   *
   * This function is called when a certain stream has succeeded and so we can
   * associate its SOCKS credential to the circuit it is using.
   * We receive only the fingerprints of the circuit nodes, but they are enough
   * to check if the circuit has changed. If it has, we also get the nodes'
   * information through the control port.
   *
   * @param {string} username The SOCKS username
   * @param {string} password The SOCKS password
   * @param {NodeFingerprint[]} circuit The fingerprints of the nodes that
   * compose the circuit
   */
  async #updateCircuit(username, password, circuit) {
    const id = this.#credentialsToId(username, password);
    let data = this.#knownCircuits.get(id) ?? [];
    // Should we modify the lower layer to send a circuit identifier, instead?
    if (
      circuit.length === data.length &&
      circuit.every((id, index) => id === data[index].fingerprint)
    ) {
      return;
    }

    const provider = await lazy.TorProviderBuilder.build();
    data = await Promise.all(
      circuit.map(fingerprint => provider.getNodeInfo(fingerprint))
    );
    logger.debug(`Updating circuit ${id}`, data);
    this.#knownCircuits.set(id, data);
    // We know that something changed, but we cannot know if anyone is
    // interested in this change. So, we have to notify all the possible
    // consumers of the data in any case.
    // Not being specific and let them check if they need to do something allows
    // us to keep a simpler structure.
    this.#notifyCircuitDisplay();
  }

  /**
   * Broadcast a notification when a circuit changed, or a browser is changing
   * circuit (which might happen also in case of navigation).
   */
  #notifyCircuitDisplay() {
    Services.obs.notifyObservers(null, TOR_CIRCUIT_TOPIC);
  }

  /**
   * Clear the known circuit information, when they are not needed anymore.
   *
   * We keep circuit data around for a while. We decouple it from the underlying
   * tor circuit management in case the user clicks on the circuit display when
   * circuit has long gone.
   * However, data accumulate during a session. So, since we store all the
   * browsers that used a circuit anyway, every now and then we check if we
   * still know browsers using a certain circuits. If there are not, we forget
   * about it.
   *
   * This function is run by an interval.
   */
  #clearKnownCircuits() {
    logger.info("Running the circuit cleanup");
    const windows = [];
    const enumerator = Services.wm.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements()) {
      windows.push(enumerator.getNext());
    }
    const browsers = windows
      .flatMap(win => win.gBrowser.browsers.map(b => b.browserId))
      .filter(id => this.#browsers.has(id));
    this.#browsers = new Map(browsers.map(id => [id, this.#browsers.get(id)]));
    this.#knownCircuits = new Map(
      Array.from(this.#browsers.values(), circuits =>
        Array.from(circuits.values(), ids => {
          const r = [];
          const current = this.#knownCircuits.get(ids.current);
          if (current) {
            r.push([ids.current, current]);
          }
          const pending = this.#knownCircuits.get(ids.pending);
          if (pending) {
            r.push([ids.pending, pending]);
          }
          return r;
        })
      ).flat(2)
    );
  }
}

/**
 * Get the first party domain for a certain browser.
 *
 * @param {MozBrowser} browser The browser to get the FP-domain for.
 * Please notice that it should be gBrowser.selectedBrowser, because
 * browser.documentURI is the actual shown page, and might be an error page.
 * In this case, we rely on currentURI, which for gBrowser is an alias of
 * gBrowser.selectedBrowser.currentURI.
 * See browser/base/content/tabbrowser.js and tor-browser#31562.
 *
 * @returns {string} The FPD associated to the principal of the passed browser.
 */
function getDomainForBrowser(browser) {
  let fpd = browser.contentPrincipal.originAttributes.firstPartyDomain;

  const { documentURI } = browser;
  if (documentURI && documentURI.schemeIs("about")) {
    // Bug 31562: For neterror or certerror, get the original URL from
    // browser.currentURI and use it to calculate the firstPartyDomain.
    const knownErrors = [
      "about:neterror",
      "about:certerror",
      "about:httpsonlyerror",
    ];
    if (knownErrors.some(x => documentURI.spec.startsWith(x))) {
      const knownSchemes = ["http", "https"];
      const currentURI = browser.currentURI;
      if (currentURI && knownSchemes.some(x => currentURI.schemeIs(x))) {
        try {
          fpd = Services.eTLD.getBaseDomainFromHost(currentURI.host);
        } catch (e) {
          if (
            e.result === Cr.NS_ERROR_HOST_IS_IP_ADDRESS ||
            e.result === Cr.NS_ERROR_INSUFFICIENT_DOMAIN_LEVELS
          ) {
            fpd = currentURI.host;
          } else {
            logger.error(
              `Failed to get first party domain for host ${currentURI.host}`,
              e
            );
          }
        }
      }
    } else if (documentURI.spec.startsWith("about:reader")) {
      try {
        const searchParams = new URLSearchParams(documentURI.query);
        if (searchParams.has("url")) {
          fpd = Services.eTLD.getSchemelessSite(
            Services.io.newURI(searchParams.get("url"))
          );
        }
      } catch (e) {
        logger.error("Failed to get first party domain for about:reader", e);
      }
    }
  }

  return fpd;
}

export const TorDomainIsolator = new TorDomainIsolatorImpl();
// Reduce global vars pollution
TorDomainIsolator.getDomainForBrowser = getDomainForBrowser;
