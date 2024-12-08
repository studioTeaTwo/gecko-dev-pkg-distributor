// Interface for window.ssi prototype
import { postMessage } from "./postMessage"

export function init() {
  // It envisions browser-native API, so the object is persisted.
  window.ssi = Object.freeze(WindowSSI)

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data.id !== "native") {
      return
    }

    const action = event.data.data.action
    const data = event.data.data.data
    if (event.data.scope === "nostr") {
      window.ssi.nostr.dispatchEvent(
        new CustomEvent(`nostr:${action.toLowerCase()}`, {
          detail: data,
          bubbles: false,
          composed: true,
        })
      )
    }
  })
}

export const WindowSSI: WindowSSI = {
  _scope: "ssi",
  _proxy: new EventTarget(),

  nostr: Object.freeze({
    generate(option) {
      return Promise.resolve("publickey")
    },
    getPublicKey(option) {
      return postMessage("nostr", "getPublicKey", undefined)
    },
    sign(message, option) {
      return postMessage("nostr", option.type, message)
    },
    decrypt(ciphertext, option) {
      return Promise.resolve("plaintext")
    },

    // NOTE(ssb): A experimental feature for providers. Currently not freeze nor seal.
    // ref: https://github.com/nostr-protocol/nips/pull/1174
    messageBoard: {},

    _proxy: new EventTarget(),
    dispatchEvent(event) {
      return WindowSSI.nostr._proxy.dispatchEvent(event)
    },
    addEventListener(
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: AddEventListenerOptions | boolean
    ) {
      return WindowSSI.nostr._proxy.addEventListener(type, callback, options)
    },
    removeEventListener(
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: EventListenerOptions | boolean
    ) {
      return WindowSSI.nostr._proxy.removeEventListener(type, callback, options)
    },
  }),

  dispatchEvent(event: Event) {
    return WindowSSI._proxy.dispatchEvent(event)
  },
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ) {
    return WindowSSI._proxy.addEventListener(type, callback, options)
  },
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ) {
    return WindowSSI._proxy.removeEventListener(type, callback, options)
  },
}
