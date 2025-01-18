// Interface for window.ssi prototype
import { WindowSSI } from "src/custom.type";
import { postMessage } from "./postMessage";

export function init() {
  // It envisions browser-native API, so the object is persisted.
  window.ssi = Object.freeze(windowSSI);

  window.addEventListener("message", event => {
    if (event.source !== window || event.data.id !== "native") {
      return;
    }

    const action = event.data.data.action;
    const data = event.data.data.data;
    if (event.data.scope === "nostr") {
      window.ssi.nostr.dispatchEvent(
        new CustomEvent(action, {
          detail: data,
          bubbles: false,
          composed: true,
        })
      );
    }
  });
}

export const windowSSI: WindowSSI = {
  _scope: "ssi",
  _proxy: new EventTarget(),

  nostr: Object.freeze({
    generate(option) {
      return Promise.resolve("Not implemented");
    },
    getPublicKey(option) {
      return postMessage("nostr", "getPublicKey", option);
    },
    sign(message, option) {
      return postMessage("nostr", option.type, { message, ...option });
    },
    decrypt(ciphertext, option) {
      return Promise.resolve("Not implemented");
    },

    // NOTE(ssb): A experimental feature for providers. Currently not freeze nor seal.
    // ref: https://github.com/nostr-protocol/nips/pull/1174
    messageBoard: {},

    _proxy: new EventTarget(),
    dispatchEvent(event) {
      return windowSSI.nostr._proxy.dispatchEvent(event);
    },
    addEventListener(
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: AddEventListenerOptions | boolean
    ) {
      return windowSSI.nostr._proxy.addEventListener(type, callback, options);
    },
    removeEventListener(
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: EventListenerOptions | boolean
    ) {
      return windowSSI.nostr._proxy.removeEventListener(
        type,
        callback,
        options
      );
    },
  }),

  dispatchEvent(event: Event) {
    return windowSSI._proxy.dispatchEvent(event);
  },
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ) {
    return windowSSI._proxy.addEventListener(type, callback, options);
  },
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ) {
    return windowSSI._proxy.removeEventListener(type, callback, options);
  },
};
