// experiment api
// refs: browser/extensions/selfsovereignidentity/experiment-apis/addonsSelfsovereignidentity.json
declare namespace browser.ssi {
  interface Credential {
    protocolName: ProtocolName;
    credentialName: string;
    primary: boolean;
    secret: string;
    identifier: string;
    trustedSites: object[];
    properties: object;
    guid?: string;
  }

  const searchCredentialsWithoutSecret: (
    protocolName: ProtocolName,
    credentialName: string,
    primary: boolean
  ) => Promise<Credential[] | null>;
  const askPermission: (
    protocolName: ProtocolName,
    credentialName: string,
    message?: string
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
      addListener: (listener: (prefKey: string) => void) => void;
      rmoveListener: (listener: (prefKey: string) => void) => void;
      hasListener: (llistener: (prefKey: string) => void) => boolean;
    };
  };

  const nostr: {
    sign: (serializedEvent: string) => Promise<string | null>;
  } & commonApis;
}

type PublicKey = string;
type Signature = string;
type PlainText = string;
interface WindowSSI extends EventTarget {
  _scope: "ssi";
  _proxy: EventTarget;

  readonly nostr: {
    _proxy: EventTarget;
    generate: (option?) => Promise<PublicKey>;
    getPublicKey: (option?) => Promise<PublicKey>;
    sign: (message: string, option?) => Promise<Signature>;
    decrypt: (ciphertext: string, option?) => Promise<PlainText>;
    messageBoard?: unknown;
  } & EventTarget;
}
// Window incompatible types
interface Window {
  ssi: Readonly<WindowSSI>;
  emit: (action: string) => void;
}
// eslint-disable-next-line no-var
declare var window: Window;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type FixMe = any;
