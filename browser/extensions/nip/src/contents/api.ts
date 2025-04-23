import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { log } from "../shared/logger";
import { NostrEvent } from "../custom.type";

/**
 * APIs to export to inpages
 */

export function getPublicKey() {
  return window.wrappedJSObject.ssi.nostr.getPublicKey();
}
export function signEvent(event) {
  const signedEvent = { ...event };
  let eventHash = "";
  return new window.Promise((resolve, reject) => {
    // Attach your holding public key to verify it is the same as the current primary key.
    window.wrappedJSObject.ssi.nostr.getPublicKeySync(
      exportFunction((error, pubkey) => {
        if (error) {
          reject(error);
        }
        signedEvent.pubkey = pubkey;
        eventHash = bytesToHex(
          sha256(new window.TextEncoder().encode(serializeEvent(signedEvent)))
        );
        window.wrappedJSObject.ssi.nostr.signSync(
          window.JSON.stringify(signedEvent),
          exportFunction((error, signature) => {
            if (error) {
              reject(error);
            }
            signedEvent.id = eventHash;
            signedEvent.sig = signature;
            resolve(cloneInto(signedEvent, window));
          }, window),
          cloneInto(
            {
              type: "signEvent",
            },
            window
          )
        );
        XPCNativeWrapper(window.wrappedJSObject.ssi);
      }, window)
    );
    XPCNativeWrapper(window.wrappedJSObject.ssi);
  });
}
export function nip04Encrypt(pubkey, plaintext) {
  return new window.Promise((resolve, reject) => {
    window.wrappedJSObject.ssi.nostr.encryptSync(
      plaintext,
      exportFunction((error, ciphertext) => {
        if (error) {
          reject(error);
        }
        resolve(ciphertext);
      }, window),
      cloneInto(
        {
          type: "nip04",
          pubkey,
        },
        window
      )
    );
    XPCNativeWrapper(window.wrappedJSObject.ssi);
  });
}
export function nip04Decrypt(pubkey, ciphertext) {
  return new window.Promise((resolve, reject) => {
    window.wrappedJSObject.ssi.nostr.decryptSync(
      ciphertext,
      exportFunction((error, plaintext) => {
        if (error) {
          reject(error);
        }
        resolve(plaintext);
      }, window),
      cloneInto(
        {
          type: "nip04",
          pubkey,
        },
        window
      )
    );
    XPCNativeWrapper(window.wrappedJSObject.ssi);
  });
}
export function nip44Encrypt(pubkey, plaintext) {
  return new window.Promise((resolve, reject) => {
    window.wrappedJSObject.ssi.nostr.encryptSync(
      plaintext,
      exportFunction((error, ciphertext) => {
        if (error) {
          reject(error);
        }
        resolve(ciphertext);
      }, window),
      cloneInto(
        {
          type: "nip44",
          pubkey,
        },
        window
      )
    );
    XPCNativeWrapper(window.wrappedJSObject.ssi);
  });
}
export function nip44Decrypt(pubkey, ciphertext) {
  return new window.Promise((resolve, reject) => {
    window.wrappedJSObject.ssi.nostr.decryptSync(
      ciphertext,
      exportFunction((error, plaintext) => {
        if (error) {
          reject(error);
        }
        resolve(plaintext);
      }, window),
      cloneInto(
        {
          type: "nip44",
          pubkey,
        },
        window
      )
    );
    XPCNativeWrapper(window.wrappedJSObject.ssi);
  });
}

/**
 * Event
 */

export function _invoke(target: EventTarget) {
  return function (action, data) {
    return target.dispatchEvent(
      new CustomEvent(action, {
        detail: data,
        bubbles: true,
        composed: true,
      })
    );
  };
}
export function addEventListener(target: EventTarget) {
  return function (
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ) {
    return target.addEventListener(type, callback, options);
  };
}
export function removeEventListener(target: EventTarget) {
  return function (
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ) {
    return target.removeEventListener(type, callback, options);
  };
}

export function handleAccountChanged(event: CustomEvent<string>) {
  const newPublicKey = event.detail;
  window.wrappedJSObject.nostr._invoke("accountChanged", newPublicKey);
  XPCNativeWrapper(window.wrappedJSObject.nostr);

  log(`inpage accountChanged emit`, event);
}

/**
 * Internal Utils
 *
 */

// based upon : https://github.com/nbd-wtf/nostr-tools/blob/master/core.ts#L33
function validateEvent(event: NostrEvent): boolean {
  if (!(event instanceof Object)) return false; // Not `window.Object`
  if (typeof event.kind !== "number") return false;
  if (typeof event.content !== "string") return false;
  if (typeof event.created_at !== "number") return false;
  if (typeof event.pubkey !== "string") return false;
  if (!event.pubkey.match(/^[a-f0-9]{64}$/)) return false;

  if (!window.Array.isArray(event.tags)) return false;
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i];
    if (!window.Array.isArray(tag)) return false;
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === "object") return false;
    }
  }

  return true;
}

// from: https://github.com/nbd-wtf/nostr-tools/blob/master/pure.ts#L43
function serializeEvent(event: NostrEvent): string {
  if (!validateEvent(event))
    throw new window.Error(
      "can't serialize event with wrong or missing properties"
    );

  return window.JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}
