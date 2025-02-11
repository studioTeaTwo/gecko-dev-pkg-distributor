import {
  type AvailableCalls,
  availableCalls,
  DecryptType,
  EncryptType,
  SignType,
} from "../custom.type";

/**
 * Nostr
 */

export function generate(option) {
  return window.Promise.resolve("Not implemented");
}
export function getPublicKey(option) {
  return _callRuntime<string>("nostr/getPublicKey", option);
}
export function getPublicKeyWithCallback(callback, option) {
  _callRuntime<string>("nostr/getPublicKey", option).then(publicKey => {
    callback(publicKey);
  });
}
export function sign(
  message,
  option: {
    type: SignType;
  }
) {
  return _callRuntime<string>(`nostr/${option.type}`, {
    message,
    ...option,
  });
}
export function signWithCallback(
  message,
  callback,
  option: {
    type: SignType;
  }
) {
  _callRuntime<string>(`nostr/${option.type}`, {
    message,
    ...option,
  }).then(signature => {
    callback(signature);
  });
}
export function encrypt(
  plaintext,
  option: {
    type: EncryptType;
    pubkey?: string;
    version?: string;
  }
) {
  return _callRuntime<string>(`nostr/${option.type}/encrypt`, {
    plaintext,
    ...option,
  });
}
export function encryptWithCallback(
  plaintext,
  callback,
  option: {
    type: EncryptType;
    pubkey?: string;
    version?: string;
  }
) {
  return _callRuntime<string>(`nostr/${option.type}/encrypt`, {
    plaintext,
    ...option,
  }).then(ciphertext => {
    callback(ciphertext);
  });
}
export function decrypt(
  ciphertext,
  option: {
    type: DecryptType;
    pubkey?: string;
    version?: string;
  }
) {
  return _callRuntime<string>(`nostr/${option.type}/decrypt`, {
    ciphertext,
    ...option,
  });
}
export function decryptWithCallback(
  ciphertext,
  callback,
  option: {
    type: DecryptType;
    pubkey?: string;
    version?: string;
  }
) {
  return _callRuntime<string>(`nostr/${option.type}/decrypt`, {
    ciphertext,
    ...option,
  }).then(plaintext => {
    callback(plaintext);
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

// Function to receive background in inpage.
export function _callRuntime<T>(action: AvailableCalls, option: FixMe) {
  // Validate
  if (!availableCalls.includes(action)) {
    throw new window.Error("Function not available. Is the provider enabled?");
  }
  // TODO(ssb): Validate option
  switch (action) {
    case "nostr/signEvent": {
      if (option.message == null || typeof option.message !== "string") {
        throw new window.Error("Invalid message");
      }
      break;
    }
    case "nostr/nip04/encrypt": {
      if (option.plaintext == null || typeof option.plaintext !== "string") {
        throw new window.Error("Invalid plaintext");
      }
      // TODO(ssb): validate in the terms of cryptography. e.g. `function isProbPub` in toolkit/components/ssi/protocols/noble-curves/abstract/weierstrass.sys.mjs
      if (option.pubkey == null || typeof option.pubkey !== "string") {
        throw new window.Error("Invalid partner's pubkey");
      }
      break;
    }
    case "nostr/nip04/decrypt": {
      // TODO(ssb): validate in the terms of cryptography
      if (option.ciphertext == null || typeof option.ciphertext !== "string") {
        throw new window.Error("Invalid ciphertext");
      }
      // TODO(ssb): validate in the terms of cryptography. e.g. `function isProbPub` in toolkit/components/ssi/protocols/noble-curves/abstract/weierstrass.sys.mjs
      if (option.pubkey == null || typeof option.pubkey !== "string") {
        throw new window.Error("Invalid partner's pubkey");
      }
      break;
    }
  }

  return new window.Promise<T>(resolve => {
    browser.runtime
      .sendMessage({
        origin: location.origin,
        action,
        args: option,
      })
      .then(response => {
        resolve(response);
      });
  });
}
