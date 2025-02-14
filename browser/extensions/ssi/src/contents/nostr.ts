import { WindowSSI } from "../window.ssi.type";
import { log } from "../shared/logger";
import {
  generate,
  getPublicKey,
  getPublicKeyWithCallback,
  sign,
  signWithCallback,
  encrypt,
  encryptWithCallback,
  decrypt,
  decryptWithCallback,
  _invoke,
  addEventListener,
  removeEventListener,
} from "./api";

// Object shared with inpage scripts.
const _nostr = new window.Object() as WindowSSI["nostr"];
_nostr.generate = exportFunction(generate, window);
_nostr.getPublicKey = exportFunction(getPublicKey, window);
_nostr.getPublicKeyWithCallback = exportFunction(
  getPublicKeyWithCallback,
  window
);
_nostr.sign = exportFunction(sign, window);
_nostr.signWithCallback = exportFunction(signWithCallback, window);
_nostr.encrypt = exportFunction(encrypt, window);
_nostr.encryptWithCallback = exportFunction(encryptWithCallback, window);
_nostr.decrypt = exportFunction(decrypt, window);
_nostr.decryptWithCallback = exportFunction(decryptWithCallback, window);

// NOTE(ssb): A experimental feature for providers. Currently not freeze nor seal.
// ref: https://github.com/nostr-protocol/nips/pull/1174
_nostr.messageBoard = cloneInto({}, window);

_nostr._proxy = new window.EventTarget();
// TODO(ssb): Ideally should conceal
_nostr._invoke = exportFunction(_invoke(_nostr._proxy), window);
_nostr.addEventListener = exportFunction(
  addEventListener(_nostr._proxy),
  window
);
_nostr.removeEventListener = exportFunction(
  removeEventListener(_nostr._proxy),
  window
);

export const nostr = _nostr;

export async function init() {
  // The message listener to listen to background calls
  // After, emit event to return the response to the inpages.
  browser.runtime.onMessage.addListener(request => {
    log("content-script onMessage", request);
    const action = request.action.replace("nostr/", "");
    const data = request.args;

    // forward account changed messaged to inpage script
    if (action === "accountChanged") {
      window.wrappedJSObject.ssi.nostr._invoke(action, data);
      XPCNativeWrapper(window.wrappedJSObject.ssi);
    }
  });
}
