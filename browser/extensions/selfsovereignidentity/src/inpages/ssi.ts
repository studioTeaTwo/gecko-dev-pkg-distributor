// Interface for window.ssi prototype

export function init() {
  window.ssi = WindowSSI

  window.addEventListener("message", (event) => {
    if (event.source === window && event.data.scope === "nostr") {
      if (event.data.action === "accountChanged") {
        window.ssi.nostr.publicKey = event.data.data
        // NOTE: There may be no need to emit it, so that Peter Todd is not suspected of being Satoshi Nakamoto.
        window.dispatchEvent(new Event("nostr:accountchanged"))
      }
    }
  })
}

export const WindowSSI = {
  _scope: "ssi",

  nostr: {
    publicKey: "",
    generate(option) {
      return "publickey"
    },
    sign(message, option) {
      return "signature"
    },
    decrypt(ciphertext, option) {
      return "plaintext"
    },
  },
}
