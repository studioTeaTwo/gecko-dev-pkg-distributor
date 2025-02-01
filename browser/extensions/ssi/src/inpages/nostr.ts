// Interface for window.ssi prototype
import { WindowSSI } from "src/custom.type";

export const nostr: WindowSSI["nostr"] = Object.create(null, {
  generate: {
    value: function (option) {
      return Promise.resolve("Not implemented");
    },
    enumerable: true,
  },
  getPublicKey: {
    value: async function (option) {
      return callBackground<string>("nostr/getPublicKey", option);
    },
    enumerable: true,
  },
  sign: {
    value: function (
      message,
      option: {
        type: "signEvent";
      }
    ) {
      return callBackground<string>(`nostr/${option.type}`, {
        message,
        ...option,
      });
    },
    enumerable: true,
  },
  decrypt: {
    value: function (ciphertext, option) {
      return Promise.resolve("Not implemented");
    },
    enumerable: true,
  },

  // NOTE(ssb): A experimental feature for providers. Currently not freeze nor seal.
  // ref: https://github.com/nostr-protocol/nips/pull/1174
  messageBoard: {
    value: {},
    enumerable: true,
    writable: true,
  },

  _proxy: {
    value: new EventTarget(),
    enumerable: true,
  },
  // TODO(ssb): Ideally should conceal
  _invoke: {
    value: function (action, data) {
      nostr._proxy.dispatchEvent(
        new CustomEvent(action, {
          detail: data,
          bubbles: false,
          composed: true,
        })
      );
    },
    enumerable: true,
  },
  addEventListener: {
    value: function (
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: AddEventListenerOptions | boolean
    ) {
      return nostr._proxy.addEventListener(type, callback, options);
    },
    enumerable: true,
  },
  removeEventListener: {
    value: function (
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: EventListenerOptions | boolean
    ) {
      return nostr._proxy.removeEventListener(type, callback, options);
    },
    enumerable: true,
  },
});
