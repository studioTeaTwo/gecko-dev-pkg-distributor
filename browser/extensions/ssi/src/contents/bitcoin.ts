import { WindowSSI } from "../window.ssi.type";
import { log } from "../shared/logger";
import {
  BitcoinApi,
  _invoke,
  addEventListener,
  removeEventListener,
} from "./api";

// Object shared with inpage scripts.
const _bitcoin = new window.Object() as WindowSSI["bitcoin"];
_bitcoin.generate = exportFunction(BitcoinApi.generate, window);
_bitcoin.generateSync = exportFunction(BitcoinApi.generateSync, window);
_bitcoin.shareWith = exportFunction(BitcoinApi.shareWith, window);
_bitcoin.shareWithSync = exportFunction(BitcoinApi.shareWithSync, window);

_bitcoin._proxy = new window.EventTarget();
// TODO(ssb): Ideally should conceal
_bitcoin._invoke = exportFunction(_invoke(_bitcoin._proxy), window);
_bitcoin.addEventListener = exportFunction(
  addEventListener(_bitcoin._proxy),
  window
);
_bitcoin.removeEventListener = exportFunction(
  removeEventListener(_bitcoin._proxy),
  window
);

export const bitcoin = _bitcoin;

export async function init() {
  // The message listener to listen to background calls
  // After, emit event to return the response to the inpages.
  browser.runtime.onMessage.addListener(request => {
    log("content-script onMessage", request);
    const action = request.action.replace("bitcoin/", "");
    const data = request.args;

    // forward account changed messaged to inpage script
    if (action === "accountChanged") {
      window.wrappedJSObject.ssi.bitcoin._invoke(action, data);
      XPCNativeWrapper(window.wrappedJSObject.ssi);
    }
  });
}
