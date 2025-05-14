import {
  NostrSignType,
  NostrEncryptType,
  NostrDecryptType,
  BitcoinShareType,
  BitcoinSharedSecret,
} from "../window.ssi.type";
import { type AvailableCalls, availableCalls } from "../custom.type";

/**
 * We waive Xray, so we prepend the global window object with `window.`.
 * ref: https://firefox-source-docs.mozilla.org/dom/scriptSecurity/xray_vision.html
 */

/**
 * Bitcoin
 */

export const BitcoinApi = {
  generate(option) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    return _callRuntime<string>("bitcoin/generate", cleanedObj);
  },
  generateSync(option, callback) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    _callRuntime<string>("bitcoin/generate", cleanedObj)
      .then(identifier => {
        callback(null, identifier);
      })
      .catch(error => {
        callback(error, undefined);
      });
  },

  shareWith(
    pubkey,
    option: {
      type: BitcoinShareType;
      xpub?: string;
      path?: string; // m or m/*
    }
  ) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    cleanedObj.pubkey = pubkey;
    return _callRuntime<BitcoinSharedSecret>(`bitcoin/shareWith`, cleanedObj);
  },
  shareWithSync(
    pubkey,
    option: {
      type: BitcoinShareType;
      xpub?: string;
      path?: string; // m or m/*
    },
    callback
  ) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    cleanedObj.pubkey = pubkey;
    return _callRuntime<BitcoinSharedSecret>(`bitcoin/shareWith`, cleanedObj)
      .then(sharedSecret => {
        callback(null, sharedSecret);
      })
      .catch(error => {
        callback(error, null);
      });
  },
};

/**
 * Nostr
 */

export const NostrApi = {
  generate(option) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    return _callRuntime<string>(`nostr/generate`, cleanedObj);
  },
  generateSync(option, callback) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    _callRuntime<string>("nostr/generate", cleanedObj)
      .then(publicKey => {
        callback(null, publicKey);
      })
      .catch(error => {
        callback(error, undefined);
      });
  },

  getPublicKey(option) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    return _callRuntime<string>("nostr/getPublicKey", cleanedObj);
  },
  getPublicKeySync(option, callback) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    _callRuntime<string>("nostr/getPublicKey", cleanedObj)
      .then(publicKey => {
        callback(null, publicKey);
      })
      .catch(error => {
        callback(error, undefined);
      });
  },

  sign(
    message,
    option: {
      type: NostrSignType;
    }
  ) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    cleanedObj.message = message;
    return _callRuntime<string>(`nostr/${option.type}`, cleanedObj);
  },
  signSync(
    message,
    option: {
      type: NostrSignType;
    },
    callback
  ) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    cleanedObj.message = message;
    _callRuntime<string>(`nostr/${option.type}`, cleanedObj)
      .then(signature => {
        callback(null, signature);
      })
      .catch(error => {
        callback(error, undefined);
      });
  },

  encrypt(
    plaintext,
    option: {
      type: NostrEncryptType;
      pubkey?: string;
      version?: string;
    }
  ) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    cleanedObj.plaintext = plaintext;
    return _callRuntime<string>(`nostr/${option.type}/encrypt`, cleanedObj);
  },
  encryptSync(
    plaintext,
    option: {
      type: NostrEncryptType;
      pubkey?: string;
      version?: string;
    },
    callback
  ) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    cleanedObj.plaintext = plaintext;
    return _callRuntime<string>(`nostr/${option.type}/encrypt`, cleanedObj)
      .then(ciphertext => {
        callback(null, ciphertext);
      })
      .catch(error => {
        callback(error, undefined);
      });
  },

  decrypt(
    ciphertext,
    option: {
      type: NostrDecryptType;
      pubkey?: string;
      version?: string;
    }
  ) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    cleanedObj.ciphertext = ciphertext;
    return _callRuntime<string>(`nostr/${option.type}/decrypt`, cleanedObj);
  },
  decryptSync(
    ciphertext,
    option: {
      type: NostrDecryptType;
      pubkey?: string;
      version?: string;
    },
    callback
  ) {
    const cleanedObj = sanitizeObject(option) as FixMe;
    cleanedObj.ciphertext = ciphertext;
    return _callRuntime<string>(`nostr/${option.type}/decrypt`, cleanedObj)
      .then(plaintext => {
        callback(null, plaintext);
      })
      .catch(error => {
        callback(error, undefined);
      });
  },
};

/**
 * Event
 */

export function _invoke(target: EventTarget) {
  return function (action, data) {
    return target.dispatchEvent(
      new window.CustomEvent(action, {
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

// Function to receive background in inpage.
export function _callRuntime<T>(action: AvailableCalls, option: FixMe) {
  // Validate
  if (!availableCalls.includes(action)) {
    throw new window.Error("Function not available. Is the provider enabled?");
  }
  // TODO(ssb): Validate option
  switch (action) {
    case "bitcoin/generate": {
      if (option.type == null || typeof option.type !== "string") {
        throw new window.Error("Missing the type for required");
      }
      break;
    }
    case "bitcoin/shareWith": {
      if (option.pubkey == null || typeof option.pubkey !== "string") {
        throw new window.Error("Missing the pubkey for required");
      }
      if (option.type == null || typeof option.type !== "string") {
        throw new window.Error("Missing the type for required");
      }
      break;
    }
    case "nostr/signEvent": {
      if (option.message == null || typeof option.message !== "string") {
        throw new window.Error("Invalid message");
      }
      break;
    }
    case "nostr/nip04/encrypt":
    case "nostr/nip44/encrypt": {
      if (option.plaintext == null || typeof option.plaintext !== "string") {
        throw new window.Error("Invalid plaintext");
      }
      if (option.pubkey == null || typeof option.pubkey !== "string") {
        throw new window.Error("Invalid partner's pubkey");
      }
      break;
    }
    case "nostr/nip04/decrypt":
    case "nostr/nip44/decrypt": {
      // TODO(ssb): validate in the terms of cryptography
      if (option.ciphertext == null || typeof option.ciphertext !== "string") {
        throw new window.Error("Invalid ciphertext");
      }
      if (option.pubkey == null || typeof option.pubkey !== "string") {
        throw new window.Error("Invalid partner's pubkey");
      }
      break;
    }
  }

  return new window.Promise<T>((resolve, reject) => {
    browser.runtime
      .sendMessage({
        origin: location.origin,
        action,
        args: option,
      })
      .then(response => {
        if (
          ["string", "number", "bigint", "boolean", "undefined"].includes(
            typeof response
          )
        ) {
          resolve(response);
        } else if (["object"].includes(typeof response)) {
          resolve(cloneInto(response, window));
        } else {
          throw new window.Error("Not supported response type");
        }
      })
      .catch(error => {
        reject(cloneInto(error, window));
      });
  });
}

function sanitizeObject(obj) {
  const _obj = new window.Object();
  if (obj == null) {
    return _obj;
  }

  for (const entry of window.Object.entries(obj)) {
    if (typeof entry[1] === "object" && !window.Array.isArray(entry[1])) {
      _obj[entry[0]] = sanitizeObject(entry[1]);
    } else if (window.Array.isArray(entry[1])) {
      _obj[entry[0]] = sanitizeArray(entry[1]);
    } else {
      _obj[entry[0]] = entry[1];
    }
  }
  return _obj;
}

function sanitizeArray(array) {
  const _array = new window.Array(array.length);
  array.forEach((item, i) => {
    if (window.Array.isArray(item)) {
      _array[i] = sanitizeArray(item);
    } else if (typeof item === "object") {
      _array[i] = sanitizeObject(item);
    } else {
      _array[i] = item;
    }
  });
  return _array;
}
