/**
 * That's to empower individuals on the self-sovereign path.<br/><br/>window.ssi is the most accessible API that is widely published on the web, bridging tasks related to credentials, such as signing/decrypting, between the internal module and user land.
 */
export interface WindowSSI extends Omit<EventTarget, "dispatchEvent"> {
  /** @internal */
  _scope: "ssi";
  /** @internal */
  _proxy: EventTarget;
  /** @internal */
  _invoke: (event: CustomEvent) => void;

  bitcoin: WindowSSIBitcoin;
  nostr: WindowSSINostr;
}

/** Implementation list of Bitcoin generation spec. */
export type BitcoinGenerateType = "mnemonic" | "derivation";
/** Implementation list of Bitcoin share spec. */
export type BitcoinShareType = "mnemonic" | "derivation" | "xprv";
/** Return type of Bitcoin shared secret. */
export interface BitcoinSharedSecret {
  secret: string; // The secret encrypted by Nostr NIP-44
  sender: string; // The Nostr public key of the person who encrypted the secret. It's in hex format.
  receiver: string; // The Nostr public key of the person with whom the secret is shared. It's in hex format.
}
/** Implementation list of Nostr generation spec. */
export type NostrGenerateType = "single" | "mnemonic";
/** Implementation list of Nostr signature spec. */
export type NostrSignType = "signEvent";
/** Implementation list of Nostr encyption spec. */
export type NostrEncryptType = "nip04" | "nip44";
/** Implementation list of Nostr encyption spec. */
export type NostrDecryptType = "nip04" | "nip44";

/**
 * The window.ssi subset for Bitcoin protocol.
 */
export interface WindowSSIBitcoin extends Omit<EventTarget, "dispatchEvent"> {
  /** @internal */
  _proxy: EventTarget;
  /** @internal */
  _invoke: (action: unknown, data: unknown) => void;

  /**
   * Generates Bitcoin key in the specified order. During the execution process, an internal authorization check is performed similar to `browser.ssi.askConsent`.
   *
   * @param options - Direction about the key you want the user to generate.
   * @param options.type - The type that specifies the secret you want the user to generate: e.g. `\"mnemonic\"`, `\"derivation\"`.
   * @param options.strength - The strength when generating a mnemonic (and a master key). This is required when `type` is `\"mnemonic\"`.
   * @param options.passphrase - The passphrase when generating a mnemonic (and a master key). This is optional when `type` is `\"mnemonic\"`.
   * @param options.path - The Hierarchical Deterministic (HD) path: e.g. `\"m/0'/1/2'\"`. If null (or `\"m\"`) a master key will be generated. The seed specified by the user as the primary will be used. This is required when `type` is `\"derivation\"`.
   * @returns A Promise that will be fulfilled with a `string` of xpub.
   * @throws If failed
   */
  generate(options: {
    type: BitcoinGenerateType;
    strength?: number; // 128 - 256
    passphrase?: string; // UTF-8 NFKD
    path?: string; // m or m/*
  }): Promise<string>;
  /**
   * Callback type of `generate`.
   *
   * @param options - Direction about the key you want the user to generate.
   * @param options.type - The type that specifies the secret you want the user to generate: e.g. `\"mnemonic\"`, `\"derivation\"`.
   * @param options.strength - The strength when generating a mnemonic (and a master key). This is required when `type` is `\"mnemonic\"`.
   * @param options.passphrase - The passphrase when generating a mnemonic (and a master key). This is optional when `type` is `\"mnemonic\"`.
   * @param options.path - The Hierarchical Deterministic (HD) path: e.g. `\"m/0'/1/2'\"`. If null (or `\"m\"`) a master key will be generated. The seed specified by the user as the primary will be used. This is required when `type` is `\"derivation\"`.
   * @param callback - A reference to a function that should be called in the near future, when the result is returned. The callback function is passed two arguments — 1. Error object if failed otherwise null, 2. The resulting identifier.
   */
  generateSync(
    options: {
      type: BitcoinGenerateType;
      strength?: number; // 128 - 256
      passphrase?: string; // UTF-8 NFKD
      path?: string; // m or m/*
    },
    callback: (error: Error | null, identifier: string) => unknown
  ): void;

  /**
   * Request the secret you want the user to share, and get back the encrypted secret by Nostr NIP-44. During the execution process, an internal authorization check is performed similar to `browser.ssi.askConsent`.
   *
   * @param pubkey - Your Nostr public key for encrypting the shared secret. Either npub or hex format.
   * @param options - Direction about the secret you want the user to share. `\"mnemonic\"` and `\"derivation\"` use the seed specified by the user as the primary.
   * @param options.type - The type that specifies the secret you want the user to share: e.g. `\"mnemonic\"`, `\"derivation\"`, `\"xprv\"`.
   * @param options.xpub - The Bitcoin public key that specifies the secret you want the user to share: e.g. `\"xpub123...\"`. The return value is encrypted xprv key. This is required when `type` is `\"xprv\"`.
   * @param options.path - The Hierarchical Deterministic (HD) path that specifies the secret you want the user to share: e.g. `\"m/0'/1/2'\"`. The return value is encrypted xprv key. The seed specified by the user as the primary will be used. This is required when `type` is `\"derivation\"`.
   * @returns A Promise that will be fulfilled with a `ssi.bitcoin.SharedSecret` object.
   * @throws If failed
   */
  shareWith(
    pubkey: string,
    options: {
      type: BitcoinShareType;
      xpub?: string;
      path?: string; // m or m/*
    }
  ): Promise<BitcoinSharedSecret>;
  /**
   * Callback type of `shareWith`.
   *
   * @param pubkey - Your Nostr public key for encrypting the shared secret. Either npub or hex format.
   * @param options - Direction about the secret you want the user to share. `\"mnemonic\"` and `\"derivation\"` use the seed specified by the user as the primary.
   * @param options.type - The type that specifies the secret you want the user to share: e.g. `\"mnemonic\"`, `\"derivation\"`, `\"xprv\"`.
   * @param options.xpub - The Bitcoin public key that specifies the secret you want the user to share: e.g. `\"xpub123...\"`. The return value is encrypted xprv key. This is required when `type` is `\"xprv\"`.
   * @param options.path - The Hierarchical Deterministic (HD) path that specifies the secret you want the user to share: e.g. `\"m/0'/1/2'\"`. The return value is encrypted xprv key. The seed specified by the user as the primary will be used. This is required when `type` is `\"derivation\"`.
   * @param callback - A reference to a function that should be called in the near future, when the result is returned. The callback function is passed two arguments — 1. Error object if failed otherwise null, 2. The resulting `ssi.bitcoin.SharedSecret` object.
   */
  shareWithSync(
    pubkey: string,
    options: {
      type: BitcoinShareType;
      xpub?: string;
      path?: string; // m or m/*
    },
    callback: (
      error: Error | null,
      sharedSecret: BitcoinSharedSecret
    ) => unknown
  ): void;
}

/**
 * The window.ssi subset for Nostr protocol.
 */
export interface WindowSSINostr extends Omit<EventTarget, "dispatchEvent"> {
  /** @internal */
  _proxy: EventTarget;
  /** @internal */
  _invoke: (action: unknown, data: unknown) => void;

  /**
   * Generates Nostr key in the specified order. During the execution process, an internal authorization check is performed similar to `browser.ssi.askConsent`.
   *
   * @param options - Direction about generation detail.
   * @param options.type - The type that specifies the secret you want the user to generate: e.g. `\"single\"`, `\"mnemonic\"`.
   * @returns A Promise that will be fulfilled with a `string` of hex-format public key.
   * @throws If failed
   */
  generate(options: { type: NostrGenerateType }): Promise<string>;
  /**
   * Callback type of `generate`.
   *
   * @param options - Direction about generation detail.
   * @param options.type - The type that specifies the secret you want the user to generate: e.g. `\"single\"`, `\"mnemonic\"`.
   * @param callback - A reference to a function that should be called in the near future, when the result is returned. The callback function is passed two arguments — 1. Error object if failed otherwise null, 2. The resulting hex-format public key.
   */
  generateSync(
    options: {
      type: NostrGenerateType;
    },
    callback: (error: Error | null, publicKey: string) => unknown
  ): Promise<string>;

  /**
   * Return public key set as primary currently. During the execution process, an internal authorization check is performed similar to `browser.ssi.askConsent`.
   *
   * @param options - Not implemented
   * @returns A Promise that will be fulfilled with a `string` of hex-format public key.
   * @throws If failed
   */
  getPublicKey(options?: object): Promise<string>;
  /**
   * Callback type of `getPublicKey`.
   *
   * @param options - Not implemented
   * @param callback - A reference to a function that should be called in the near future, when the result is returned. The callback function is passed two arguments — 1. Error object if failed otherwise null, 2. The resulting hex-format public key.
   */
  getPublicKeySync(
    options: object,
    callback: (error: Error | null, publicKey: string) => unknown
  ): void;

  /**
   * Pass in the message and get back the signature by Nostr secret key. You should always read the public key without using cache just before signing/encrypting/decrypting, as the user may change their primary key without notifying you. During the execution process, an internal authorization check is performed similar to `browser.ssi.askConsent`.
   *
   * @param message - The message to sign. If it's not a string it must be stringified.
   * @param options - Direction about sign detail.
   * @param options.type - The signature spec. e.g., `\"signEvent\"`.
   * @returns A Promise that will be fulfilled with a `string` of resulting signature.
   * @throws If failed
   */
  sign(
    message: string,
    options: {
      type: NostrSignType;
    }
  ): Promise<string>;
  /**
   * Callback type of `sign`.
   *
   * @param message - The message to sign. If it's not a string it must be stringified.
   * @param options - Direction about sign detail.
   * @param options.type - The signature spec. e.g., `\"signEvent\"`.
   * @param callback - A reference to a function that should be called in the near future, when the result is returned. The callback function is passed two arguments — 1. Error object if failed otherwise null, 2. The resulting signature.
   */
  signSync(
    message: string,
    options: {
      type: NostrSignType;
    },
    callback: (error: Error | null, signature: string) => unknown
  ): void;

  /**
   * Pass in the plain text and get back the cipher text by Nostr secret key. You should always read the public key without using cache just before signing/encrypting/decrypting, as the user may change their primary key without notifying you. During the execution process, an internal authorization check is performed similar to `browser.ssi.askConsent`.
   *
   * @param plaintext - The plain text to encrypt. If it's not a string it must be stringified.
   * @param options - Direction about encryption detail.
   * @param options.type - The encryption spec. e.g., `\"nip04\"`, `\"nip44\"`.
   * @param options.pubkey - The conversation partner's public key. If type is `\"nip04\"` or `\"nip44\"`, then this is required.
   * @param options.version - The version to define encryption algorithms if the type is `\"nip44\"`.
   * @returns A Promise that will be fulfilled with a `string` of the encrypted cipher text.
   * @throws If failed
   */
  encrypt(
    plaintext: string,
    options: {
      type: NostrEncryptType;
      pubkey?: string;
      version?: string;
    }
  ): Promise<string>;
  /**
   * Callback type of `encrypt`.
   *
   * @param plaintext - The plain text to encrypt. If it's not a string it must be stringified.
   * @param options - Direction about encryption detail.
   * @param options.type - The encryption spec. e.g., `\"nip04\"`, `\"nip44\"`.
   * @param options.pubkey - The conversation partner's public key. If type is `\"nip04\"` or `\"nip44\"`, then this is required.
   * @param options.version - The version to define encryption algorithms if the type is `\"nip44\"`.
   * @param callback - A reference to a function that should be called in the near future, when the result is returned. The callback function is passed two arguments — 1. Error object if failed otherwise null, 2. The resulting ciphertext.
   */
  encryptSync(
    plaintext: string,
    options: {
      type: NostrEncryptType;
      pubkey?: string;
      version?: string;
    },
    callback: (error: Error | null, ciphertext: string) => unknown
  ): void;

  /**
   * Pass in the cipher text and get back the plain text by Nostr secret key. You should always read the public key without using cache just before signing/encrypting/decrypting, as the user may change their primary key without notifying you. During the execution process, an internal authorization check is performed similar to `browser.ssi.askConsent`.
   *
   * @param ciphertext - The cipher text to decrypt.
   * @param options - Direction about decryption detail.
   * @param options.type - The encryption spec. e.g., `\"nip04\"`, `\"nip44\"`.
   * @param options.pubkey - The conversation partner's public key. If type is `\"nip04\"` or `\"nip44\"`, then this is required.
   * @param options.version - The version to define encryption algorithms if the type is `\"nip44\"`.
   * @returns A Promise that will be fulfilled with a `string` of the decrypted plain text.
   * @throws If failed
   */
  decrypt(
    ciphertext: string,
    options: {
      type: NostrDecryptType;
      pubkey?: string;
      version?: string;
    }
  ): Promise<string>;
  /**
   * Callback type of `decrypt`.
   *
   * @param ciphertext - The cipher text to decrypt.
   * @param options - Direction about decryption detail.
   * @param options.type - The encryption spec. e.g., `\"nip04\"`, `\"nip44\"`.
   * @param options.pubkey - The conversation partner's public key. If type is `\"nip04\"` or `\"nip44\"`, then this is required.
   * @param options.version - The version to define encryption algorithms if the type is `\"nip44\"`.
   * @param callback - A reference to a function that should be called in the near future, when the result is returned. The callback function is passed two arguments — 1. Error object if failed otherwise null, 2. The resulting plaintext.
   */
  decryptSync(
    ciphertext: string,
    options: {
      type: NostrDecryptType;
      pubkey?: string;
      version?: string;
    },
    callback: (error: Error | null, plaintext: string) => unknown
  ): void;

  /** @ignore */
  messageBoard?: unknown;
}
