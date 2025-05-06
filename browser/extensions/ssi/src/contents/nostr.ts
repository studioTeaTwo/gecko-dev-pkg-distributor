import { WindowSSI } from "../window.ssi.type";
import { log } from "../shared/logger";
import {
  NostrApi,
  _invoke,
  addEventListener,
  removeEventListener,
} from "./api";

/**
 * We waive Xray, so we prepend the global window object with `window.`.
 * ref: https://firefox-source-docs.mozilla.org/dom/scriptSecurity/xray_vision.html
 */

// Object shared with inpage scripts.
const _nostr = new window.Object() as WindowSSI["nostr"];
_nostr.generate = exportFunction(NostrApi.generate, window);
_nostr.getPublicKey = exportFunction(NostrApi.getPublicKey, window);
_nostr.getPublicKeySync = exportFunction(NostrApi.getPublicKeySync, window);
_nostr.sign = exportFunction(NostrApi.sign, window);
_nostr.signSync = exportFunction(NostrApi.signSync, window);
_nostr.encrypt = exportFunction(NostrApi.encrypt, window);
_nostr.encryptSync = exportFunction(NostrApi.encryptSync, window);
_nostr.decrypt = exportFunction(NostrApi.decrypt, window);
_nostr.decryptSync = exportFunction(NostrApi.decryptSync, window);

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
