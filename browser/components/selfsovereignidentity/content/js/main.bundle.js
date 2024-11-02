import { j as jsxRuntimeExports, r as reactExports, H as HStack, B as Button, I as IconButton, L as LuPinOff, a as LuPin, V as VStack, G as GiBirdTwitter, T as Text, b as LuEyeOff, c as LuEye, d as Heading, S as StackDivider, e as Spinner, f as Box, g as Grid, h as GridItem, i as Switch, k as InputGroup, l as Input, F as Flex, C as Card, m as CardHeader, E as Editable, n as EditablePreview, o as EditableInput, p as CardBody, q as CardFooter, s as generateSecretKey, t as nsecEncode, u as getPublicKey, v as npubEncode, w as bytesToHex, N as NostrTypeGuard, x as decode, y as createRoot, z as ChakraProvider } from "./vendor.bundle.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const BitcoinLogo = (props) => {
  const { color, size, ...otherProps } = props;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: size,
      height: size,
      viewBox: "0 0 226.777 226.777",
      fill: color,
      ...otherProps,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M135.715 122.244c-2.614-1.31-8.437-3.074-15.368-3.533-6.934-.458-15.828 0-15.828 0v30.02s9.287.198 15.503-.26c6.21-.458 12.621-2.027 15.826-3.795 3.203-1.766 7.063-4.513 7.063-11.379 0-6.869-4.579-9.745-7.196-11.053zm-19.555-17.465c5.104-.197 10.532-1.373 14.453-3.532 3.925-2.158 6.148-5.557 6.02-10.66-.134-5.102-3.532-9.418-9.287-11.186-5.757-1.766-9.613-1.897-13.998-1.962-4.382-.064-8.83.328-8.83.328v27.012c.001 0 6.541.197 11.642 0z" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M113.413 0C50.777 0 0 50.776 0 113.413c0 62.636 50.777 113.413 113.413 113.413s113.411-50.777 113.411-113.413C226.824 50.776 176.049 0 113.413 0zm46.178 156.777c-8.44 5.887-17.465 6.935-21.455 7.456-1.969.259-5.342.532-8.959.744v22.738h-13.998v-22.37h-10.66v22.37H90.522v-22.37H62.987l2.877-16.812h8.371c2.814 0 3.989-.261 5.166-1.372 1.177-1.113 1.439-2.812 1.439-4.188V85.057c0-3.628-.295-4.61-1.963-6.473-1.668-1.867-5.591-2.112-7.8-2.112h-8.091V61.939h27.535V39.505h13.996v22.434h10.66V39.505h13.998v22.703c10.435.647 18.203 2.635 24.983 7.645 8.766 6.475 8.306 17.724 8.11 20.406-.195 2.682-1.372 7.85-3.729 11.183-2.352 3.337-8.108 6.673-8.108 6.673s6.801 1.438 11.578 5.036c4.771 3.598 8.307 9.941 8.106 19.229-.192 9.288-2.088 18.511-10.524 24.397z" })
      ]
    }
  );
};
BitcoinLogo.defaultProps = {
  color: "currentColor",
  size: "13"
};
const IDB_NAME = "selfsovereignidentity";
const STORE_NAME = "settings";
const KEY_NAME = "menuPin";
function Menu(props) {
  const [menuPin, setMenuPin] = reactExports.useState("nostr");
  const [db, setDb] = reactExports.useState();
  const { selectedMenu, setMenu } = props;
  reactExports.useEffect(() => {
    const request = indexedDB.open(IDB_NAME);
    request.onerror = (event) => {
      console.info(event);
    };
    request.onsuccess = (event) => {
      console.info("indexedDb onsuccess:", event.target.result);
      setDb(event.target.result);
      event.target.result.transaction(STORE_NAME).objectStore(STORE_NAME).get(KEY_NAME).onsuccess = (event2) => {
        console.info(event2.target.result);
        const initialMenu = (event2.target.result && event2.target.result.value) ?? "nostr";
        setMenuPin(initialMenu);
        setMenu(initialMenu);
      };
    };
    request.onupgradeneeded = (event) => {
      console.info("indexedDb onupgradeneeded:", event.target.result);
      setDb(event.target.result);
      event.target.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
  }, []);
  const handleToggole = (selectedPin) => {
    setMenuPin(selectedPin);
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.put({ key: KEY_NAME, value: selectedPin });
    request.onsuccess = (event) => {
      console.info(event);
    };
    request.onerror = (event) => {
      console.info(event);
    };
  };
  const buildMenu = reactExports.useCallback(() => {
    const list = [
      { name: "nostr", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GiBirdTwitter, {}) },
      { name: "bitcoin", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BitcoinLogo, {}) }
      // { name: 'lightning', icon: <MdElectricBolt />},
      // { name: 'ecash', icon: null},
    ];
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: list.map((menu, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: selectedMenu === menu.name ? "solid" : "transparent",
          leftIcon: menu.icon,
          onClick: (e) => {
            e.preventDefault();
            setMenu(menu.name);
          },
          children: menu.name.charAt(0).toUpperCase() + menu.name.slice(1)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        IconButton,
        {
          icon: menuPin === menu.name ? /* @__PURE__ */ jsxRuntimeExports.jsx(LuPinOff, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(LuPin, {}),
          variant: "transparent",
          "aria-label": "Toggle Pin",
          onClick: (e) => {
            e.preventDefault();
            handleToggole(menu.name);
          }
        }
      )
    ] }, index)) });
  }, [selectedMenu, menuPin, db]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(VStack, { children: buildMenu() });
}
function Bitcoin(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: '"The Times 03/Jan/2009 Chancellor on brink of second bailout for banks"' });
}
function Lightning(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: '"Lightning Is the Common Language of the Bitcoin Economy"' });
}
function initStore() {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityInit", {
      bubbles: true
    })
  );
}
function getAllCredentialsToStore() {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityGetAllCredentials", {
      bubbles: true
    })
  );
}
function addCredentialToStore(credential) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityCreateCredential", {
      bubbles: true,
      detail: transformToPayload(credential)
    })
  );
}
function modifyCredentialToStore(credential) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityUpdateCredential", {
      bubbles: true,
      detail: transformToPayload(credential)
    })
  );
}
function deleteCredentialToStore(deletedCredential, credentials) {
  if (credentials.length <= 2) {
    if (credentials.length === 2) {
      const leftCredential = credentials.find(
        (credential) => credential.guid !== deletedCredential.guid
      );
      leftCredential.primary = true;
      modifyCredentialToStore(leftCredential);
    }
  }
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityDeleteCredential", {
      bubbles: true,
      detail: transformToPayload(deletedCredential)
    })
  );
}
function removeAllCredentialsToStore() {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityRemoveAllCredentials", {
      bubbles: true
    })
  );
}
function onPrimaryChanged(changeSet) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityPrimaryChanged", {
      bubbles: true,
      detail: changeSet
    })
  );
}
function onPrefChanged(changeSet) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityPrefChanged", {
      bubbles: true,
      detail: changeSet
    })
  );
}
const dispatchEvents = {
  initStore,
  getAllCredentialsToStore,
  addCredentialToStore,
  modifyCredentialToStore,
  deleteCredentialToStore,
  removeAllCredentialsToStore,
  onPrimaryChanged,
  onPrefChanged
};
function transformToPayload(credential) {
  const newVal = { ...credential };
  newVal.properties = JSON.stringify(credential.properties);
  return newVal;
}
function transformCredentialsFromStore(credentialForPayloads) {
  return credentialForPayloads.map((credential) => {
    const properties = JSON.parse(credential.properties.replace(/^''$/g, '"'));
    return {
      ...credential,
      properties
    };
  });
}
function useChildActorEvent() {
  const [prefs, setPrefs] = reactExports.useState({
    nostr: true
  });
  const [credentials, setCredentials] = reactExports.useState([]);
  const [credentialsFromStore, setCredentialsFromStore] = reactExports.useState([null, []]);
  reactExports.useEffect(() => {
    window.addEventListener(
      "AboutSelfsovereignidentityChromeToContent",
      receiveFromChildActor
    );
    return () => {
      window.removeEventListener(
        "AboutSelfsovereignidentityChromeToContent",
        receiveFromChildActor
      );
    };
  }, []);
  reactExports.useEffect(() => {
    const [op, state] = credentialsFromStore;
    if (op === "add") {
      if (state[0].primary) {
        onPrimaryChanged({
          protocolName: state[0].protocolName,
          guid: state[0].guid
        });
      }
      setCredentials((prev) => [...prev, ...state]);
    } else if (op === "update") {
      setCredentials(
        (prev) => prev.map(
          (credential) => credential.guid === state[0].guid ? state[0] : credential
        )
      );
    } else if (op === "remove") {
      setCredentials(
        (prev) => prev.filter((credential) => credential.guid !== state[0].guid)
      );
    } else if (op === "removeAll") {
      setCredentials([]);
    } else {
      setCredentials((prev) => [...prev, ...state]);
    }
  }, [credentialsFromStore]);
  const receiveFromChildActor = (event) => {
    switch (event.detail.messageType) {
      case "Setup":
      case "AllCredentials": {
        const newState = transformCredentialsFromStore(
          event.detail.value.credentials
        );
        setCredentialsFromStore(["get", newState]);
        break;
      }
      case "CredentialAdded": {
        const newState = transformCredentialsFromStore([event.detail.value]);
        setCredentialsFromStore(["add", newState]);
        break;
      }
      case "CredentialModified": {
        const newState = transformCredentialsFromStore([event.detail.value]);
        setCredentialsFromStore(["update", newState]);
        break;
      }
      case "CredentialRemoved": {
        setCredentialsFromStore(["remove", [event.detail.value]]);
        break;
      }
      case "RemoveAllCredentials": {
        setCredentialsFromStore(["removeAll", []]);
        break;
      }
      case "Prefs": {
        setPrefs(event.detail.value);
        break;
      }
    }
  };
  return {
    prefs,
    credentials
  };
}
function promptForPrimaryPassword(messageId) {
  return new Promise((resolve) => {
    window.AboutSelfsovereignidentityUtils.promptForPrimaryPassword(
      resolve,
      messageId
    );
  });
}
function Secret(props) {
  const [visible, setVisible] = reactExports.useState(false);
  const { value, textProps, onChangeVisibility } = props;
  const maskedValue = reactExports.useCallback(() => "*".repeat(value.length), [value]);
  const handleToggole = async () => {
    if (visible === false) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-reveal-password-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        alert("sorry!");
        return;
      }
    }
    setVisible((prev) => !prev);
    onChangeVisibility();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
    visible ? /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { ...textProps, children: value }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { ...textProps, children: maskedValue() }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      IconButton,
      {
        icon: visible ? /* @__PURE__ */ jsxRuntimeExports.jsx(LuEyeOff, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(LuEye, {}),
        variant: "transparent",
        "aria-label": "Toggle password visibility",
        onClick: handleToggole
      }
    )
  ] });
}
const NostrTemplate = {
  protocolName: "nostr",
  credentialName: "nsec",
  identifier: "",
  // npub key
  secret: "",
  // nsec key
  primary: false,
  properties: {
    pubkey: "",
    // raw pubkey
    seckey: "",
    // raw seckey
    displayName: ""
  }
};
function Nostr(props) {
  const { prefs, credentials } = useChildActorEvent();
  const {
    initStore: initStore2,
    addCredentialToStore: addCredentialToStore2,
    modifyCredentialToStore: modifyCredentialToStore2,
    deleteCredentialToStore: deleteCredentialToStore2,
    removeAllCredentialsToStore: removeAllCredentialsToStore2,
    onPrimaryChanged: onPrimaryChanged2,
    onPrefChanged: onPrefChanged2
  } = dispatchEvents;
  const [nseckey, setNseckey] = reactExports.useState("");
  const [newKey, setNewKey] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  reactExports.useState("");
  const nostrkeys = reactExports.useMemo(
    () => credentials.filter((credential) => credential.protocolName === "nostr").sort((a, b) => b.primary ? 1 : 0),
    [credentials]
  );
  reactExports.useEffect(() => {
    setLoading(true);
    initStore2();
    setLoading(false);
  }, []);
  const handleEnable = (e) => {
    e.preventDefault();
    const checked = e.target.checked;
    onPrefChanged2({ protocolName: "nostr", enabled: checked });
  };
  const handleGenNewKey = (e) => {
    e.preventDefault();
    const seckey = generateSecretKey();
    const nseckey2 = nsecEncode(seckey);
    const pubkey = getPublicKey(seckey);
    const npubkey = npubEncode(pubkey);
    addCredentialToStore2({
      ...NostrTemplate,
      identifier: npubkey,
      secret: nseckey2,
      primary: nostrkeys.length === 0,
      properties: {
        displayName: npubkey,
        pubkey,
        seckey: bytesToHex(seckey)
      }
    });
    setNewKey(npubkey);
  };
  const handleNewKeyChange = (e) => setNseckey(e.target.value);
  const handleSave = (e) => {
    e.preventDefault();
    if (!NostrTypeGuard.isNSec(nseckey)) {
      alert("The typed key is not nsec!");
      return;
    }
    if (nostrkeys.some((key) => key.secret === nseckey)) {
      alert("The typed key is existing!");
      return;
    }
    const { data: seckey } = decode(nseckey);
    const pubkey = getPublicKey(seckey);
    const npubkey = npubEncode(pubkey);
    addCredentialToStore2({
      ...NostrTemplate,
      identifier: npubkey,
      secret: nseckey,
      primary: nostrkeys.length === 0,
      properties: {
        displayName: npubkey,
        pubkey,
        seckey: bytesToHex(seckey)
      }
    });
    setNseckey("");
  };
  const handleChangePrimary = reactExports.useCallback(
    (checked, item) => {
      let newPrimaryGuid = "";
      if (checked === true) {
        const prevs = nostrkeys.filter((key) => key.primary);
        for (const prev of prevs) {
          modifyCredentialToStore2({
            ...prev,
            primary: false
          });
        }
        newPrimaryGuid = item.guid;
      } else {
        const prev = nostrkeys.find((key) => !key.primary);
        modifyCredentialToStore2({
          ...prev,
          primary: true
        });
        newPrimaryGuid = prev.guid;
      }
      modifyCredentialToStore2({
        ...item,
        primary: checked
      });
      onPrimaryChanged2({ protocolName: "nostr", guid: newPrimaryGuid });
      window.location.reload();
    },
    [nostrkeys]
  );
  const handleAllRemove = (e) => {
    e.preventDefault();
    if (!confirm("All data will be deleted. Okay?")) {
      return;
    }
    removeAllCredentialsToStore2();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h2", children: "NIP-07" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Your key will be stored in local, where separated and not been able to accessed from web apps." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      VStack,
      {
        divider: /* @__PURE__ */ jsxRuntimeExports.jsx(StackDivider, { borderColor: "gray.200" }),
        spacing: 4,
        align: "stretch",
        children: [
          loading && /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, { size: "xl" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "100px 1fr", gap: 6, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "enable-nostr", children: "Enable" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                id: "enable-nostr",
                isChecked: prefs.nostr,
                onChange: handleEnable
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "New Key" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  colorScheme: "blue",
                  onClick: handleGenNewKey,
                  children: "Generate"
                }
              ),
              newKey && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { as: "mark", children: newKey })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Import" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  placeholder: "nsec key",
                  value: nseckey,
                  onChange: handleNewKeyChange,
                  maxW: "500px"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  colorScheme: "blue",
                  onClick: handleSave,
                  children: "Save"
                }
              )
            ] }) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            nostrkeys.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "No key is regisitered." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Flex, { gap: 6, wrap: "wrap", children: nostrkeys.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { maxW: "md", overflow: "hidden", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Editable,
                {
                  defaultValue: item.properties.displayName,
                  onSubmit: (value) => modifyCredentialToStore2({
                    ...item,
                    properties: {
                      ...item.properties,
                      displayName: value
                    }
                  }),
                  isTruncated: true,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(EditablePreview, {}),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(EditableInput, {})
                  ]
                }
              ) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(CardBody, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "Nostr Public Key" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", isTruncated: true, children: item.identifier })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "Nostr Secret Key" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Secret,
                    {
                      value: item.secret,
                      onChangeVisibility: () => {
                      },
                      textProps: { fontSize: "sm", isTruncated: true }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "Raw Public Key" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", isTruncated: true, children: item.properties.pubkey })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "Raw Secret Key" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Secret,
                    {
                      value: item.properties.seckey,
                      onChangeVisibility: () => {
                      },
                      textProps: { fontSize: "sm", isTruncated: true }
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(CardFooter, { pt: "0", justify: "space-evenly", children: [
                nostrkeys.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { gap: "2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Switch,
                    {
                      isChecked: item.primary,
                      onChange: (e) => handleChangePrimary(e.target.checked, item),
                      alignSelf: "center"
                    }
                  ),
                  item.primary && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "primary now" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "ghost",
                    colorScheme: "blue",
                    onClick: () => deleteCredentialToStore2(item, nostrkeys),
                    children: "Delete"
                  }
                )
              ] })
            ] }, i)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", colorScheme: "blue", onClick: handleAllRemove, children: "Reset" }) })
        ]
      }
    )
  ] });
}
function ECash(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: '"Automation of the way we pay for goods and services is already underway, as can be seen by the variety and growth of electronic banking services available to consumers."' });
}
function Home(props) {
  const [selectedMenu, setSelectedMenu] = reactExports.useState("nostr");
  reactExports.useEffect(() => {
  }, []);
  const setMenu = (menuItem) => {
    setSelectedMenu(menuItem);
  };
  const switchContent = () => {
    if (selectedMenu === "bitcoin") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Bitcoin, {});
    } else if (selectedMenu === "lightning") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Lightning, {});
    } else if (selectedMenu === "ecash") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ECash, {});
    } else if (selectedMenu === "nostr") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Nostr, {});
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { m: 10, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { w: "100%", h: "100%", templateColumns: "200px auto", gap: 4, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 1, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { selectedMenu, setMenu }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 1, children: switchContent() })
  ] }) });
}
var HomeOverlay = function() {
  this.inited = false;
  this.active = false;
};
HomeOverlay.prototype = {
  create() {
    if (this.active) {
      return;
    }
    this.active = true;
    const container = document.querySelector(`body`);
    const root = createRoot(container);
    root.render(
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChakraProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Home, {}) })
    );
  }
};
var SSI_PANEL = function() {
};
SSI_PANEL.prototype = {
  initHome() {
    this.overlay = new HomeOverlay();
    this.init();
  },
  setupObservers() {
    this.setupMutationObserver();
    this.setupIntersectionObserver();
  },
  init() {
    if (this.inited) {
      return;
    }
    this.setupObservers();
    this.inited = true;
  },
  resizeParent() {
    document.body.clientHeight;
    if (this.overlay.tagsDropdownOpen) ;
  },
  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      if (entries.find((e) => e.isIntersecting)) {
        this.resizeParent();
        observer.unobserve(document.body);
      }
    });
    observer.observe(document.body);
  },
  setupMutationObserver() {
    const targetNode = document.body;
    const config = { attributes: false, childList: true, subtree: true };
    const callback = (mutationList, observer2) => {
      mutationList.forEach((mutation) => {
        switch (mutation.type) {
          case "childList": {
            this.resizeParent();
            break;
          }
        }
      });
    };
    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
  },
  create() {
    this.overlay.create();
  }
};
window.SSI_PANEL = SSI_PANEL;
