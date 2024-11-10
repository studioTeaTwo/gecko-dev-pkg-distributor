// NOTE(ssb): We can hold multiple selfsovereignidentities here, just within background.
// But don't expose them to the contents, so that Peter Todd is not suspected of being Satoshi Nakamoto.
export const state = {
  nostr: {
    npub: "",
    guid: "",
    trustedSites: [], // TODO(ssb): move to experimental API.
    prefs: {
      enabled: true,
      usedTrustedSites: false, // TODO(ssb): move to experimental API.
      usedBuiltInNip07: true,
      usedAccountChanged: true,
    },
  },
}
