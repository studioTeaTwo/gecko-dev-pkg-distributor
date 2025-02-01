// Mediator for the extension to relay between the web apps and the background
// refs: https://github.com/getAlby/lightning-browser-extension/blob/master/src/extension/content-script/nostr.js

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { NostrEvent } from "src/ssi.type";
import { log } from "../shared/logger";
import { shouldInject } from "../shared/shouldInject";

declare global {
  interface WrappedJSObject {
    nostr: typeof NostrProvider;
    nip07Loaded: { [provider: string]: boolean }[];
  }
  // eslint-disable-next-line no-var
  var nostr: typeof NostrProvider;
  // eslint-disable-next-line no-var
  var nip07Loaded: { [provider: string]: boolean }[];
}

export async function init() {
  if (!shouldInject()) {
    return;
  }

  // The message listener to listen to background calls
  // After, emit event to return the response to the inpages.
  browser.runtime.onMessage.addListener(request => {
    log("content-script onMessage", request);
    const action = request.action;
    const data = request.args;

    // forward account changed messaged to inpage script
    if (
      ["nostr/builtinNip07Init", "nostr/builtinNip07Changed"].includes(action)
    ) {
      // TODO(ssb): It depends on the standard spec with other providers.
      if (data) {
        // Inject
        window.wrappedJSObject.nostr = NostrProvider;
        window.wrappedJSObject.nip07Loaded = cloneInto(
          Array.isArray(window.wrappedJSObject.nip07Loaded)
            ? window.nip07Loaded.concat([{ ssb: true }])
            : [{ ssb: true }],
          window
        );
      } else {
        // Dispose
        window.wrappedJSObject.nostr && delete window.wrappedJSObject.nostr;
        window.wrappedJSObject.nip07Loaded = Array.isArray(
          window.wrappedJSObject.nip07Loaded
        )
          ? window.wrappedJSObject.nip07Loaded.concat({ ssb: false })
          : [{ ssb: false }];
      }

      // To inject Class in window.nostr
      window.postMessage(
        {
          id: "native",
          application: "nip",
          data: {
            action: action.replace("nostr/", ""),
            data,
          },
          scope: "nostr",
        },
        window.location.origin
      );
    }
  });
}

// Share object with inpage scripts.
// ref: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
// ref: https://github.com/nostr-protocol/nips/blob/master/07.md
const NostrProvider = new window.Object() as FixMe;
NostrProvider._scope = "nostr";
NostrProvider._provider = "ssb";
NostrProvider.getPublicKey = exportFunction(() => {
  return window.wrappedJSObject.ssi.nostr.getPublicKey();
}, window);
NostrProvider.signEvent = exportFunction(event => {
  const signedEvent = { ...event };
  let eventHash = "";
  return new window.Promise(resolve => {
    // Attach your holding public key to verify it is the same as the current primary key.
    window.wrappedJSObject.ssi.nostr.getPublicKey(
      null,
      exportFunction(pubkey => {
        console.log("pubkey", pubkey);
        signedEvent.pubkey = pubkey;
        eventHash = bytesToHex(
          sha256(new TextEncoder().encode(serializeEvent(signedEvent)))
        );
        window.wrappedJSObject.ssi.nostr.sign(
          JSON.stringify(signedEvent),
          cloneInto(
            {
              type: "signEvent",
            },
            window
          ),
          exportFunction(signature => {
            signedEvent.id = eventHash;
            signedEvent.sig = signature;
            console.log("signature", eventHash, signature);
            resolve(cloneInto(signedEvent, window));
          }, window)
        );
      }, window)
    );
  });
}, window);
NostrProvider.nip04 = window.Object();
NostrProvider.nip04.encrypt = exportFunction((pubkey, plaintext) => {
  return Promise.resolve("Not implemented");
}, window);
NostrProvider.nip04.decrypt = exportFunction((pubkey, ciphertext) => {
  return Promise.resolve("Not implemented");
}, window);
NostrProvider.nip44 = window.Object();
NostrProvider.nip44.encrypt = exportFunction((pubkey, plaintext) => {
  return Promise.resolve("Not implemented");
}, window);
NostrProvider.nip44.decrypt = exportFunction((pubkey, ciphertext) => {
  return Promise.resolve("Not implemented");
}, window);

// based upon : https://github.com/nbd-wtf/nostr-tools/blob/master/core.ts#L33
function validateEvent(event: NostrEvent): boolean {
  if (!(event instanceof Object)) return false;
  if (typeof event.kind !== "number") return false;
  if (typeof event.content !== "string") return false;
  if (typeof event.created_at !== "number") return false;
  if (typeof event.pubkey !== "string") return false;
  if (!event.pubkey.match(/^[a-f0-9]{64}$/)) return false;

  if (!Array.isArray(event.tags)) return false;
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i];
    if (!Array.isArray(tag)) return false;
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === "object") return false;
    }
  }

  return true;
}

// from: https://github.com/nbd-wtf/nostr-tools/blob/master/pure.ts#L43
function serializeEvent(event: NostrEvent): string {
  if (!validateEvent(event))
    throw new Error("can't serialize event with wrong or missing properties");

  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}
