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
  const askPermission: (
    protocolName: string,
    credentialName: string,
    dialogOption?: dialogOption
  ) => Promise<boolean>;
  const askPermissionChild: (protocolName: ProtocolName) => Promise<boolean>;

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
      message: string,
      option: {
        type: "signEvent";
      },
      dialogOption?: dialogOption
    ) => Promise<string | null>;
  } & commonApis;
}
