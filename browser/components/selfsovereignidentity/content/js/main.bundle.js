import { j as jsxRuntimeExports, r as reactExports, H as HStack, B as Button, I as IconButton, V as VStack, s as schnorr, b as bytesToHex, a as bech32, A as AlertDialog, M as ModalOverlay, c as AlertDialogContent, d as ModalHeader, e as ModalCloseButton, f as ModalBody, L as Link, g as ModalFooter, R as React, T as Text, G as GridItem, h as Heading, S as StackDivider, i as Box, k as Grid, l as Switch, m as Tabs, n as TabList, o as Tab, p as TabPanels, q as TabPanel, t as InputGroup, u as Input, D as Divider, N as NumberInput, v as NumberInputField, w as NumberInputStepper, x as NumberIncrementStepper, y as NumberDecrementStepper, F as Flex, C as Card, z as CardHeader, E as Editable, J as EditablePreview, K as EditableInput, O as CardBody, P as CardFooter, Q as hexToBytes, U as createRoot, W as ChakraProvider } from "./vendor.bundle.js";
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
const DefaultContext = {
  color: void 0,
  size: void 0,
  className: void 0,
  style: void 0,
  attr: void 0
};
const IconContext = reactExports.createContext && reactExports.createContext(DefaultContext);
function Tree2Element(tree) {
  return tree && tree.map(
    (node, i) => reactExports.createElement(
      node.tag,
      { key: i, ...node.attr },
      Tree2Element(node.child)
    )
  );
}
function GenIcon(data) {
  return (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(IconBase, { attr: { ...data.attr }, ...props, children: Tree2Element(data.child) });
}
function IconBase(props) {
  const elem = (conf) => {
    const { attr, size, title, ...svgProps } = props;
    const computedSize = size || conf.size || "1em";
    let className;
    if (conf.className) className = conf.className;
    if (props.className)
      className = (className ? className + " " : "") + props.className;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "svg",
      {
        stroke: "currentColor",
        fill: "currentColor",
        strokeWidth: "0",
        ...conf.attr,
        ...attr,
        ...svgProps,
        className,
        style: {
          color: props.color || conf.color,
          ...conf.style,
          ...props.style
        },
        height: computedSize,
        width: computedSize,
        xmlns: "http://www.w3.org/2000/svg",
        children: [
          title && /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: title }),
          props.children
        ]
      }
    );
  };
  return IconContext !== void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconContext.Consumer, { children: (conf) => elem(conf) }) : elem(DefaultContext);
}
function LuEyeOff(props) {
  return GenIcon({
    tag: "svg",
    attr: {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    child: [
      { tag: "path", attr: { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24" }, child: [] },
      {
        tag: "path",
        attr: {
          d: "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
        },
        child: []
      },
      {
        tag: "path",
        attr: {
          d: "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
        },
        child: []
      },
      {
        tag: "line",
        attr: { x1: "2", x2: "22", y1: "2", y2: "22" },
        child: []
      }
    ]
  })(props);
}
function LuEye(props) {
  return GenIcon({
    tag: "svg",
    attr: {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    child: [
      {
        tag: "path",
        attr: { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" },
        child: []
      },
      { tag: "circle", attr: { cx: "12", cy: "12", r: "3" }, child: [] }
    ]
  })(props);
}
function LuPinOff(props) {
  return GenIcon({
    tag: "svg",
    attr: {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    child: [
      {
        tag: "line",
        attr: { x1: "2", x2: "22", y1: "2", y2: "22" },
        child: []
      },
      {
        tag: "line",
        attr: { x1: "12", x2: "12", y1: "17", y2: "22" },
        child: []
      },
      {
        tag: "path",
        attr: {
          d: "M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12"
        },
        child: []
      },
      {
        tag: "path",
        attr: { d: "M15 9.34V6h1a2 2 0 0 0 0-4H7.89" },
        child: []
      }
    ]
  })(props);
}
function LuPin(props) {
  return GenIcon({
    tag: "svg",
    attr: {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    child: [
      {
        tag: "line",
        attr: { x1: "12", x2: "12", y1: "17", y2: "22" },
        child: []
      },
      {
        tag: "path",
        attr: {
          d: "M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"
        },
        child: []
      }
    ]
  })(props);
}
function GiBirdTwitter(props) {
  return GenIcon({
    tag: "svg",
    attr: { viewBox: "0 0 512 512" },
    child: [
      {
        tag: "path",
        attr: {
          d: "M77.313 28.438l36.406 51.25L44.874 98.25l34.688 18.53c-37.62 38-62.482 102.735-57.532 198.94V493h147.314v-.188H269.75c-13.74-59.032-15.368-110.625-5.563-149.875-16.954-7.98-25.126-17.362-32.75-30.375 51.348 21.135 127.618 35.582 200.47 18.594-23.227-10.096-47.07-22.578-70.094-37.156-.013-.007-.02-.024-.032-.03-17.996-10.514-34.942-22.247-49.967-36.376-9.385-7.88-18.41-16.142-26.907-24.78 36.074-25.505 77.297-40.297 118.656-46.876-7.72 5.104-15.336 10.82-22.687 16.937-18.272 15.207-34.737 32.736-45.313 50.656 4.9 3.986 10.02 7.785 15.313 11.44 9.017-15.524 24.43-33.122 41.97-47.72 24.26-20.193 52.937-34.698 70.06-35.375h.126c10.89.214 21.608.935 32.064 2.125-10.838-7.647-21.748-14.487-32.72-20.563v-.25c-.145.006-.29.025-.437.032-54.844-30.266-111.23-41.295-168.03-36.72-21.272-24.23-49.025-40.62-78.657-47.875L77.312 28.437zm74.343 107.312c4.67 0 9.16.754 13.375 2.125-8.493 2.716-14.655 10.667-14.655 20.063 0 11.634 9.428 21.062 21.063 21.062 9.84 0 18.122-6.754 20.437-15.875 1.934 4.905 3 10.252 3 15.844 0 23.867-19.35 43.218-43.22 43.218-23.867 0-43.218-19.35-43.218-43.22 0-23.867 19.35-43.218 43.22-43.218z"
        },
        child: []
      }
    ]
  })(props);
}
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
      console.error(event);
    };
    request.onsuccess = (event) => {
      setDb(event.target.result);
      event.target.result.transaction(STORE_NAME).objectStore(STORE_NAME).get(KEY_NAME).onsuccess = (event2) => {
        console.info(event2.target.result);
        const initialMenu = (event2.target.result && event2.target.result.value) ?? "nostr";
        setMenuPin(initialMenu);
        setMenu(initialMenu);
      };
    };
    request.onupgradeneeded = (event) => {
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
    };
    request.onerror = (event) => {
      console.error(event);
    };
  };
  const buildMenu = reactExports.useCallback(() => {
    const list = [
      { name: "bitcoin", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BitcoinLogo, {}) },
      { name: "nostr", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GiBirdTwitter, {}) }
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
function modifyCredentialToStore(credential, options) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityUpdateCredential", {
      bubbles: true,
      detail: { credential: transformToPayload(credential), options }
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
  if (credential.trustedSites) {
    newVal.trustedSites = JSON.stringify(credential.trustedSites);
  }
  if (credential.passwordAuthorizedSites) {
    newVal.passwordAuthorizedSites = JSON.stringify(
      credential.passwordAuthorizedSites
    );
  }
  if (credential.properties) {
    newVal.properties = JSON.stringify(credential.properties);
  }
  return newVal;
}
function transformCredentialsFromStore(credentialForPayloads) {
  return credentialForPayloads.map((credential) => {
    const trustedSites = JSON.parse(
      credential.trustedSites.replace(/^''$/g, '"')
    );
    const passwordAuthorizedSites = JSON.parse(
      credential.passwordAuthorizedSites.replace(/^''$/g, '"')
    );
    const properties = JSON.parse(credential.properties.replace(/^''$/g, '"'));
    return {
      ...credential,
      trustedSites,
      passwordAuthorizedSites,
      properties
    };
  });
}
function useChildActorEvent() {
  const [prefs, setPrefs] = reactExports.useState({
    nostr: {
      enabled: true,
      usedPrimarypasswordToSettings: true,
      expiryTimeForPrimarypasswordToSettings: 3e5,
      usedPrimarypasswordToApps: true,
      expiryTimeForPrimarypasswordToApps: 864e5,
      usedTrustedSites: false,
      usedBuiltinNip07: true,
      usedAccountChanged: true
    },
    addons: []
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
        setPrefs((prev) => ({ ...prev, addons: event.detail.value.addons }));
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
        if (event.detail.value) {
          setPrefs((prev) => {
            const newState = {
              ...prev
            };
            const keys = Object.keys(event.detail.value);
            for (const protocolName of keys) {
              newState[protocolName] = {
                ...prev[protocolName],
                ...event.detail.value[protocolName]
              };
            }
            return newState;
          });
        }
        break;
      }
      case "ShowCredentialItemError": {
        console.error("ShowCredentialItemError", event);
        alert(`Oops...got error: ${event.detail.value.errorMessage}`);
        break;
      }
      default: {
        console.log(event);
      }
    }
  };
  return {
    prefs,
    credentials
  };
}
const BIP340 = {
  generateSecretKey: () => schnorr.utils.randomPrivateKey(),
  generatePublicKey: (secretKey) => bytesToHex(schnorr.getPublicKey(secretKey))
};
const NostrTypeGuard = {
  isNSec: (value) => /^nsec1[a-z\d]{58}$/.test(value || "")
};
const Bech32MaxSize = 5e3;
const encodeToNostrKey = (prefix, bytes) => {
  const words = bech32.toWords(bytes);
  return bech32.encode(
    prefix,
    words,
    Bech32MaxSize
  );
};
const decodeFromNostrKey = (nip19) => {
  const { prefix, words } = bech32.decode(nip19, Bech32MaxSize);
  const data = new Uint8Array(bech32.fromWords(words));
  switch (prefix) {
    case "nsec":
      return { type: prefix, data };
    case "npub":
      return { type: prefix, data: bytesToHex(data) };
  }
};
function promptForPrimaryPassword(messageId) {
  return new Promise((resolve) => {
    window.AboutSelfsovereignidentityUtils.promptForPrimaryPassword(
      resolve,
      messageId
    );
  });
}
function AlertPrimaryPassword(props) {
  const { cancelRef, onClose, isOpen } = props;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AlertDialog,
    {
      leastDestructiveRef: cancelRef,
      onClose,
      isOpen,
      isCentered: true,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ModalOverlay, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ModalHeader, { children: " Sorry!" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ModalCloseButton, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(ModalBody, { children: [
          "Please set",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Link,
            {
              color: "teal.500",
              href: "https://support.mozilla.org/en-US/kb/use-primary-password-protect-stored-logins?as=u&utm_source=inproduct&redirectslug=use-master-password-protect-stored-logins&redirectlocale=en-US",
              children: "primary password"
            }
          ),
          " ",
          ', or turn off "Use primary password to setting page".'
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ModalFooter, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(VStack, { align: "stretch", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "NEXT ACTION" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            "To set, go to",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { color: "teal.500", href: "about:preferences#privacy", children: "about:preferences#privacy" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: 'To turn off, open "More" tab' })
        ] }) })
      ] }) })
    }
  );
}
function Secret(props) {
  const [visible, setVisible] = reactExports.useState(false);
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  const {
    value,
    textProps,
    onChangeVisibility,
    usedPrimarypasswordToSettings
  } = props;
  const maskedValue = reactExports.useCallback(() => "*".repeat(value.length), [value]);
  const handleToggole = async () => {
    if (visible === false && usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-secrets-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    setVisible((prev) => !prev);
    onChangeVisibility();
  };
  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
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
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AlertPrimaryPassword,
      {
        isOpen: isOpenDialog,
        onClose: onCloseDialog,
        cancelRef
      }
    )
  ] });
}
const SafeProtocols = ["http", "https", "moz-extension"];
const DefaultTrustedSites = [
  {
    name: "",
    url: "http://localhost",
    permissions: { read: true, write: true, admin: true }
  }
];
const OneHour = 60 * 60 * 1e3;
function NIP07(props) {
  const { prefs, credentials } = props;
  const { modifyCredentialToStore: modifyCredentialToStore2, onPrefChanged: onPrefChanged2 } = dispatchEvents;
  const [newSite, setNewSite] = reactExports.useState("");
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  reactExports.useState("");
  const nostrkeys = reactExports.useMemo(
    () => credentials.filter((credential) => credential.protocolName === "nostr").sort((a, b) => b.primary ? 1 : 0),
    [credentials]
  );
  const handleUsedTrustedSites = async (checked) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    onPrefChanged2({ protocolName: "nostr", usedTrustedSites: checked });
  };
  const handleNewSiteChange = (e) => setNewSite(e.target.value);
  const handleRegisterSite = async (e) => {
    e.preventDefault();
    if (!SafeProtocols.some((protocol) => newSite.startsWith(protocol))) {
      alert(`Currently, only supports ${SafeProtocols.join(",")}.`);
      return;
    }
    const found = nostrkeys.some(
      (site) => site.trustedSites.some((site2) => site2.url === newSite)
    );
    if (found) {
      alert("The url exists already.");
      return;
    }
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    for (const item of nostrkeys) {
      modifyCredentialToStore2(
        {
          guid: item.guid,
          trustedSites: item.trustedSites.concat({
            name: "",
            url: newSite,
            permissions: {
              read: true,
              write: true,
              admin: true
            }
          })
        },
        newSite.startsWith("moz-extension") ? { newExtensionForTrustedSite: newSite } : null
      );
    }
  };
  const handleRemoveSite = async (removedSite) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    for (const item of nostrkeys) {
      modifyCredentialToStore2({
        guid: item.guid,
        trustedSites: item.trustedSites.filter(
          (site) => site.url !== removedSite.url
        )
      });
    }
  };
  const handleUsedBuiltinNip07 = (e) => {
    e.preventDefault();
    const checked = e.target.checked;
    onPrefChanged2({ protocolName: "nostr", usedBuiltinNip07: checked });
  };
  const handleUsedPrimarypasswordToApps = async (checked) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    onPrefChanged2({
      protocolName: "nostr",
      usedPrimarypasswordToApps: checked
    });
  };
  const handleExpiryTimeForPrimarypasswordToApps = async (valueAsString, valueAsNumber) => {
    const primaryPasswordAuth = await promptForPrimaryPassword(
      "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
    );
    if (!primaryPasswordAuth) {
      setIsOpenDialog(true);
      return;
    }
    onPrefChanged2({
      protocolName: "nostr",
      expiryTimeForPrimarypasswordToApps: valueAsNumber * OneHour
    });
  };
  const handleRevokeSite = async (revokedSite) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    for (const item of nostrkeys) {
      modifyCredentialToStore2({
        guid: item.guid,
        passwordAuthorizedSites: item.passwordAuthorizedSites.map((site) => {
          if (site.url === revokedSite.url) {
            site.expiryTime = 0;
          }
          return site;
        })
      });
    }
  };
  const handleUsedAccountChanged = (e) => {
    e.preventDefault();
    const checked = e.target.checked;
    onPrefChanged2({ protocolName: "nostr", usedAccountChanged: checked });
  };
  const getTrustedSites = reactExports.useCallback(() => {
    const trustedSites = Array.from(
      new Set(
        nostrkeys.map((key) => key.trustedSites).flat().map((site) => JSON.stringify(site))
      )
    ).map((site) => JSON.parse(site));
    return trustedSites.length > 0 ? trustedSites.map((site) => /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Heading, { as: "h5", size: "sm", children: [
        site.url,
        site.name && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          " (",
          site.name,
          ")"
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outline",
          colorScheme: "blue",
          onClick: () => handleRemoveSite(site),
          children: "Remove from All keys"
        }
      ) })
    ] })) : /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "No site registered" });
  }, [nostrkeys]);
  const getPasswordAuthorizedSites = reactExports.useCallback(() => {
    const passwordAuthorizedSites = nostrkeys.map((key) => ({
      [key.properties.displayName]: key.passwordAuthorizedSites
    }));
    return passwordAuthorizedSites.map((site) => {
      const [key, value] = Object.entries(site)[0];
      const validSites = value.filter((site2) => site2.expiryTime > Date.now());
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: key }) }),
        validSites.length > 0 ? validSites.map((validSite) => {
          const expiryTime = new Date(validSite.expiryTime);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Heading, { as: "h6", size: "sm", children: [
              validSite.url,
              " (until ",
              expiryTime.toLocaleDateString(),
              " ",
              expiryTime.toLocaleTimeString(),
              ")"
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outline",
                colorScheme: "blue",
                onClick: () => handleRevokeSite(validSite),
                children: "Revoke"
              }
            ) })
          ] });
        }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "No site registered" })
      ] });
    });
  }, [nostrkeys]);
  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      VStack,
      {
        divider: /* @__PURE__ */ jsxRuntimeExports.jsx(StackDivider, { borderColor: "gray.200" }),
        spacing: 4,
        align: "stretch",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "400px 1fr", gap: 6, alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: 'You can still use these features realated to your keys on extensions/apps compatible with this browser, even if turning off "Use built-in NIP-07".' }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "nostr-pref-usedBuiltinNip07", children: "Use built-in NIP-07" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                id: "nostr-pref-usedBuiltinNip07",
                isChecked: prefs.nostr.usedBuiltinNip07,
                onChange: handleUsedBuiltinNip07
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "nostr-pref-usedAccountChanged", children: 'Notify "Account Changed" to Web apps' }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                id: "nostr-pref-usedAccountChanged",
                isChecked: prefs.nostr.usedAccountChanged,
                onChange: handleUsedAccountChanged
              }
            ) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { variant: "enclosed", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TabList, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h4", size: "md", children: "Trusted Sites" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h4", size: "md", children: "Authorized Sites by Password" }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TabPanels, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TabPanel, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Grid,
                {
                  gridTemplateColumns: "400px 1fr",
                  gap: 6,
                  alignItems: "center",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "nostr-pref-usedTrustedSites", children: "Enable" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Switch,
                      {
                        id: "nostr-pref-usedTrustedSites",
                        isChecked: prefs.nostr.usedTrustedSites,
                        onChange: (e) => handleUsedTrustedSites(e.target.checked)
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Register" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Input,
                        {
                          placeholder: "https://example/",
                          value: newSite,
                          onChange: handleNewSiteChange,
                          onKeyPress: (e) => {
                            if (e.key === "Enter") {
                              handleRegisterSite(e);
                            }
                          },
                          maxW: "500px"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: handleRegisterSite,
                          children: "Register to All keys"
                        }
                      )
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, {}),
                    getTrustedSites()
                  ]
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TabPanel, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Grid,
                {
                  gridTemplateColumns: "400px 1fr",
                  gap: 6,
                  alignItems: "center",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "nostr-pref-usedPrimarypasswordToApps", children: "Enable" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Switch,
                      {
                        id: "nostr-pref-usedPrimarypasswordToApps",
                        isChecked: prefs.nostr.usedPrimarypasswordToApps,
                        onChange: (e) => handleUsedPrimarypasswordToApps(e.target.checked)
                      }
                    ) }),
                    prefs.nostr.usedPrimarypasswordToApps && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "nostr-pref-expiryTimeForPrimarypasswordToApps", children: "Expiry Hour" }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        NumberInput,
                        {
                          id: "nostr-pref-expiryTimeForPrimarypasswordToApps",
                          value: prefs.nostr.expiryTimeForPrimarypasswordToApps / OneHour,
                          onChange: handleExpiryTimeForPrimarypasswordToApps,
                          min: 0,
                          size: "sm",
                          maxW: 20,
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(NumberInputField, {}),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(NumberInputStepper, { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(NumberIncrementStepper, {}),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(NumberDecrementStepper, {})
                            ] })
                          ]
                        }
                      ) })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, {}),
                    getPasswordAuthorizedSites()
                  ]
                }
              ) })
            ] })
          ] }) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AlertPrimaryPassword,
      {
        isOpen: isOpenDialog,
        onClose: onCloseDialog,
        cancelRef
      }
    )
  ] });
}
const NostrTemplate = {
  protocolName: "nostr",
  credentialName: "nsec",
  identifier: "",
  // npubkey
  secret: "",
  // raw seckey
  primary: false,
  trustedSites: [],
  passwordAuthorizedSites: [],
  properties: {
    displayName: ""
  }
};
function Nostr$2(props) {
  const { prefs, credentials } = props;
  const {
    addCredentialToStore: addCredentialToStore2,
    modifyCredentialToStore: modifyCredentialToStore2,
    deleteCredentialToStore: deleteCredentialToStore2,
    removeAllCredentialsToStore: removeAllCredentialsToStore2,
    onPrimaryChanged: onPrimaryChanged2,
    onPrefChanged: onPrefChanged2
  } = dispatchEvents;
  const [importedKey, setImportedKey] = reactExports.useState("");
  const [newKey, setNewKey] = reactExports.useState("");
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  reactExports.useState("");
  const nostrkeys = reactExports.useMemo(
    () => credentials.filter((credential) => credential.protocolName === "nostr").sort((a, b) => b.primary ? 1 : 0),
    [credentials]
  );
  const defaultTrustedSites = reactExports.useMemo(
    () => [
      ...DefaultTrustedSites,
      ...prefs.addons.map((addon) => ({
        name: addon.name,
        url: addon.url,
        permissions: {
          read: true,
          write: true,
          admin: true
        }
      }))
    ],
    [prefs.addons]
  );
  const handleEnable = (e) => {
    e.preventDefault();
    const checked = e.target.checked;
    onPrefChanged2({ protocolName: "nostr", enabled: checked });
  };
  const handleGenNewKey = (e) => {
    e.preventDefault();
    const seckey = BIP340.generateSecretKey();
    const pubkey = BIP340.generatePublicKey(seckey);
    const npubkey = encodeToNostrKey("npub", hexToBytes(pubkey));
    addCredentialToStore2({
      ...NostrTemplate,
      identifier: npubkey,
      secret: bytesToHex(seckey),
      primary: nostrkeys.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        displayName: npubkey
      }
    });
    setNewKey(npubkey);
  };
  const handleImportedKeyChange = (e) => setImportedKey(e.target.value);
  const handleSave = (e) => {
    e.preventDefault();
    if (!NostrTypeGuard.isNSec(importedKey)) {
      alert("The typed key is not nsec!");
      return;
    }
    if (nostrkeys.some((key) => key.secret === importedKey)) {
      alert("The typed key is existing!");
      return;
    }
    const { data: seckey } = decodeFromNostrKey(importedKey);
    const pubkey = BIP340.generatePublicKey(seckey);
    const npubkey = encodeToNostrKey("npub", hexToBytes(pubkey));
    addCredentialToStore2({
      ...NostrTemplate,
      identifier: npubkey,
      secret: bytesToHex(seckey),
      primary: nostrkeys.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        displayName: npubkey
      }
    });
    setImportedKey("");
  };
  const handleChangePrimary = async (checked, item) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-secrets-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    let newPrimaryGuid = "";
    if (checked === true) {
      const prevs = nostrkeys.filter((key) => key.primary);
      for (const prev of prevs) {
        modifyCredentialToStore2({
          guid: prev.guid,
          primary: false
        });
      }
      newPrimaryGuid = item.guid;
    } else {
      const prev = nostrkeys.find((key) => !key.primary);
      if (prev) {
        modifyCredentialToStore2({
          guid: prev.guid,
          primary: true
        });
        newPrimaryGuid = prev.guid;
      }
    }
    modifyCredentialToStore2({
      guid: item.guid,
      primary: checked
    });
    onPrimaryChanged2({ protocolName: "nostr", guid: newPrimaryGuid });
  };
  const handleDeleteCredential = async (item) => {
    if (!confirm("The key can't be restored if no backup. Okay?")) {
      return;
    }
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-secrets-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    if (item.primary === true) {
      const prev = nostrkeys.find((key) => !key.primary);
      if (prev) {
        modifyCredentialToStore2({
          guid: prev.guid,
          primary: true
        });
      }
      onPrimaryChanged2({ protocolName: "nostr", guid: prev ? prev.guid : "" });
    }
    deleteCredentialToStore2(item, nostrkeys);
  };
  const handleAllRemove = async (e) => {
    e.preventDefault();
    if (!confirm("All data will be deleted. Okay?")) {
      return;
    }
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-secrets-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    removeAllCredentialsToStore2();
    onPrimaryChanged2({ protocolName: "nostr", guid: "" });
  };
  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };
  function addInterpretedKeys(item) {
    const rawSeckey = hexToBytes(item.secret);
    const nseckey = encodeToNostrKey("nsec", rawSeckey);
    const rawPubkey = BIP340.generatePublicKey(rawSeckey);
    return { ...item, nseckey, rawPubkey };
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      VStack,
      {
        divider: /* @__PURE__ */ jsxRuntimeExports.jsx(StackDivider, { borderColor: "gray.200" }),
        spacing: 4,
        align: "stretch",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "100px 1fr", gap: 6, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "nostr-pref-enabled", children: "Enable" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                id: "nostr-pref-enabled",
                isChecked: prefs.nostr.enabled,
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
              newKey && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { as: "mark", ml: "10px", children: newKey })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Import" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  placeholder: "nsec key",
                  value: importedKey,
                  onChange: handleImportedKeyChange,
                  onKeyPress: (e) => {
                    if (e.key === "Enter") {
                      handleSave(e);
                    }
                  },
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
            nostrkeys.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "No key regisitered" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Flex, { gap: 6, wrap: "wrap", children: nostrkeys.map(addInterpretedKeys).map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { maxW: "md", overflow: "hidden", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Editable,
                {
                  defaultValue: item.properties.displayName,
                  onSubmit: (value) => modifyCredentialToStore2({
                    guid: item.guid,
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
                      value: item.nseckey,
                      onChangeVisibility: () => {
                      },
                      usedPrimarypasswordToSettings: prefs.nostr.usedPrimarypasswordToSettings,
                      textProps: { fontSize: "sm", isTruncated: true }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "Raw Public Key" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", isTruncated: true, children: item.rawPubkey })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "Raw Secret Key" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Secret,
                    {
                      value: item.secret,
                      onChangeVisibility: () => {
                      },
                      usedPrimarypasswordToSettings: prefs.nostr.usedPrimarypasswordToSettings,
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
                    onClick: () => handleDeleteCredential(item),
                    children: "Delete"
                  }
                )
              ] })
            ] }, i)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", colorScheme: "blue", onClick: handleAllRemove, children: "Reset" }) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AlertPrimaryPassword,
      {
        isOpen: isOpenDialog,
        onClose: onCloseDialog,
        cancelRef
      }
    )
  ] });
}
function Nostr$1(props) {
  const { prefs } = props;
  const { onPrefChanged: onPrefChanged2 } = dispatchEvents;
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  reactExports.useState("");
  const handleUsedPrimarypasswordToSettings = async (checked) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    onPrefChanged2({
      protocolName: "nostr",
      usedPrimarypasswordToSettings: checked
    });
  };
  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      VStack,
      {
        divider: /* @__PURE__ */ jsxRuntimeExports.jsx(StackDivider, { borderColor: "gray.200" }),
        spacing: 4,
        align: "stretch",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(HStack, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "400px 1fr", gap: 6, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "nostr-pref-usedPrimarypasswordToSettings", children: "Use primary password to setting page" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              id: "nostr-pref-usedPrimarypasswordToSettings",
              isChecked: prefs.nostr.usedPrimarypasswordToSettings,
              onChange: (e) => handleUsedPrimarypasswordToSettings(e.target.checked)
            }
          ) })
        ] }) })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AlertPrimaryPassword,
      {
        isOpen: isOpenDialog,
        onClose: onCloseDialog,
        cancelRef
      }
    )
  ] });
}
function Nostr(props) {
  const { prefs, credentials } = props;
  const { initStore: initStore2 } = dispatchEvents;
  reactExports.useEffect(() => {
    initStore2();
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "md", mb: "10px", children: "Your keys are stored locally, isolated from and inaccessible to the web app." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { variant: "enclosed", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabList, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h3", size: "lg", children: "Keys" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h3", size: "lg", children: "NIP-07" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h3", size: "lg", children: "More" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabPanels, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabPanel, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Nostr$2, { prefs, credentials }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabPanel, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(NIP07, { prefs, credentials }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabPanel, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Nostr$1, { prefs, credentials }) })
      ] })
    ] })
  ] });
}
function ECash(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: '"Automation of the way we pay for goods and services is already underway, as can be seen by the variety and growth of electronic banking services available to consumers."' });
}
function Selfsovereignidentity(props) {
  const [selectedMenu, setSelectedMenu] = reactExports.useState("nostr");
  const { prefs, credentials } = useChildActorEvent();
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
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Nostr, { prefs, credentials });
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
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChakraProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Selfsovereignidentity, {}) })
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
