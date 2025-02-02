import { availableCalls } from "../custom.type";

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
    type: "signEvent";
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
    type: "signEvent";
  }
) {
  _callRuntime<string>(`nostr/${option.type}`, {
    message,
    ...option,
  }).then(signature => {
    callback(signature);
  });
}
export function decrypt(ciphertext, option) {
  return window.Promise.resolve("Not implemented");
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
export function _callRuntime<T>(
  action: (typeof availableCalls)[number],
  option
) {
  if (!availableCalls.includes(action)) {
    throw new window.Error("Function not available. Is the provider enabled?");
  }
  // TODO(ssb): Validate option
  switch (action) {
    case "nostr/signEvent": {
      if (typeof option.message !== "string") {
        throw new window.Error("Invalid message");
      }
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
