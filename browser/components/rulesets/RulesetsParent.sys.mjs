// Copyright (c) 2022, The Tor Project, Inc.

import {
  OnionAliasStore,
  OnionAliasStoreTopics,
} from "resource:///modules/OnionAliasStore.sys.mjs";

const kShowWarningPref = "torbrowser.rulesets.show_warning";

/**
 * This class relays the changes the user's changes from about:rulesets to the
 * rulesets database.
 */
export class RulesetsParent extends JSWindowActorParent {
  constructor(...args) {
    super(...args);

    const self = this;
    this.observer = {
      observe(aSubject, aTopic) {
        const obj = aSubject?.wrappedJSObject;
        if (aTopic === OnionAliasStoreTopics.ChannelsChanged && obj) {
          self.sendAsyncMessage("rulesets:channels-change", obj);
        }
      },
    };
    Services.obs.addObserver(
      this.observer,
      OnionAliasStoreTopics.ChannelsChanged
    );
  }

  willDestroy() {
    Services.obs.removeObserver(
      this.observer,
      OnionAliasStoreTopics.ChannelsChanged
    );
  }

  async receiveMessage(message) {
    switch (message.name) {
      // RPMSendAsyncMessage
      case "rulesets:delete-channel":
        OnionAliasStore.deleteChannel(message.data);
        break;
      case "rulesets:enable-channel":
        OnionAliasStore.enableChannel(message.data.name, message.data.enabled);
        break;
      case "rulesets:set-show-warning":
        Services.prefs.setBoolPref(kShowWarningPref, message.data);
        break;
      // RPMSendQuery
      case "rulesets:get-channels":
        return OnionAliasStore.getChannels();
      case "rulesets:get-init-args":
        return {
          showWarning: Services.prefs.getBoolPref(kShowWarningPref, true),
        };
      case "rulesets:set-channel":
        const ch = await OnionAliasStore.setChannel(message.data);
        return ch;
      case "rulesets:update-channel":
        // We need to catch any error in this way, because in case of an
        // exception, RPMSendQuery does not return on the other side
        try {
          const channel = await OnionAliasStore.updateChannel(message.data);
          return channel;
        } catch (err) {
          console.error("Cannot update the channel", err);
          return { error: err.toString() };
        }
    }
    return undefined;
  }
}
