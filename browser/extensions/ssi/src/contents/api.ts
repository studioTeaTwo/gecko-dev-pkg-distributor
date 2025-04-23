import {
  NostrSignType,
  NostrEncryptType,
  NostrDecryptType,
  BitcoinShareType,
} from "../window.ssi.type";
import { type AvailableCalls, availableCalls } from "../custom.type";

/**
 * Bitcoin
 */

export const BitcoinApi = {
  generate(option) {
    return _callRuntime<string>("bitcoin/generate", option);
  },
  generateSync(callback, option) {
    _callRuntime<string>("bitcoin/generate", option)
      .then(identifier => {
        callback(null, identifier);
      })
      .catch(error => {
        callback(error, "");
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
    return _callRuntime<string>(`bitcoin/shareWith`, {
      pubkey,
      ...option,
    });
  },
  shareWithSync(
    pubkey,
    callback,
    option: {
      type: BitcoinShareType;
      xpub?: string;
      path?: string; // m or m/*
    }
  ) {
    return _callRuntime<string>(`bitcoin/shareWith`, {
      pubkey,
      ...option,
    })
      .then(ciphertext => {
        callback(null, ciphertext);
      })
      .catch(error => {
        callback(error, "");
      });
  },
};

/**
 * Nostr
 */

export const NostrApi = {
  generate() {
    return window.Promise.resolve("Not implemented");
  },

  getPublicKey(option) {
    return _callRuntime<string>("nostr/getPublicKey", option);
  },
  getPublicKeySync(callback, option) {
    _callRuntime<string>("nostr/getPublicKey", option)
      .then(publicKey => {
        callback(null, publicKey);
      })
      .catch(error => {
        callback(error, "");
      });
  },

  sign(
    message,
    option: {
      type: NostrSignType;
    }
  ) {
    return _callRuntime<string>(`nostr/${option.type}`, {
      message,
      ...option,
    });
  },
  signSync(
    message,
    callback,
    option: {
      type: NostrSignType;
    }
  ) {
    _callRuntime<string>(`nostr/${option.type}`, {
      message,
      ...option,
    })
      .then(signature => {
        callback(null, signature);
      })
      .catch(error => {
        callback(error, "");
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
    return _callRuntime<string>(`nostr/${option.type}/encrypt`, {
      plaintext,
      ...option,
    });
  },
  encryptSync(
    plaintext,
    callback,
    option: {
      type: NostrEncryptType;
      pubkey?: string;
      version?: string;
    }
  ) {
    return _callRuntime<string>(`nostr/${option.type}/encrypt`, {
      plaintext,
      ...option,
    })
      .then(ciphertext => {
        callback(null, ciphertext);
      })
      .catch(error => {
        callback(error, "");
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
    return _callRuntime<string>(`nostr/${option.type}/decrypt`, {
      ciphertext,
      ...option,
    });
  },
  decryptSync(
    ciphertext,
    callback,
    option: {
      type: NostrDecryptType;
      pubkey?: string;
      version?: string;
    }
  ) {
    return _callRuntime<string>(`nostr/${option.type}/decrypt`, {
      ciphertext,
      ...option,
    })
      .then(plaintext => {
        callback(null, plaintext);
      })
      .catch(error => {
        callback(error, "");
      });
  },
};

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
        resolve(response);
      })
      .catch(error => {
        reject(cloneInto(error, window));
      });
  });
}
