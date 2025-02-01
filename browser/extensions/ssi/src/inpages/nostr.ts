// Interface for window.ssi prototype
import { WindowSSI } from "src/custom.type";

export const nostr = Object.freeze<WindowSSI["nostr"]>({
  generate(option) {
    return Promise.resolve("Not implemented");
  },
  async getPublicKey(option) {
    return callBackground<string>("nostr/getPublicKey", option);
  },
  sign(message, option) {
    return callBackground<string>(`nostr/${option.type}`, {
      message,
      ...option,
    });
  },
  decrypt(ciphertext, option) {
    return Promise.resolve("Not implemented");
  },

  // NOTE(ssb): A experimental feature for providers. Currently not freeze nor seal.
  // ref: https://github.com/nostr-protocol/nips/pull/1174
  messageBoard: {},

  _proxy: new EventTarget(),
  // TODO(ssb): Ideally should conceal
  _invoke(action, data) {
    nostr._proxy.dispatchEvent(
      new CustomEvent(action, {
        detail: data,
        bubbles: false,
        composed: true,
      })
    );
  },
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ) {
    return nostr._proxy.addEventListener(type, callback, options);
  },
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ) {
    return nostr._proxy.removeEventListener(type, callback, options);
  },
});
