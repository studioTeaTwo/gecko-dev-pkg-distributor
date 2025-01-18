// experiment api
// ref: browser/extensions/nip/experiment-apis/builtinNip.json
declare namespace browser.builtinNip {
  const getPrefs: () => Promise<{
    "builtinNip07.enabled": boolean;
  } | null>;
  const onPrefBuiltinNip07Changed: {
    addListener: (listener: (prefKey: string) => void) => void;
    rmoveListener: (listener: (prefKey: string) => void) => void;
    hasListener: (listener: (prefKey: string) => void) => boolean;
  };
}
