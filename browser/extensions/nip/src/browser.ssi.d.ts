/// <reference types="../../../../tools/@types/lib.gecko.xpcom.d.ts" />

// built-in api
// ref: browser/components/extensions/schemas/ssi
declare namespace browser.ssi {
  type dialogOption = {
    caption?: string;
    submission?: string;
    enforce?: boolean;
  };

  const searchCredentialsWithoutSecret: (
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

  const nostr: {
    sign: (
      tabId: number,
      message: string,
      option: {
        type: "signEvent";
      },
      dialogOption?: dialogOption
    ) => Promise<string | null>;
    encrypt: (
      tabId: number,
      plaintext: string,
      option: {
        type: "nip04" | "nip44";
        pubkey?: string; // Conversation partner's public key. If type is 'nip04' or 'nip44', then this is required.
        version?: string;
      },
      dialogOption?: dialogOption
    ) => Promise<string | null>;
    decrypt: (
      tabId: number,
      ciphertext: string,
      option: {
        type: "nip04" | "nip44";
        pubkey?: string; // Conversation partner's public key. If type is 'nip04' or 'nip44', then this is required.
        version?: string;
      },
      dialogOption?: dialogOption
    ) => Promise<string | null>;
  } & commonApis;
}
