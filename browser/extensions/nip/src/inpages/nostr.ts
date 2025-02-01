// Interface for the web apps to call the extension
// refs: https://github.com/nostr-protocol/nips/blob/master/07.md

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { log } from "../shared/logger";
import { shouldInject } from "../shared/shouldInject";
import { type NostrEvent } from "../ssi.type";

declare global {
  // eslint-disable-next-line no-var
  var nostr: typeof windowNostr;
  // eslint-disable-next-line no-var
  var nip07Loaded: { [provider: string]: boolean }[];
  // eslint-disable-next-line no-var
  var _builtinNip: {
    _injectBuiltinNip07: () => void;
    _disposeBuiltinNip07: () => void;
  };
}

export function init() {
  if (!shouldInject()) {
    return;
  }

  window._builtinNip = Object.create(null, {
    _injectBuiltinNip07: {
      value: () => {
        window.nostr = windowNostr;
        window.nip07Loaded = Array.isArray(window.nip07Loaded)
          ? window.nip07Loaded.concat([{ ssb: true }])
          : [{ ssb: true }];
        window.ssi.nostr.addEventListener(
          "accountChanged",
          accountChangedHandler
        );
      },
    },
    _disposeBuiltinNip07: {
      value: () => {
        if (window.nostr && window.nostr._provider === "ssb") {
          delete window.nostr;
        }
        window.nip07Loaded = Array.isArray(window.nip07Loaded)
          ? window.nip07Loaded.concat({ ssb: false })
          : [{ ssb: false }];
        window.ssi.nostr.removeEventListener(
          "accountChanged",
          accountChangedHandler
        );
      },
    },
  });
}

const accountChangedHandler = (event: CustomEvent<string>) => {
  const newPublicKey = event.detail;

  log(`inpage accountChanged emit`, event);
  window.nostr._invoke(
    new CustomEvent("accountChanged", {
      detail: newPublicKey,
      bubbles: true,
    })
  );
};

// ref: https://github.com/nostr-protocol/nips/blob/master/07.md
export const windowNostr = Object.create(null, {
  _provider: {
    value: "ssb",
    enumerable: true,
  },
  _scope: {
    value: "nostr",
    enumerable: true,
  },
  _proxy: {
    value: new EventTarget(),
    enumerable: true,
  },

  getPublicKey: {
    value: function () {
      return window.ssi.nostr.getPublicKey();
    },
    enumerable: true,
  },

  signEvent: {
    value: async function (event: {
      created_at: number;
      kind: number;
      tags: string[][];
      content: string;
    }) {
      const signedEvent: NostrEvent = { ...event };

      // Attach your holding public key to verify it is the same as the current primary key.
      signedEvent.pubkey = await this.getPublicKey();
      const eventHash = bytesToHex(
        sha256(new TextEncoder().encode(serializeEvent(signedEvent)))
      );
      const signature = await window.ssi.nostr.sign(
        JSON.stringify(signedEvent),
        {
          type: "signEvent",
        }
      );
      signedEvent.id = eventHash;
      signedEvent.sig = signature;

      return signedEvent;
    },
    enumerable: true,
  },

  nip04: {
    value: {
      encrypt(pubkey, plaintext): Promise<string> {
        return Promise.resolve("Not implemented");
      },
      decrypt(pubkey, ciphertext): Promise<string> {
        return Promise.resolve("Not implemented");
      },
    },
    enumerable: true,
  },

  nip44: {
    value: {
      encrypt(pubkey, plaintext): Promise<string> {
        return Promise.resolve("Not implemented");
      },
      decrypt(pubkey, ciphertext): Promise<string> {
        return Promise.resolve("Not implemented");
      },
    },
    enumerable: true,
  },

  _invoke: {
    value: function (action, data) {
      windowNostr._proxy.dispatchEvent(
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
    value: function (...args) {
      return windowNostr._proxy.addEventListener(...args);
    },
    enumerable: true,
  },
  removeEventListener: {
    value: function (...args) {
      return windowNostr._proxy.removeEventListener(...args);
    },
    enumerable: true,
  },
});

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
