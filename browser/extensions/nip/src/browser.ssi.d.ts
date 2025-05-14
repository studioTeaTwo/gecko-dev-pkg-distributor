/// <reference types="../../../../tools/@types/lib.gecko.xpcom.d.ts" />

// built-in api
// ref: browser/components/extensions/schemas/ssi
declare namespace browser.ssi {
  type dialogOption = {
    caption?: string;
    submission?: string;
    enforce?: boolean;
  };

  const searchCredentials: (
    tabId: number,
    criteria: {
      protocolName: string;
      credentialName: string;
      primary: boolean;
    },
    dialogOption?: dialogOption
  ) => Promise<
    | Pick<
        nsICredentialInfo & nsICredentialMetaInfo,
        "protocolName" | "credentialName" | "primary" | "identifier"
      >[]
    | null
  >;
  const askConsent: (
    tabId: number,
    protocolName: string,
    credentialName: string,
    dialogOption?: dialogOption
  ) => Promise<boolean>;
  const askConsentChild: (protocolName: ProtocolName) => Promise<boolean>;

  type commonApis = {
    getPrefs: () => Promise<{
      enabled: boolean;
    } | null>;
    onPrimaryChanged: {
      addListener: (listener: () => void) => void;
      rmoveListener: (listener: () => void) => void;
      hasListener: (listener: () => void) => boolean;
    };
    onPrefEnabledChanged: {
      addListener: (listener: () => void) => void;
      rmoveListener: (listener: () => void) => void;
      hasListener: (llistener: () => void) => boolean;
    };
  };

  const bitcoin: {
    generate: (
      tabId: number,
      options: {
        type: "mnemonic" | "derivation";
        strength?: number; // 128 - 256
        passphrase?: string; // UTF-8 NFKD
        path?: string; // m or m/*
      },
      dialogOption?: dialogOption
    ) => Promise<string | undefined>; // xpub
    shareWith: (
      tabId: number,
      pubkey: string, // Either npub or hex format.
      options: {
        type: "mnemonic" | "derivation" | "xprv";
        xpub?: string;
        path?: string; // m or m/*
      },
      dialogOption?: dialogOption
    ) => Promise<{ secret: string; sender: string; receiver: string } | null>;
  } & commonApis;

  const nostr: {
    generate: (
      tabId: number,
      options: {
        type: "single" | "mnemonic";
      },
      dialogOption?: dialogOption
    ) => Promise<string | undefined>; // HEX format pubkey
    sign: (
      tabId: number,
      message: string,
      options: {
        type: "signEvent";
      },
      dialogOption?: dialogOption
    ) => Promise<string | undefined>;
    encrypt: (
      tabId: number,
      plaintext: string,
      options: {
        type: "nip04" | "nip44";
        pubkey?: string; // Conversation partner's public key. If type is 'nip04' or 'nip44', then this is required.
        version?: string;
      },
      dialogOption?: dialogOption
    ) => Promise<string | undefined>;
    decrypt: (
      tabId: number,
      ciphertext: string,
      options: {
        type: "nip04" | "nip44";
        pubkey?: string; // Conversation partner's public key. If type is 'nip04' or 'nip44', then this is required.
        version?: string;
      },
      dialogOption?: dialogOption
    ) => Promise<string | undefined>;
  } & commonApis;
}
