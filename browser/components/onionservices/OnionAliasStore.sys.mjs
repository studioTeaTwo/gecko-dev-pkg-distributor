// Copyright (c) 2022, The Tor Project, Inc.

import { setTimeout, clearTimeout } from "resource://gre/modules/Timer.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  JSONFile: "resource://gre/modules/JSONFile.sys.mjs",
  TorRequestWatch: "resource:///modules/TorRequestWatch.sys.mjs",
});

/* OnionAliasStore observer topics */
export const OnionAliasStoreTopics = Object.freeze({
  ChannelsChanged: "onionaliasstore:channels-changed",
});

const SECURE_DROP = {
  name: "SecureDropTorOnion2021",
  pathPrefix: "https://securedrop.org/https-everywhere-2021/",
  jwk: {
    kty: "RSA",
    e: "AQAB",
    n: "vsC7BNafkRe8Uh1DUgCkv6RbPQMdJgAKKnWdSqQd7tQzU1mXfmo_k1Py_2MYMZXOWmqSZ9iwIYkykZYywJ2VyMGve4byj1sLn6YQoOkG8g5Z3V4y0S2RpEfmYumNjTzfq8nxtLnwjaYd4sCUd5wa0SzeLrpRQuXo2bF3QuUF2xcbLJloxX1MmlsMMCdBc-qGNonLJ7bpn_JuyXlDWy1Fkeyw1qgjiOdiRIbMC1x302zgzX6dSrBrNB8Cpsh-vCE0ZjUo8M9caEv06F6QbYmdGJHM0ZZY34OHMSNdf-_qUKIV_SuxuSuFE99tkAeWnbWpyI1V-xhVo1sc7NzChP8ci2TdPvI3_0JyAuCvL6zIFqJUJkZibEUghhg6F09-oNJKpy7rhUJq7zZyLXJsvuXnn0gnIxfjRvMcDfZAKUVMZKRdw7fwWzwQril4Ib0MQOVda9vb_4JMk7Gup-TUI4sfuS4NKwsnKoODIO-2U5QpJWdtp1F4AQ1pBv8ajFl1WTrVGvkRGK0woPWaO6pWyJ4kRnhnxrV2FyNNt3JSR-0JEjhFWws47kjBvpr0VRiVRFppKA-plKs4LPlaaCff39TleYmY3mETe3w1GIGc2Lliad32Jpbx496IgDe1K3FMBEoKFZfhmtlRSXft8NKgSzPt2zkatM9bFKfaCYRaSy7akbk",
  },
  scope: /^https?:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.securedrop\.tor\.onion\//,
  enabled: true,
  mappings: [],
  currentTimestamp: 0,
};

const kPrefOnionAliasEnabled = "browser.urlbar.onionRewrites.enabled";

const log = console.createInstance({
  maxLogLevelPref: "browser.onionalias.log_level",
  prefix: "OnionAlias",
});

// Inspired by aboutMemory.js and PingCentre.jsm
function gunzip(buffer) {
  return new Promise(resolve => {
    const listener = Cc["@mozilla.org/network/stream-loader;1"].createInstance(
      Ci.nsIStreamLoader
    );
    listener.init({
      onStreamComplete(loader, context, status, length, result) {
        resolve(String.fromCharCode(...result));
      },
    });
    const scs = Cc["@mozilla.org/streamConverters;1"].getService(
      Ci.nsIStreamConverterService
    );
    const converter = scs.asyncConvertData(
      "gzip",
      "uncompressed",
      listener,
      null
    );
    const stream = Cc[
      "@mozilla.org/io/arraybuffer-input-stream;1"
    ].createInstance(Ci.nsIArrayBufferInputStream);
    stream.setData(buffer, 0, buffer.byteLength);
    converter.onStartRequest(null, null);
    converter.onDataAvailable(null, stream, 0, buffer.byteLength);
    converter.onStopRequest(null, null, null);
  });
}

/**
 * A channel that distributes Onion aliases.
 *
 * Each channel needs:
 *  - a name
 *  - a key used to sign the rules
 *  - a path prefix that will be used to build the URLs used to fetch updates
 *  - a scope (the apex domain for all aliases, and it must be a subdomain of
 *    .tor.onion).
 */
class Channel {
  static get SIGN_ALGORITHM() {
    return {
      name: "RSA-PSS",
      saltLength: 32,
      hash: { name: "SHA-256" },
    };
  }

  constructor(name, pathPrefix, jwk, scope, enabled) {
    this.name = name;
    this.pathPrefix = pathPrefix;
    this.jwk = jwk;
    this.scope = scope;
    this._enabled = enabled;

    this.mappings = [];
    this.currentTimestamp = 0;
    this.latestTimestamp = 0;
  }

  async updateLatestTimestamp() {
    const timestampUrl = this.pathPrefix + "/latest-rulesets-timestamp";
    log.debug(`Updating ${this.name} timestamp from ${timestampUrl}`);
    const response = await fetch(timestampUrl);
    if (!response.ok) {
      throw Error(`Could not fetch timestamp for ${this.name}`, {
        cause: response.status,
      });
    }
    const timestampStr = await response.text();
    const timestamp = parseInt(timestampStr);
    // Avoid hijacking, sanitize the timestamp
    if (isNaN(timestamp)) {
      throw Error("Latest timestamp is not a number");
    }
    log.debug(`Updated ${this.name} timestamp: ${timestamp}`);
    this.latestTimestamp = timestamp;
  }

  async makeKey() {
    return crypto.subtle.importKey(
      "jwk",
      this.jwk,
      Channel.SIGN_ALGORITHM,
      false,
      ["verify"]
    );
  }

  async downloadVerifiedRules() {
    log.debug(`Downloading and verifying ruleset for ${this.name}`);

    const key = await this.makeKey();
    const signatureUrl =
      this.pathPrefix + `/rulesets-signature.${this.latestTimestamp}.sha256`;
    const signatureResponse = await fetch(signatureUrl);
    if (!signatureResponse.ok) {
      throw Error("Could not fetch the rules signature");
    }
    const signature = await signatureResponse.arrayBuffer();

    const rulesUrl =
      this.pathPrefix + `/default.rulesets.${this.latestTimestamp}.gz`;
    const rulesResponse = await fetch(rulesUrl);
    if (!rulesResponse.ok) {
      throw Error("Could not fetch rules");
    }
    const rulesGz = await rulesResponse.arrayBuffer();

    if (
      !(await crypto.subtle.verify(
        Channel.SIGN_ALGORITHM,
        key,
        signature,
        rulesGz
      ))
    ) {
      throw Error("Could not verify rules signature");
    }
    log.debug(
      `Downloaded and verified rules for ${this.name}, now uncompressing`
    );
    this._makeMappings(JSON.parse(await gunzip(rulesGz)));
  }

  _makeMappings(rules) {
    const toTest = /^https?:\/\/[a-zA-Z0-9\.]{56}\.onion$/;
    const mappings = [];
    rules.rulesets.forEach(rule => {
      if (rule.rule.length != 1) {
        log.warn(`Unsupported rule lenght: ${rule.rule.length}`);
        return;
      }
      if (!toTest.test(rule.rule[0].to)) {
        log.warn(
          `Ignoring rule, because of a malformed to: ${rule.rule[0].to}`
        );
        return;
      }
      let toHostname;
      try {
        const toUrl = new URL(rule.rule[0].to);
        toHostname = toUrl.hostname;
      } catch (err) {
        log.error(
          "Cannot detect the hostname from the to rule",
          rule.rule[0].to,
          err
        );
      }
      let fromRe;
      try {
        fromRe = new RegExp(rule.rule[0].from);
      } catch (err) {
        log.error("Malformed from field", rule.rule[0].from, err);
        return;
      }
      for (const target of rule.target) {
        if (
          target.endsWith(".tor.onion") &&
          this.scope.test(`http://${target}/`) &&
          fromRe.test(`http://${target}/`)
        ) {
          mappings.push([target, toHostname]);
        } else {
          log.warn("Ignoring malformed rule", rule);
        }
      }
    });
    this.mappings = mappings;
    this.currentTimestamp = rules.timestamp;
    log.debug(`Updated mappings for ${this.name}`, mappings);
  }

  async updateMappings(force) {
    force = force === undefined ? false : !!force;
    if (!this._enabled && !force) {
      return;
    }
    await this.updateLatestTimestamp();
    if (this.latestTimestamp <= this.currentTimestamp && !force) {
      log.debug(
        `Rules for ${this.name} are already up to date, skipping update`
      );
      return;
    }
    await this.downloadVerifiedRules();
  }

  get enabled() {
    return this._enabled;
  }
  set enabled(enabled) {
    this._enabled = enabled;
    if (!enabled) {
      this.mappings = [];
      this.currentTimestamp = 0;
      this.latestTimestamp = 0;
    }
  }

  toJSON() {
    let scope = this.scope.toString();
    scope = scope.substr(1, scope.length - 2);
    return {
      name: this.name,
      pathPrefix: this.pathPrefix,
      jwk: this.jwk,
      scope,
      enabled: this._enabled,
      mappings: this.mappings,
      currentTimestamp: this.currentTimestamp,
    };
  }

  static fromJSON(obj) {
    let channel = new Channel(
      obj.name,
      obj.pathPrefix,
      obj.jwk,
      new RegExp(obj.scope),
      obj.enabled
    );
    if (obj.enabled) {
      channel.mappings = obj.mappings;
      channel.currentTimestamp = obj.currentTimestamp;
    }
    return channel;
  }
}

/**
 * The manager of onion aliases.
 * It allows creating, reading, updating and deleting channels and it keeps them
 * updated.
 *
 * This class is a singleton which should be accessed with OnionAliasStore.
 */
class _OnionAliasStore {
  static get RULESET_CHECK_INTERVAL() {
    return 86400 * 1000; // 1 day, like HTTPS-Everywhere
  }

  constructor() {
    this._channels = new Map();
    this._rulesetTimeout = null;
    this._lastCheck = 0;
    this._storage = null;
  }

  async init() {
    lazy.TorRequestWatch.start();
    await this._loadSettings();
    if (this.enabled) {
      await this._startUpdates();
    }
    Services.prefs.addObserver(kPrefOnionAliasEnabled, this);
  }

  uninit() {
    this._clear();
    if (this._rulesetTimeout) {
      clearTimeout(this._rulesetTimeout);
    }
    this._rulesetTimeout = null;
    Services.prefs.removeObserver(kPrefOnionAliasEnabled, this);
    lazy.TorRequestWatch.stop();
  }

  async getChannels() {
    if (this._storage === null) {
      await this._loadSettings();
    }
    return Array.from(this._channels.values(), ch => ch.toJSON());
  }

  async setChannel(chanData) {
    const name = chanData.name?.trim();
    if (!name) {
      throw Error("Name cannot be empty");
    }

    new URL(chanData.pathPrefix);
    const scope = new RegExp(chanData.scope);
    const ch = new Channel(
      name,
      chanData.pathPrefix,
      chanData.jwk,
      scope,
      !!chanData.enabled
    );
    // Call makeKey to make it throw if the key is invalid
    await ch.makeKey();
    this._channels.set(name, ch);
    this._applyMappings();
    this._saveSettings();
    setTimeout(this._notifyChanges.bind(this), 1);
    return ch;
  }

  enableChannel(name, enabled) {
    const channel = this._channels.get(name);
    if (channel !== null) {
      channel.enabled = enabled;
      this._applyMappings();
      this._saveSettings();
      this._notifyChanges();
      if (this.enabled && enabled && !channel.currentTimestamp) {
        this.updateChannel(name);
      }
    }
  }

  async updateChannel(name) {
    if (!this.enabled) {
      throw Error("Onion Aliases are disabled");
    }
    const channel = this._channels.get(name);
    if (channel === null) {
      throw Error("Channel not found");
    }
    await channel.updateMappings(true);
    this._saveSettings();
    this._applyMappings();
    setTimeout(this._notifyChanges.bind(this), 1);
    return channel;
  }

  deleteChannel(name) {
    if (this._channels.delete(name)) {
      this._saveSettings();
      this._applyMappings();
      this._notifyChanges();
    }
  }

  async _loadSettings() {
    if (this._storage !== null) {
      return;
    }
    this._channels = new Map();
    this._storage = new lazy.JSONFile({
      path: PathUtils.join(
        Services.dirsvc.get("ProfD", Ci.nsIFile).path,
        "onion-aliases.json"
      ),
      dataPostProcessor: this._settingsProcessor.bind(this),
    });
    await this._storage.load();
    log.debug("Loaded settings", this._storage.data, this._storage.path);
    this._applyMappings();
    this._notifyChanges();
  }

  _settingsProcessor(data) {
    if ("lastCheck" in data) {
      this._lastCheck = data.lastCheck;
    } else {
      data.lastCheck = 0;
    }
    if (!("channels" in data) || !Array.isArray(data.channels)) {
      data.channels = [SECURE_DROP];
      // Force updating
      data.lastCheck = 0;
    }
    const channels = new Map();
    data.channels = data.channels.filter(ch => {
      try {
        channels.set(ch.name, Channel.fromJSON(ch));
      } catch (err) {
        log.error("Could not load a channel", err, ch);
        return false;
      }
      return true;
    });
    this._channels = channels;
    return data;
  }

  _saveSettings() {
    if (this._storage === null) {
      throw Error("Settings have not been loaded");
    }
    this._storage.data.lastCheck = this._lastCheck;
    this._storage.data.channels = Array.from(this._channels.values(), ch =>
      ch.toJSON()
    );
    this._storage.saveSoon();
  }

  _addMapping(shortOnionHost, longOnionHost) {
    const service = Cc["@torproject.org/onion-alias-service;1"].getService(
      Ci.IOnionAliasService
    );
    service.addOnionAlias(shortOnionHost, longOnionHost);
  }

  _clear() {
    const service = Cc["@torproject.org/onion-alias-service;1"].getService(
      Ci.IOnionAliasService
    );
    service.clearOnionAliases();
  }

  _applyMappings() {
    this._clear();
    for (const ch of this._channels.values()) {
      if (!ch.enabled) {
        continue;
      }
      for (const [short, long] of ch.mappings) {
        this._addMapping(short, long);
      }
    }
  }

  async _periodicRulesetCheck() {
    if (!this.enabled) {
      log.debug("Onion Aliases are disabled, not updating rulesets.");
      return;
    }
    log.debug("Begin scheduled ruleset update");
    this._lastCheck = Date.now();
    let anyUpdated = false;
    for (const ch of this._channels.values()) {
      if (!ch.enabled) {
        log.debug(`Not updating ${ch.name} because not enabled`);
        continue;
      }
      log.debug(`Updating ${ch.name}`);
      try {
        await ch.updateMappings();
        anyUpdated = true;
      } catch (err) {
        log.error(`Could not update mappings for channel ${ch.name}`, err);
      }
    }
    if (anyUpdated) {
      this._saveSettings();
      this._applyMappings();
      this._notifyChanges();
    } else {
      log.debug("No channel has been updated, avoid saving");
    }
    this._scheduleCheck(_OnionAliasStore.RULESET_CHECK_INTERVAL);
  }

  async _startUpdates() {
    // This is a "private" function, so we expect the callers to verify wheter
    // onion aliases are enabled.
    // Callees will also do, so we avoid an additional check here.
    const dt = Date.now() - this._lastCheck;
    let force = false;
    for (const ch of this._channels.values()) {
      if (ch.enabled && !ch.currentTimestamp) {
        // Edited while being offline or some other error happened
        force = true;
        break;
      }
    }
    if (dt > _OnionAliasStore.RULESET_CHECK_INTERVAL || force) {
      log.debug(
        `Mappings are stale (${dt}), or force check requested (${force}), checking them immediately`
      );
      await this._periodicRulesetCheck();
    } else {
      this._scheduleCheck(_OnionAliasStore.RULESET_CHECK_INTERVAL - dt);
    }
  }

  _scheduleCheck(dt) {
    if (this._rulesetTimeout) {
      log.warn("The previous update timeout was not null");
      clearTimeout(this._rulesetTimeout);
    }
    if (!this.enabled) {
      log.warn(
        "Ignoring the scheduling of a new check because the Onion Alias feature is currently disabled."
      );
      this._rulesetTimeout = null;
      return;
    }
    log.debug(`Scheduling ruleset update in ${dt}`);
    this._rulesetTimeout = setTimeout(() => {
      this._rulesetTimeout = null;
      this._periodicRulesetCheck();
    }, dt);
  }

  _notifyChanges() {
    Services.obs.notifyObservers(
      Array.from(this._channels.values(), ch => ch.toJSON()),
      OnionAliasStoreTopics.ChannelsChanged
    );
  }

  get enabled() {
    return Services.prefs.getBoolPref(kPrefOnionAliasEnabled, true);
  }

  observe(aSubject, aTopic) {
    if (aTopic === "nsPref:changed") {
      if (this.enabled) {
        this._startUpdates();
      } else if (this._rulesetTimeout) {
        clearTimeout(this._rulesetTimeout);
        this._rulesetTimeout = null;
      }
    }
  }
}

export const OnionAliasStore = new _OnionAliasStore();
