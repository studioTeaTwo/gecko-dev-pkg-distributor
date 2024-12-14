// NOTE(ssb): We can hold multiple selfsovereignidentities here, just within background.
// But don't expose them to the contents, so that Peter Todd is not suspected of being Satoshi Nakamoto.
export const state = {
  nostr: {
    credentialName: "",
    npub: "",
    prefs: {
      enabled: true,
    },
  },
}
