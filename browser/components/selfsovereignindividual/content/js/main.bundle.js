import { j as jsxRuntimeExports, r as reactExports, B as Box, H as HStack, a as Button, F as Flex, V as VStack, D as Divider, R as React, A as AlertDialog, M as ModalOverlay, b as AlertDialogContent, c as ModalHeader, d as ModalCloseButton, e as ModalBody, L as Link, f as ModalFooter, T as Text, I as IconButton, g as Accordion, h as AccordionItem, i as AccordionButton, k as Icon, l as AccordionIcon, m as AccordionPanel, n as TableContainer, o as Table, p as Thead, q as Tr, s as Th, t as Tbody, u as Td, v as bech32, w as bytesToHex, C as Card, x as CardHeader, y as Heading, E as Editable, z as EditablePreview, G as Input, J as EditableInput, K as CardBody, N as Textarea, O as Grid, P as GridItem, Q as hexToBytes, S as InputGroup, U as Tooltip, W as Menu$1, X as MenuButton, Y as MenuList, Z as MenuItem, _ as Checkbox, $ as Switch, a0 as StackDivider, a1 as CardFooter, a2 as useEditableControls, a3 as Select, a4 as Tabs, a5 as TabList, a6 as Tab, a7 as TabPanels, a8 as TabPanel, a9 as Spinner, aa as NumberInput, ab as NumberInputField, ac as NumberInputStepper, ad as NumberIncrementStepper, ae as NumberDecrementStepper, af as clientExports, ag as ChakraProvider } from "./vendor.bundle.js";
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
  const { size, ...otherProps } = props;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "black",
      stroke: "white",
      ...otherProps,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20.247 14.052a8.502 8.502 0 01-10.302 6.194C5.394 19.11 2.62 14.5 3.754 9.95c1.134-4.551 5.74-7.33 10.288-6.195 4.562 1.12 7.337 5.744 6.205 10.298z" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            strokeLinecap: "square",
            strokeLinejoin: "round",
            d: "M9.4 14.912l1.693-6.792M9.637 7.757L13.818 8.8c2.728.68 2.12 3.877-.786 3.153 3.184.794 2.86 4.578-.907 3.639-1.841-.46-3.813-.95-3.813-.95M10.306 11.274l2.669.665M11.578 8.241l.363-1.455M9.521 16.489l.363-1.456M13.518 8.725l.363-1.455M11.462 16.973l.363-1.456"
          }
        )
      ]
    }
  );
};
BitcoinLogo.defaultProps = {
  size: "24"
};
const NostrLogo = (props) => {
  const { size, ...otherProps } = props;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: size,
      height: size,
      viewBox: "0 0 256 256",
      fill: "black",
      ...otherProps,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M210.8 199.4c0 3.1-2.5 5.7-5.7 5.7h-68c-3.1 0-5.7-2.5-5.7-5.7v-15.5c.3-19 2.3-37.2 6.5-45.5 2.5-5 6.7-7.7 11.5-9.1 9.1-2.7 24.9-.9 31.7-1.2 0 0 20.4.8 20.4-10.7s-9.1-8.6-9.1-8.6c-10 .3-17.7-.4-22.6-2.4-8.3-3.3-8.6-9.2-8.6-11.2-.4-23.1-34.5-25.9-64.5-20.1-32.8 6.2.4 53.3.4 116.1v8.4c0 3.1-2.6 5.6-5.7 5.6H57.7c-3.1 0-5.7-2.5-5.7-5.7v-144c0-3.1 2.5-5.7 5.7-5.7h31.7c3.1 0 5.7 2.5 5.7 5.7 0 4.7 5.2 7.2 9 4.5 11.4-8.2 26-12.5 42.4-12.5 36.6 0 64.4 21.4 64.4 68.7v83.2ZM150 99.3c0-6.7-5.4-12.1-12.1-12.1s-12.1 5.4-12.1 12.1 5.4 12.1 12.1 12.1S150 106 150 99.3Z" })
    }
  );
};
NostrLogo.defaultProps = {
  size: "24"
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
function MdEdit(props) {
  return GenIcon({
    attr: { viewBox: "0 0 24 24" },
    child: [
      { tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" }, child: [] },
      {
        tag: "path",
        attr: {
          d: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        },
        child: []
      }
    ]
  })(props);
}
function MdDeleteForever(props) {
  return GenIcon({
    attr: { viewBox: "0 0 24 24" },
    child: [
      { tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" }, child: [] },
      { tag: "path", attr: { fill: "none", d: "M0 0h24v24H0V0z" }, child: [] },
      {
        tag: "path",
        attr: {
          d: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12 1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"
        },
        child: []
      }
    ]
  })(props);
}
function MdSaveAlt(props) {
  return GenIcon({
    attr: { viewBox: "0 0 24 24" },
    child: [
      { tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" }, child: [] },
      {
        tag: "path",
        attr: {
          d: "M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67 2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"
        },
        child: []
      }
    ]
  })(props);
}
function MdOutlineCancel(props) {
  return GenIcon({
    attr: { viewBox: "0 0 24 24" },
    child: [
      {
        tag: "path",
        attr: { fill: "none", d: "M0 0h24v24H0V0z", opacity: ".87" },
        child: []
      },
      {
        tag: "path",
        attr: {
          d: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z"
        },
        child: []
      }
    ]
  })(props);
}
function MdHelp(props) {
  return GenIcon({
    attr: { viewBox: "0 0 24 24" },
    child: [
      { tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" }, child: [] },
      {
        tag: "path",
        attr: {
          d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"
        },
        child: []
      }
    ]
  })(props);
}
function MdOutlineTimerOff(props) {
  return GenIcon({
    attr: { viewBox: "0 0 24 24" },
    child: [
      { tag: "path", attr: { fill: "none", d: "M0 0h24v24H0z" }, child: [] },
      {
        tag: "path",
        attr: {
          d: "M9 1h6v2H9zM12 6c3.87 0 7 3.13 7 7 0 .94-.19 1.83-.52 2.65l1.5 1.5a8.963 8.963 0 0 0-.95-9.76l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42a8.962 8.962 0 0 0-9.77-.96l1.5 1.5A7.07 7.07 0 0 1 12 6z"
        },
        child: []
      },
      {
        tag: "path",
        attr: {
          d: "m11 8.17 2 2V8h-2zM2.81 2.81 1.39 4.22l3.4 3.4a8.994 8.994 0 0 0 12.59 12.59l2.4 2.4 1.41-1.41L2.81 2.81zM12 20c-3.87 0-7-3.13-7-7 0-1.47.45-2.83 1.22-3.95l9.73 9.73A6.945 6.945 0 0 1 12 20z"
        },
        child: []
      }
    ]
  })(props);
}
function MdOutlineContentCopy(props) {
  return GenIcon({
    attr: { viewBox: "0 0 24 24" },
    child: [
      { tag: "path", attr: { fill: "none", d: "M0 0h24v24H0V0z" }, child: [] },
      {
        tag: "path",
        attr: {
          d: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
        },
        child: []
      }
    ]
  })(props);
}
const DefaultExcludedKindList = {
  13194: { nip: 47, name: "NWC Wallet Info" },
  23194: { nip: 47, name: "NWC Wallet Request" }
};
const DefaultExcludedKinds = Object.keys(DefaultExcludedKindList);
const NostrTemplate = {
  protocolName: "nostr",
  credentialName: "nsec",
  identifier: "",
  // npubkey
  secret: "",
  // raw seckey
  primary: false,
  trustedSites: [],
  dialogicAuthorizedSites: [],
  properties: {
    generationMethod: "import",
    generationFrom: "",
    sharing: [],
    displayName: "",
    memo: ""
  }
};
const SafeProtocols = ["http", "https", "moz-extension"];
const SpecialCards = ["*", "<all_urls>"];
const NallowedMethods = [
  "read",
  "sign",
  "encrypt",
  "decrypt",
  "generate",
  "custom"
];
const DefaultNallowedMethods = [];
const EveryTimeAuthorizedMethods = [
  "read",
  "sign",
  "encrypt",
  "decrypt",
  "generate",
  "custom"
];
const DialogDisplayOptions = [
  "read-confirmOnly",
  "read-passwordOnly",
  "sign-confirmOnly",
  "sign-passwordOnly",
  "encrypt-confirmOnly",
  "encrypt-passwordOnly",
  "decrypt-confirmOnly",
  "decrypt-passwordOnly",
  "generate-confirmOnly",
  "generate-passwordOnly",
  "custom-confirmOnly",
  "custom-passwordOnly"
];
const DefaultDialogDisplayOptions = [
  "read-confirmOnly",
  "sign-confirmOnly",
  "encrypt-confirmOnly",
  "decrypt-confirmOnly",
  "generate-confirmOnly",
  "custom-confirmOnly"
];
const DefaultTrustedSites = [
  {
    url: "http://localhost",
    name: "",
    enabled: true,
    permissions: { nallowedMethod: DefaultNallowedMethods }
  }
];
function initStore() {
  dispatchEvent(
    new CustomEvent("AboutSelfSovereignIndividualInit", {
      bubbles: true
    })
  );
}
function addCredentialToStore(credential) {
  dispatchEvent(
    new CustomEvent("AboutSelfSovereignIndividualCreateCredential", {
      bubbles: true,
      detail: transformToPayload(credential)
    })
  );
}
function modifyCredentialToStore$1(credential, options) {
  dispatchEvent(
    new CustomEvent("AboutSelfSovereignIndividualUpdateCredential", {
      bubbles: true,
      detail: { credential: transformToPayload(credential), options }
    })
  );
}
function deleteCredentialToStore(deletedCredential) {
  dispatchEvent(
    new CustomEvent("AboutSelfSovereignIndividualDeleteCredential", {
      bubbles: true,
      detail: transformToPayload(deletedCredential)
    })
  );
}
function removeAllCredentialsToStore() {
  dispatchEvent(
    new CustomEvent("AboutSelfSovereignIndividualRemoveAllCredentials", {
      bubbles: true
    })
  );
}
function onPrimaryChanged$1(changeSet) {
  dispatchEvent(
    new CustomEvent("AboutSelfSovereignIndividualPrimaryChanged", {
      bubbles: true,
      detail: changeSet
    })
  );
}
function onPrefChanged(changeSet) {
  dispatchEvent(
    new CustomEvent("AboutSelfSovereignIndividualPrefChanged", {
      bubbles: true,
      detail: changeSet
    })
  );
}
const dispatchEvents = {
  initStore,
  addCredentialToStore,
  modifyCredentialToStore: modifyCredentialToStore$1,
  deleteCredentialToStore,
  removeAllCredentialsToStore,
  onPrimaryChanged: onPrimaryChanged$1,
  onPrefChanged
};
function transformToPayload(credential) {
  const newVal = { ...credential };
  if (credential.trustedSites) {
    newVal.trustedSites = JSON.stringify(credential.trustedSites);
  }
  if (credential.dialogicAuthorizedSites) {
    newVal.dialogicAuthorizedSites = JSON.stringify(
      credential.dialogicAuthorizedSites
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
      // TODO(ssb): investigate
    );
    const dialogicAuthorizedSites = JSON.parse(
      credential.dialogicAuthorizedSites.replace(/^''$/g, '"')
      // TODO(ssb): investigate
    );
    const properties = JSON.parse(credential.properties.replace(/^''$/g, '"'));
    return {
      ...credential,
      trustedSites,
      dialogicAuthorizedSites,
      properties
    };
  });
}
function useChildActorEvent() {
  const [prefs, setPrefs] = reactExports.useState({
    base: {
      menuPin: "",
      addons: [],
      primaryPasswordEnabled: false,
      passwordRevealVisible: false,
      platform: ""
    },
    bitcoin: {
      enabled: true,
      tabPin: "",
      usedTrustedSites: false,
      nallowedMethodPreset: DefaultNallowedMethods.filter(Boolean).join(","),
      usedPrimarypasswordToSettings: true,
      expirationTimeForPrimarypasswordToSettings: 3e5,
      usedPrimarypasswordToApps: true,
      expirationTimeForPrimarypasswordToApps: 864e5,
      dialogDisplayOptionPreset: DefaultDialogDisplayOptions.filter(Boolean).join(","),
      usedAccountChanged: true
    },
    nostr: {
      enabled: true,
      tabPin: "",
      tabPinInNip07: "",
      usedTrustedSites: false,
      nallowedMethodPreset: DefaultNallowedMethods.filter(Boolean).join(","),
      usedPrimarypasswordToSettings: true,
      expirationTimeForPrimarypasswordToSettings: 3e5,
      usedPrimarypasswordToApps: true,
      expirationTimeForPrimarypasswordToApps: 864e5,
      dialogDisplayOptionPreset: DefaultDialogDisplayOptions.filter(Boolean).join(","),
      excludedKindsPreset: DefaultExcludedKinds.filter(Boolean).join(","),
      usedBuiltinNip07: true,
      usedAccountChanged: true
    }
  });
  const [credentials, setCredentials] = reactExports.useState([]);
  const [credentialsFromStore, setCredentialsFromStore] = reactExports.useState([null, []]);
  reactExports.useEffect(() => {
    addEventListener(
      "AboutSelfSovereignIndividualChromeToContent",
      receiveFromChildActor
    );
    return () => {
      removeEventListener(
        "AboutSelfSovereignIndividualChromeToContent",
        receiveFromChildActor
      );
    };
  }, []);
  reactExports.useEffect(() => {
    const [op, state] = credentialsFromStore;
    if (op === "add") {
      if (state[0].primary) {
        onPrimaryChanged$1({
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
        setPrefs((prev) => ({
          ...prev,
          base: { ...prev.base, ...event.detail.value.base }
        }));
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
function TabPin(tabId, pref, prtocolName) {
  const { onPrefChanged: onPrefChanged2 } = dispatchEvents;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Box,
    {
      onClick: (e) => {
        e.preventDefault();
        onPrefChanged2({ protocolName: prtocolName, [pref.key]: tabId });
      },
      ml: 2,
      children: tabId === pref.value ? /* @__PURE__ */ jsxRuntimeExports.jsx(LuPin, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(LuPinOff, {})
    }
  );
}
function Menu(props) {
  const { selectedMenu, setSelectedMenu, menuPin } = props;
  const buildMenu = reactExports.useCallback(() => {
    const list = [
      { name: "bitcoin", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BitcoinLogo, {}) },
      { name: "nostr", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(NostrLogo, {}) }
    ];
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: list.map((menu, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { width: "150px", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: selectedMenu === menu.name ? "solid" : "transparent",
          leftIcon: menu.icon,
          onClick: (e) => {
            e.preventDefault();
            setSelectedMenu(menu.name);
          },
          size: "lg",
          children: menu.name.charAt(0).toUpperCase() + menu.name.slice(1)
        }
      ),
      TabPin(menu.name, { key: "menuPin", value: menuPin }, "base")
    ] }, index)) });
  }, [selectedMenu, menuPin]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Flex,
    {
      direction: "column",
      width: "200px",
      height: "calc(100vh - 40px)",
      justify: "space-between",
      "aria-label": "Main Navigation",
      as: "nav",
      pos: "sticky",
      top: 0,
      flexShrink: 0,
      p: 10,
      overflowY: "auto",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(VStack, { gap: 2, children: buildMenu() }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(VStack, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(HStack, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: selectedMenu === "settings" ? "solid" : "transparent",
              onClick: (e) => {
                e.preventDefault();
                setSelectedMenu("settings");
              },
              size: "lg",
              children: "Settings"
            }
          ) })
        ] })
      ]
    }
  );
}
const StateContext = React.createContext(null);
const DefaultState = {
  bitcoin: {
    editingNo: -1,
    editingUrl: ""
  },
  nostr: {
    editingNo: -1,
    editingUrl: ""
  }
};
const StateProvider = ({ children }) => {
  const [states, setStates] = reactExports.useState({
    ...DefaultState
  });
  function updateState(protocolName, value) {
    setStates((prev) => {
      const current = { ...prev[protocolName] };
      prev[protocolName] = { ...current, ...value };
      return { ...prev };
    });
  }
  function resetState() {
    setStates({ ...DefaultState });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(StateContext.Provider, { value: { states, resetState, updateState }, children });
};
function generateSecretOnToolkit(protocolName, credentialName, option) {
  return window.AboutSelfSovereignIndividualUtils.generate(
    protocolName,
    credentialName,
    option
  );
}
function promptForPrimaryPassword(messageId) {
  return new Promise((resolve) => {
    window.AboutSelfSovereignIndividualUtils.promptForPrimaryPassword(
      resolve,
      messageId
    );
  });
}
async function authorizePrimaryPassword(protocolName, prefs, setIsOpenDialog, messageId) {
  if (prefs[protocolName].usedPrimarypasswordToSettings) {
    const primaryPasswordAuth = await promptForPrimaryPassword(
      messageId ?? "about-selfsovereignindividual-access-authlocked-os-auth-dialog-message"
    );
    if (!primaryPasswordAuth) {
      if (!prefs.base.primaryPasswordEnabled && prefs.base.platform === "linux") {
        setIsOpenDialog(true);
      }
      return false;
    }
  }
  return true;
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
              href: "https://support.mozilla.org/en-US/kb/use-primary-password-protect-stored-logins",
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
  const { protocolName, value, onChangeVisibility, prefs, count, textProps } = props;
  const maskedValue = reactExports.useCallback(
    () => "*".repeat(count ? 40 : value.length),
    [value]
  );
  const handleToggole = async () => {
    if (!visible) {
      const isAuthorized = await authorizePrimaryPassword(
        protocolName,
        prefs,
        setIsOpenDialog,
        "about-selfsovereignindividual-access-secrets-os-auth-dialog-message"
      );
      if (!isAuthorized) {
        return;
      }
    }
    setVisible((prev) => !prev);
    onChangeVisibility();
  };
  const handleCopy = async () => {
    if (!visible) {
      const isAuthorized = await authorizePrimaryPassword(
        protocolName,
        prefs,
        setIsOpenDialog,
        "about-selfsovereignindividual-access-secrets-os-auth-dialog-message"
      );
      if (!isAuthorized) {
        return;
      }
    }
    navigator.clipboard.writeText(value).then(() => {
      alert("Copied!");
    }).catch((error) => {
      console.error(error);
      alert(`Failed to copy: ${error}`);
    });
  };
  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
      visible ? /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { ...textProps, children: value }) : count ? /* @__PURE__ */ jsxRuntimeExports.jsx(VStack, { spacing: 0, pt: "8px", pb: "8px", children: Array(count).fill(0).map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { m: 0, ...textProps, children: maskedValue() }, index)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { ...textProps, children: maskedValue() }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        IconButton,
        {
          icon: visible ? /* @__PURE__ */ jsxRuntimeExports.jsx(LuEyeOff, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(LuEye, {}),
          variant: "transparent",
          "aria-label": "Toggle secret visibility",
          onClick: handleToggole
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        IconButton,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdOutlineContentCopy, {}),
          variant: "transparent",
          "aria-label": "Copy secret",
          onClick: handleCopy
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
function ExampleUrlMatch(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Accordion,
    {
      allowToggle: true,
      width: props.width || "100%",
      backgroundColor: props.backgroundColor ?? "transparent",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionItem, { css: { border: "none" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionButton, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { as: "span", flex: "1", textAlign: "left", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { as: MdHelp }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "Examples" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionIcon, {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionPanel, { pb: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Thead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tr, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Th, { children: "characters" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Th, { children: "match" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Tbody, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Tr, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Td, { children: "*" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Td, { children: "all urls" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Tr, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Td, { children: "<all_urls>" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Td, { children: "all urls" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Tr, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Td, { children: "http*://*.example.com" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Td, { children: "http://example.com, https://www.example.com, https://sub.example.com/path?query=value,..." })
            ] })
          ] })
        ] }) }) })
      ] })
    }
  );
}
function ExplainNallowedMethod(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Accordion, { allowToggle: true, width: props.width || "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionItem, { css: { border: "none" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionButton, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { as: "span", flex: "1", textAlign: "left", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { as: MdHelp }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "Explanation" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionIcon, {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionPanel, { pb: 4, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "sm", children: "Narrow the trust scope of Trusted Site to a specific method." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Text, { size: "sm", children: [
        "If “read“ is checked, trusted sites will only work for read permission.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "If all is checked, it is the same as none being checked."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "sm", children: "Default preset is set the first time you register trusted site URL. And You can edit the settings for the corresponding URL for each key." }),
      props.protocolName === "nostr" && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "This has lower priority than the excluded kinds, so if both are present, authorization will proceed." })
    ] })
  ] }) });
}
function ExplainEveryTimeAuthorizedMethod(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Accordion, { allowToggle: true, width: props.width || "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionItem, { css: { border: "none" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionButton, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { as: "span", flex: "1", textAlign: "left", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { as: MdHelp }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "Explanation" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionIcon, {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionPanel, { pb: 4, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "sm", children: "The methods checked here will execute the authorization dialogs even if the previous dialogic authorization has not yet expired." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "This has lower priority than the dialog dispaly settings, so if both are present, dialog will disappear." })
    ] })
  ] }) });
}
function ExplainDialogDisplayOption(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Accordion, { allowToggle: true, width: props.width || "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionItem, { css: { border: "none" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionButton, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { as: "span", flex: "1", textAlign: "left", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { as: MdHelp }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "Explanation" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionIcon, {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionPanel, { pb: 4, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "sm", children: "Sets the conditions of the authorization dialogs displaying when it has expired or the every-time-authorize settings exists." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Text, { size: "sm", children: [
        "Authorization dialogs consist of two dialogs. The confirmation dialog is there to verify the app's request, and the password dialog, by the OS account password or the Firefox primary password, is there to prevent someone other than you from authorizing.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "The authorization will have an expiration date, and when it expires dialogs will reappear again."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Text, { size: "sm", children: [
        "- Checking “[method]-confirmOnly“ is skipping the password dialog and prompting the confirm dialog alone.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "- Checking “[method]-passwordOnly“ is skipping the confirm dialog and prompting the password dialog alone.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "- If you check both, two dialogs will disappear. It's equivalent to disabled.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "- If you uncheck both, two dialogs will appear."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "sm", children: "Default preset is set the first time you authorize for the URL. And you can edit the settings for the corresponding URL for each key." }),
      props.protocolName === "nostr" && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "This has lower priority than the excluded kinds, so if both are present, dialog will appear." })
    ] })
  ] }) });
}
function ExampleNostrKind(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Accordion, { allowToggle: true, width: props.width || "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionItem, { css: { border: "none" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionButton, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { as: "span", flex: "1", textAlign: "left", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { as: MdHelp }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "Examples" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionIcon, {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionPanel, { pb: 4, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Text, { size: "sm", children: [
        "Specifies the Nostr Kind you want to necessarily display a authorization dialog even if a trusted site is set or a dialogic authorization has not yet expired for this URL.",
        " "
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "sm", children: "Default preset is set the first time you authorize with a dialog. And You can edit the settings for the corresponding URL for each key." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "sm", children: "Default Set" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Thead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tr, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Th, { children: "Kind" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Th, { children: "NIP" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Th, { children: "Name" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tbody, { children: Object.entries(DefaultExcludedKindList).map(
          ([kind, value], i) => {
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(Tr, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Td, { children: kind }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Td, { children: value.nip }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Td, { children: value.name })
            ] }, i);
          }
        ) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "sm", children: "Reference: https://github.com/nostr-protocol/nips?tab=readme-ov-file#event-kinds" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "sm", children: "Note: App can arbitrarily enforce your authorization even if you opt-out here. It's because they deemed that authorization important enough to ask for your consent." })
    ] })
  ] }) });
}
const { modifyCredentialToStore, onPrimaryChanged } = dispatchEvents;
function changePrimary(guid, checked, keys) {
  let newPrimaryGuid = "";
  if (checked === true) {
    const prevs = keys.filter((key) => key.primary);
    for (const prev of prevs) {
      modifyCredentialToStore({
        guid: prev.guid,
        primary: false
      });
    }
    newPrimaryGuid = guid;
  } else {
    const prev = keys.find((key) => !key.primary);
    if (prev) {
      modifyCredentialToStore({
        guid: prev.guid,
        primary: true
      });
      newPrimaryGuid = prev.guid;
    }
  }
  setTimeout(() => {
    modifyCredentialToStore({
      guid,
      primary: checked
    });
  });
  onPrimaryChanged({ protocolName: "nostr", guid: newPrimaryGuid });
}
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
function BIP39Editor(props) {
  const { credential, mnemonics, prefs } = props;
  const { modifyCredentialToStore: modifyCredentialToStore2 } = dispatchEvents;
  const [editingKey, setEditingKey] = reactExports.useState(null);
  const [newSite, setNewSite] = reactExports.useState("");
  const [newExtensions, setNewExtensions] = reactExports.useState([]);
  const [editingNumForTrusted, setEditingNumForTrusted] = reactExports.useState(-1);
  const [editingNumForPassword, setEditingNumForPassword] = reactExports.useState(-1);
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setEditingKey(JSON.parse(JSON.stringify(credential)));
  }, []);
  const handleSave = async () => {
    const isAuthorized = await authorizePrimaryPassword(
      "bitcoin",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    modifyCredentialToStore2(editingKey, {
      newExtensionForTrustedSite: newExtensions
    });
    if (credential.primary !== editingKey.primary) {
      changePrimary(editingKey.guid, editingKey.primary, mnemonics);
    }
    props.goBack();
  };
  const handleGoBack = async () => {
    if (JSON.stringify(editingKey) !== JSON.stringify(credential)) {
      const result = confirm("Not yet saved. Do you really want to leave?");
      if (!result) {
        return;
      }
    }
    setEditingKey(credential);
    props.goBack();
  };
  const HandleChangeValue = (newKV) => {
    setEditingKey((prev) => ({ ...prev, ...newKV }));
  };
  const handleNewSiteChange = (e) => setNewSite(e.target.value);
  const handleRegisterSite = async (e) => {
    e.preventDefault();
    handleReRegister(newSite);
  };
  const handleReRegister = (url) => {
    if (!SafeProtocols.some((protocol) => url.startsWith(protocol)) && !SpecialCards.includes(url)) {
      alert(`Currently, only supports ${SafeProtocols.join(",")}.`);
      return;
    }
    const existing = editingKey.trustedSites.some(
      (site) => site.url === url && site.enabled
    );
    if (existing) {
      alert("The url exists already.");
      return;
    }
    const value = editingKey.trustedSites.some((site) => site.url === url) ? editingKey.trustedSites.map((site) => {
      if (site.url === url) {
        site.enabled = true;
      }
      return site;
    }) : editingKey.trustedSites.concat([
      {
        url,
        name: url !== "*" ? "" : "<all_urls>",
        enabled: true,
        permissions: { nallowedMethod: DefaultNallowedMethods }
      }
    ]);
    HandleChangeValue({ trustedSites: value });
    if (url.startsWith("moz-extension")) {
      setNewExtensions((prev) => prev.concat([url]));
    }
  };
  const handleRemoveSite = (removedSite) => {
    const value = {
      trustedSites: editingKey.trustedSites.map((site) => {
        if (site.url === removedSite.url) {
          site.enabled = false;
        }
        return site;
      })
    };
    HandleChangeValue(value);
  };
  const handleRevokeSite = (revokedSite) => {
    const value = {
      dialogicAuthorizedSites: editingKey.dialogicAuthorizedSites.map((site) => {
        if (site.url === revokedSite.url) {
          site.expirationTime = 0;
        }
        return site;
      })
    };
    HandleChangeValue(value);
  };
  const handleSaveEveryTimeAuthorizedMethods = (siteNo, value) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    if (dialogicAuthorizedSites[siteNo].permissions.everyTimeAuthorizedMethods.includes(value)) {
      dialogicAuthorizedSites[siteNo].permissions.everyTimeAuthorizedMethods = dialogicAuthorizedSites[siteNo].permissions.everyTimeAuthorizedMethods.filter(
        (method) => method !== value
      );
    } else {
      dialogicAuthorizedSites[siteNo].permissions.everyTimeAuthorizedMethods.push(value);
    }
    HandleChangeValue({ dialogicAuthorizedSites });
  };
  const handleSaveNallowedMethod = (siteNo, value) => {
    const trustedSites = JSON.parse(JSON.stringify(editingKey.trustedSites));
    if (trustedSites[siteNo].permissions.nallowedMethod.includes(value)) {
      trustedSites[siteNo].permissions.nallowedMethod = trustedSites[siteNo].permissions.nallowedMethod.filter((method) => method !== value);
    } else {
      trustedSites[siteNo].permissions.nallowedMethod.push(value);
    }
    HandleChangeValue({ trustedSites });
  };
  const handleResetNallowedMethod = (siteNo) => {
    const trustedSites = JSON.parse(JSON.stringify(editingKey.trustedSites));
    trustedSites[siteNo].permissions.nallowedMethod = DefaultNallowedMethods;
    HandleChangeValue({ trustedSites });
  };
  const handleSaveSkippedDialog = (siteNo, value) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    if (dialogicAuthorizedSites[siteNo].permissions.skippedDialog.includes(value)) {
      dialogicAuthorizedSites[siteNo].permissions.skippedDialog = dialogicAuthorizedSites[siteNo].permissions.skippedDialog.filter(
        (method) => method !== value
      );
    } else {
      dialogicAuthorizedSites[siteNo].permissions.skippedDialog.push(value);
    }
    HandleChangeValue({ dialogicAuthorizedSites });
  };
  const handleResetSkippedDialog = (siteNo) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    dialogicAuthorizedSites[siteNo].permissions.skippedDialog = DefaultDialogDisplayOptions;
    HandleChangeValue({ dialogicAuthorizedSites });
  };
  function EditableControls() {
    const { isEditing, getEditButtonProps } = useEditableControls();
    return !isEditing && /* @__PURE__ */ jsxRuntimeExports.jsx(
      IconButton,
      {
        size: "md",
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdEdit, {}),
        "aria-label": "Edit Key",
        ml: "2",
        ...getEditButtonProps()
      }
    );
  }
  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    editingKey ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { maxW: 700, overflow: "hidden", variant: "filled", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { pb: 0, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Editable,
          {
            defaultValue: editingKey.properties.displayName,
            onSubmit: (value) => HandleChangeValue({
              properties: {
                ...editingKey.properties,
                displayName: value
              }
            }),
            fontSize: "xl",
            isPreviewFocusable: true,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(EditablePreview, { overflowWrap: "anywhere" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { as: EditableInput }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(EditableControls, {})
            ]
          }
        ) }),
        editingKey.properties.displayName !== editingKey.identifier && /* @__PURE__ */ jsxRuntimeExports.jsxs(Text, { fontSize: "md", children: [
          "(",
          editingKey.identifier,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardBody, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        VStack,
        {
          divider: /* @__PURE__ */ jsxRuntimeExports.jsx(StackDivider, { borderColor: "gray.200" }),
          spacing: 2,
          align: "stretch",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", my: 4, children: "Memo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Textarea,
                {
                  size: "sm",
                  value: editingKey.properties.memo,
                  onChange: (e) => HandleChangeValue({
                    properties: {
                      ...editingKey.properties,
                      memo: e.target.value
                    }
                  }),
                  placeholder: "Here is a sample placeholder",
                  backgroundColor: "white",
                  maxW: "400px"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", my: 4, children: "Sharing History" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "400px 1fr", gap: 2, children: [
                !editingKey.properties.sharing.length && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "No shared" }),
                editingKey.properties.sharing.map((site) => {
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(VStack, { align: "stretch", spacing: 0, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Text,
                      {
                        fontSize: "md",
                        whiteSpace: "normal",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontWeight: "bold",
                        m: 0,
                        children: [
                          site.url,
                          " -",
                          " ",
                          new Date(site.date).toLocaleDateString(),
                          " ",
                          new Date(site.date).toLocaleTimeString()
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Text,
                      {
                        fontSize: "sm",
                        whiteSpace: "normal",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        mt: 1,
                        children: [
                          "  partner:",
                          " ",
                          encodeToNostrKey(
                            "npub",
                            hexToBytes(site.receiver)
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
                          "  you:",
                          " ",
                          encodeToNostrKey(
                            "npub",
                            hexToBytes(site.sender)
                          )
                        ]
                      }
                    )
                  ] }) }) });
                })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", my: 4, children: "Trusted Sites" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "400px 1fr", gap: 2, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { colSpan: 2, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Input,
                      {
                        placeholder: "https://example",
                        value: newSite,
                        onChange: handleNewSiteChange,
                        onKeyPress: (e) => {
                          if (e.key === "Enter") {
                            handleRegisterSite(e);
                          }
                        },
                        maxW: "400px",
                        backgroundColor: "white"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        variant: "outline",
                        colorScheme: "blue",
                        onClick: handleRegisterSite,
                        children: "Register"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExampleUrlMatch, { width: "100%" })
                ] }),
                !editingKey.trustedSites.length && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "No registered" }),
                editingKey.trustedSites.map((site, i) => {
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                      !site.enabled && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { label: "Expired", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "baseline", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { as: MdOutlineTimerOff }) }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Text,
                        {
                          fontSize: "md",
                          whiteSpace: "normal",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          children: [
                            site.url,
                            site.name && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                              " (",
                              site.name,
                              ")"
                            ] })
                          ]
                        }
                      )
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: () => {
                            setEditingNumForTrusted(
                              i !== editingNumForTrusted ? i : -1
                            );
                          },
                          mr: "2",
                          children: "Permission"
                        }
                      ),
                      site.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: () => handleRemoveSite(site),
                          children: "Remove"
                        }
                      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: () => handleReRegister(site.url),
                          children: "Re-register"
                        }
                      )
                    ] }),
                    editingNumForTrusted === i && /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      VStack,
                      {
                        backgroundColor: "white",
                        p: "2",
                        alignItems: "flex-start",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "sm", children: "Narrow the trust scope" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(Menu$1, { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                MenuButton,
                                {
                                  as: Button,
                                  variant: "outline",
                                  colorScheme: "blue",
                                  children: "Select Options"
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuList, { children: NallowedMethods.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                                MenuItem,
                                {
                                  closeOnSelect: false,
                                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    Checkbox,
                                    {
                                      isChecked: site.permissions.nallowedMethod.includes(
                                        option
                                      ),
                                      onChange: () => handleSaveNallowedMethod(i, option),
                                      children: option
                                    }
                                  )
                                },
                                option
                              )) })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Button,
                              {
                                variant: "outline",
                                colorScheme: "blue",
                                onClick: () => handleResetNallowedMethod(i),
                                width: "150px",
                                children: "Revert to preset"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            ExplainNallowedMethod,
                            {
                              width: "100%",
                              protocolName: "bitcoin"
                            }
                          )
                        ]
                      }
                    ) })
                  ] });
                })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", my: 4, children: "Dialogic Authorization" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "400px 1fr", gap: 2, children: [
                !editingKey.dialogicAuthorizedSites.length && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "No registered" }),
                editingKey.dialogicAuthorizedSites.map((site, i) => {
                  const expirationTime = new Date(site.expirationTime);
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                      site.expirationTime <= Date.now() && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { label: "Expired", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "baseline", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { as: MdOutlineTimerOff }) }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Text,
                        {
                          fontSize: "md",
                          whiteSpace: "normal",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          children: [
                            site.url,
                            site.name && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                              " (",
                              site.name,
                              ")"
                            ] }),
                            site.expirationTime > Date.now() && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                              " - until ",
                              expirationTime.toLocaleDateString(),
                              " ",
                              expirationTime.toLocaleTimeString()
                            ] })
                          ]
                        }
                      )
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: () => {
                            setEditingNumForPassword(
                              i !== editingNumForPassword ? i : -1
                            );
                          },
                          mr: "2",
                          children: "Permission"
                        }
                      ),
                      site.expirationTime > Date.now() && /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: () => handleRevokeSite(site),
                          children: "Revoke"
                        }
                      )
                    ] }),
                    editingNumForPassword === i && /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      VStack,
                      {
                        backgroundColor: "white",
                        p: "2",
                        alignItems: "flex-start",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "sm", children: "The Method authorized every time" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(HStack, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Menu$1, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              MenuButton,
                              {
                                as: Button,
                                variant: "outline",
                                colorScheme: "blue",
                                children: "Select Options"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuList, { children: EveryTimeAuthorizedMethods.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                              MenuItem,
                              {
                                closeOnSelect: false,
                                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Checkbox,
                                  {
                                    isChecked: site.permissions.everyTimeAuthorizedMethods.includes(
                                      option
                                    ),
                                    onChange: () => handleSaveEveryTimeAuthorizedMethods(
                                      i,
                                      option
                                    ),
                                    children: option
                                  }
                                )
                              },
                              option
                            )) })
                          ] }) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            ExplainEveryTimeAuthorizedMethod,
                            {
                              width: "100%",
                              protocolName: "bitcoin"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "sm", children: "Dialog dispaly settings" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(Menu$1, { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                MenuButton,
                                {
                                  as: Button,
                                  variant: "outline",
                                  colorScheme: "blue",
                                  children: "Select Options"
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuList, { children: DialogDisplayOptions.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                                MenuItem,
                                {
                                  closeOnSelect: false,
                                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    Checkbox,
                                    {
                                      isChecked: site.permissions.skippedDialog.includes(
                                        option
                                      ),
                                      onChange: () => handleSaveSkippedDialog(i, option),
                                      children: option
                                    }
                                  )
                                },
                                option
                              )) })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Button,
                              {
                                variant: "outline",
                                colorScheme: "blue",
                                onClick: () => handleResetSkippedDialog(i),
                                width: "150px",
                                children: "Revert to preset"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            ExplainDialogDisplayOption,
                            {
                              width: "100%",
                              protocolName: "bitcoin"
                            }
                          )
                        ]
                      }
                    ) })
                  ] });
                })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", my: 4, children: "Primary" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Switch,
                {
                  isChecked: editingKey.primary,
                  onChange: (e) => HandleChangeValue({ primary: e.target.checked }),
                  alignSelf: "center"
                }
              )
            ] })
          ]
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardFooter, { pt: "0", justify: "space-evenly", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          IconButton,
          {
            icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdOutlineCancel, {}),
            variant: "transparent",
            fontSize: "20px",
            "aria-label": "Cancel",
            onClick: handleGoBack
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          IconButton,
          {
            icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdSaveAlt, {}),
            variant: "filled",
            fontSize: "24px",
            "aria-label": "Save",
            onClick: handleSave
          }
        )
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, {}),
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
const BitcoinTemplate = {
  protocolName: "bitcoin",
  credentialName: "bip39",
  identifier: "",
  // xpub
  secret: "",
  // mnemonic
  primary: false,
  trustedSites: [],
  dialogicAuthorizedSites: [],
  properties: {
    passphrase: "",
    xprv: "",
    generationMethod: "new",
    generationFrom: "",
    sharing: [],
    displayName: "",
    memo: ""
  }
};
function Bitcoin$1(props) {
  const { prefs, credentials } = props;
  const { states, resetState, updateState } = reactExports.useContext(StateContext);
  const {
    addCredentialToStore: addCredentialToStore2,
    modifyCredentialToStore: modifyCredentialToStore2,
    deleteCredentialToStore: deleteCredentialToStore2,
    onPrimaryChanged: onPrimaryChanged2
  } = dispatchEvents;
  const [importedKey, setImportedSeed] = reactExports.useState("");
  const [newSeed, setNewSeed] = reactExports.useState("");
  const [wordCount, setWordCount] = reactExports.useState(0);
  const [passphrase, setPassphrase] = reactExports.useState("");
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  const mnemonics = reactExports.useMemo(
    () => credentials.filter(
      (credential) => credential.credentialName === "bip39"
    ),
    [credentials]
  );
  const defaultTrustedSites = reactExports.useMemo(
    () => [
      ...DefaultTrustedSites,
      ...prefs.base.addons.map((addon) => ({
        url: addon.url,
        name: addon.name,
        enabled: true,
        permissions: { nallowedMethod: DefaultNallowedMethods }
      }))
    ],
    [prefs.base.addons]
  );
  const handlePassphraseChange = (e) => setPassphrase(e.target.value);
  const handleGenNewSeed = async (e) => {
    e.preventDefault();
    const origin = location.href;
    const result = generateSecretOnToolkit("bitcoin", "bip39", {
      origin,
      strength: wordCount === 12 ? 128 : 256,
      // default is 256
      passphrase
    });
    if (!result[0]) {
      alert("Invalid!");
      return;
    }
    const { mnemonic, xpub, xprv } = await result[1];
    addCredentialToStore2({
      ...BitcoinTemplate,
      identifier: xpub,
      secret: mnemonic,
      primary: mnemonics.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        ...BitcoinTemplate.properties,
        passphrase,
        xprv,
        displayName: xpub,
        generationMethod: "new",
        generationFrom: origin
      }
    });
    setNewSeed(xpub);
  };
  const handleImportedKeyChange = (e) => setImportedSeed(e.target.value);
  const handleImportedKeySave = async (e) => {
    e.preventDefault();
    const mnemonic = importedKey;
    const origin = location.href;
    const result = generateSecretOnToolkit("bitcoin", "bip39", {
      origin,
      import: true,
      mnemonic,
      passphrase
    });
    if (!result[0]) {
      alert("Invalid!");
      return;
    }
    addCredentialToStore2({
      ...BitcoinTemplate,
      identifier: result[1].xpub,
      secret: mnemonic,
      primary: mnemonics.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        ...BitcoinTemplate.properties,
        passphrase,
        xprv: result[1].xprv,
        displayName: result[1].xpub,
        generationMethod: "import",
        generationFrom: origin
      }
    });
    setImportedSeed("");
  };
  const handleChangePrimary = async (checked, item) => {
    const isAuthorized = await authorizePrimaryPassword(
      "bitcoin",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    changePrimary(item.guid, checked, mnemonics);
  };
  const handleDeleteCredential = async (item) => {
    if (!confirm("The key can't be restored if no backup. Okay?")) {
      return;
    }
    const isAuthorized = await authorizePrimaryPassword(
      "bitcoin",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    if (item.primary === true) {
      const prev = mnemonics.find((key) => !key.primary);
      if (prev) {
        modifyCredentialToStore2({
          guid: prev.guid,
          primary: true
        });
      }
      onPrimaryChanged2({
        protocolName: "bitcoin",
        guid: prev ? prev.guid : ""
      });
    }
    deleteCredentialToStore2(item);
  };
  const handleAllRemove = async (e) => {
    e.preventDefault();
    if (!confirm("All data will be deleted. Okay?")) {
      return;
    }
    const isAuthorized = await authorizePrimaryPassword(
      "bitcoin",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    for (const credential of mnemonics) {
      deleteCredentialToStore2(credential);
    }
    onPrimaryChanged2({ protocolName: "bitcoin", guid: "" });
    location.reload();
  };
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
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "100px 1fr", gap: 6, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "New Seed" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    placeholder: "optional passphrase",
                    value: passphrase,
                    onChange: handlePassphraseChange,
                    maxW: "200px"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    placeholder: "Word count",
                    value: wordCount,
                    onChange: (e) => setWordCount(parseInt(e.target.value)),
                    width: "120px",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "12", children: "12" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "24", children: "24" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "outline",
                    colorScheme: "blue",
                    onClick: handleGenNewSeed,
                    children: "Generate"
                  }
                )
              ] }),
              newSeed && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { as: "mark", ml: "10px", children: newSeed })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Import" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  placeholder: "mnemonic words",
                  value: importedKey,
                  onChange: handleImportedKeyChange,
                  onKeyPress: (e) => {
                    if (e.key === "Enter") {
                      handleImportedKeySave(e);
                    }
                  },
                  maxW: "500px"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  placeholder: "optional passphrase",
                  value: passphrase,
                  onChange: handlePassphraseChange,
                  maxW: "200px"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  colorScheme: "blue",
                  onClick: handleImportedKeySave,
                  children: "Save"
                }
              )
            ] }) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            mnemonics.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "No key registered" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Flex, { gap: 6, wrap: "wrap", children: mnemonics.map((item, i) => {
              return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: states.bitcoin.editingNo !== i ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { maxW: "md", overflow: "hidden", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { pb: "0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "md", isTruncated: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      contentEditable: true,
                      onBlur: (e) => {
                        e.preventDefault();
                        modifyCredentialToStore2({
                          guid: item.guid,
                          properties: {
                            ...item.properties,
                            displayName: e.target.textContent
                          }
                        });
                      },
                      children: item.properties.displayName
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                    item.trustedSites.some((site) => site.url === "*") && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { label: "All URL trusted", children: "🚨" }),
                    item.properties.sharing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { label: "Sharing", children: "🛜" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardBody, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "md", isTruncated: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      contentEditable: true,
                      onBlur: (e) => {
                        e.preventDefault();
                        modifyCredentialToStore2({
                          guid: item.guid,
                          properties: {
                            ...item.properties,
                            memo: e.target.textContent
                          }
                        });
                      },
                      children: item.properties.memo
                    }
                  ) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { mt: 2, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "X Format" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "md", isTruncated: true, children: item.identifier }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Secret,
                      {
                        protocolName: item.protocolName,
                        value: item.properties.xprv,
                        onChangeVisibility: () => {
                        },
                        prefs,
                        textProps: { fontSize: "md", isTruncated: true }
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { mt: 2, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "mnemonic" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Secret,
                      {
                        protocolName: item.protocolName,
                        value: item.secret,
                        onChangeVisibility: () => {
                        },
                        prefs,
                        count: 2,
                        textProps: {
                          fontSize: "md",
                          overflowWrap: "anywhere"
                        }
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { mt: 2, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "passphrase" }),
                    item.properties.passphrase ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Secret,
                      {
                        protocolName: item.protocolName,
                        value: item.properties.passphrase,
                        onChangeVisibility: () => {
                        },
                        prefs,
                        textProps: {
                          fontSize: "md",
                          overflowWrap: "anywhere"
                        }
                      }
                    ) : "none"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Text, { fontSize: "sm", children: [
                    item.properties.generationMethod === "import" ? "Imported" : "Generated",
                    " ",
                    "on ",
                    new Date(item.timeCreated).toLocaleDateString(),
                    " ",
                    new Date(item.timeCreated).toLocaleTimeString(),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
                    "at ",
                    item.properties.generationFrom
                  ] }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardFooter, { pt: "0", justify: "space-evenly", children: [
                  mnemonics.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { gap: "2", children: [
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
                    IconButton,
                    {
                      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdEdit, {}),
                      variant: "transparent",
                      fontSize: "20px",
                      "aria-label": "Edit Key",
                      onClick: () => updateState("bitcoin", { editingNo: i })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    IconButton,
                    {
                      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdDeleteForever, {}),
                      variant: "transparent",
                      fontSize: "20px",
                      "aria-label": "Delete Key",
                      onClick: () => handleDeleteCredential(item)
                    }
                  )
                ] })
              ] }, i) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                BIP39Editor,
                {
                  credential: mnemonics[states.bitcoin.editingNo],
                  mnemonics,
                  prefs,
                  goBack: () => resetState()
                }
              ) });
            }) })
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
function More$1(props) {
  const { prefs } = props;
  const { onPrefChanged: onPrefChanged2 } = dispatchEvents;
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  const handleUsedPrimarypasswordToSettings = async (checked) => {
    const isAuthorized = await authorizePrimaryPassword(
      "bitcoin",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    onPrefChanged2({
      protocolName: "bitcoin",
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
          /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "bitcoin-pref-usedPrimarypasswordToSettings", children: "Use primary password to setting page" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              id: "bitcoin-pref-usedPrimarypasswordToSettings",
              isChecked: prefs.bitcoin.usedPrimarypasswordToSettings,
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
function Bitcoin(props) {
  const { prefs, credentials } = props;
  const { resetState } = reactExports.useContext(StateContext);
  const { onPrefChanged: onPrefChanged2 } = dispatchEvents;
  const [tabIndex, setTabIndex] = reactExports.useState(-1);
  reactExports.useEffect(() => {
    if (tabIndex === -1) {
      setTabIndex(parseInt(prefs.bitcoin.tabPin));
    }
  }, [prefs.bitcoin.tabPin]);
  const tabPin = (tabId) => TabPin(
    tabId.toString(),
    { key: "tabPin", value: prefs.bitcoin.tabPin },
    "bitcoin"
  );
  const bitcoinKeys = reactExports.useMemo(
    () => credentials.filter((credential) => credential.protocolName === "bitcoin").sort((a, b) => b.primary ? 1 : 0),
    [credentials]
  );
  const handleEnable = (e) => {
    e.preventDefault();
    const checked = e.target.checked;
    onPrefChanged2({ protocolName: "bitcoin", enabled: checked });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { height: "calc(100vh - 40px)", mt: 10, overflowY: "auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "md", mb: "10px", children: "Your keys are stored locally, isolated from and inaccessible to the web app." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "100px 1fr", gap: 6, mb: "2rem", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "bitcoin-pref-enabled", children: "Enable" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Switch,
        {
          id: "bitcoin-pref-enabled",
          isChecked: prefs.bitcoin.enabled,
          onChange: handleEnable
        }
      ) })
    ] }),
    prefs.bitcoin.tabPin ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Tabs,
      {
        variant: "enclosed",
        index: tabIndex,
        onChange: (index) => {
          setTabIndex(index);
          resetState();
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabList, { position: "sticky", top: "0", m: 2, zIndex: 1, bg: "white", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h3", size: "lg", children: "BIP-39" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "center", mr: 3, children: tabPin(0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h3", size: "lg", children: "More" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "center", mr: 3, children: tabPin(1) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabPanels, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabPanel, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bitcoin$1, { prefs, credentials: bitcoinKeys }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabPanel, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(More$1, { prefs, credentials: bitcoinKeys }) })
          ] })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, {})
  ] });
}
function KeyEditor(props) {
  const { credential, nostrKeys, prefs } = props;
  const { modifyCredentialToStore: modifyCredentialToStore2 } = dispatchEvents;
  const [editingKey, setEditingKey] = reactExports.useState(null);
  const [newSite, setNewSite] = reactExports.useState("");
  const [newExtensions, setNewExtensions] = reactExports.useState([]);
  const [editingNumForTrusted, setEditingNumForTrusted] = reactExports.useState(-1);
  const [editingNumForPassword, setEditingNumForPassword] = reactExports.useState(-1);
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setEditingKey(JSON.parse(JSON.stringify(credential)));
  }, []);
  const handleSave = async () => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    modifyCredentialToStore2(editingKey, {
      newExtensionForTrustedSite: newExtensions
    });
    if (credential.primary !== editingKey.primary) {
      changePrimary(editingKey.guid, editingKey.primary, nostrKeys);
    }
    props.goBack();
  };
  const handleGoBack = async () => {
    if (JSON.stringify(editingKey) !== JSON.stringify(credential)) {
      const result = confirm("Not yet saved. Do you really want to leave?");
      if (!result) {
        return;
      }
    }
    setEditingKey(credential);
    props.goBack();
  };
  const HandleChangeValue = (newKV) => {
    setEditingKey((prev) => ({ ...prev, ...newKV }));
  };
  const handleNewSiteChange = (e) => setNewSite(e.target.value);
  const handleRegisterSite = async (e) => {
    e.preventDefault();
    handleReRegister(newSite);
  };
  const handleReRegister = (url) => {
    if (!SafeProtocols.some((protocol) => url.startsWith(protocol)) && !SpecialCards.includes(url)) {
      alert(`Currently, only supports ${SafeProtocols.join(",")}.`);
      return;
    }
    const existing = editingKey.trustedSites.some(
      (site) => site.url === url && site.enabled
    );
    if (existing) {
      alert("The url exists already.");
      return;
    }
    const value = editingKey.trustedSites.some((site) => site.url === url) ? editingKey.trustedSites.map((site) => {
      if (site.url === url) {
        site.enabled = true;
      }
      return site;
    }) : editingKey.trustedSites.concat([
      {
        url,
        name: url !== "*" ? "" : "<all_urls>",
        enabled: true,
        permissions: { nallowedMethod: DefaultNallowedMethods }
      }
    ]);
    HandleChangeValue({ trustedSites: value });
    if (url.startsWith("moz-extension")) {
      setNewExtensions((prev) => prev.concat([url]));
    }
  };
  const handleRemoveSite = (removedSite) => {
    const value = {
      trustedSites: editingKey.trustedSites.map((site) => {
        if (site.url === removedSite.url) {
          site.enabled = false;
        }
        return site;
      })
    };
    HandleChangeValue(value);
  };
  const handleRevokeSite = (revokedSite) => {
    const value = {
      dialogicAuthorizedSites: editingKey.dialogicAuthorizedSites.map((site) => {
        if (site.url === revokedSite.url) {
          site.expirationTime = 0;
        }
        return site;
      })
    };
    HandleChangeValue(value);
  };
  const handleSaveExcludedKinds = (siteNo, value) => {
    if (!/^[1-9][0-9,]*$/.test(value) && value !== "") {
      alert("Input must be Kind number or ','.");
      return;
    }
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    dialogicAuthorizedSites[siteNo].permissions.excludedKinds = value ? value.split(",") : [];
    HandleChangeValue({ dialogicAuthorizedSites });
  };
  const handleResetExcludedKinds = (siteNo) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    dialogicAuthorizedSites[siteNo].permissions.excludedKinds = DefaultExcludedKinds;
    HandleChangeValue({ dialogicAuthorizedSites });
  };
  const handleSaveEveryTimeAuthorizedMethods = (siteNo, value) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    if (dialogicAuthorizedSites[siteNo].permissions.everyTimeAuthorizedMethods.includes(value)) {
      dialogicAuthorizedSites[siteNo].permissions.everyTimeAuthorizedMethods = dialogicAuthorizedSites[siteNo].permissions.everyTimeAuthorizedMethods.filter(
        (method) => method !== value
      );
    } else {
      dialogicAuthorizedSites[siteNo].permissions.everyTimeAuthorizedMethods.push(value);
    }
    HandleChangeValue({ dialogicAuthorizedSites });
  };
  const handleSaveNallowedMethod = (siteNo, value) => {
    const trustedSites = JSON.parse(JSON.stringify(editingKey.trustedSites));
    if (trustedSites[siteNo].permissions.nallowedMethod.includes(value)) {
      trustedSites[siteNo].permissions.nallowedMethod = trustedSites[siteNo].permissions.nallowedMethod.filter((method) => method !== value);
    } else {
      trustedSites[siteNo].permissions.nallowedMethod.push(value);
    }
    HandleChangeValue({ trustedSites });
  };
  const handleResetNallowedMethod = (siteNo) => {
    const trustedSites = JSON.parse(JSON.stringify(editingKey.trustedSites));
    trustedSites[siteNo].permissions.nallowedMethod = DefaultNallowedMethods;
    HandleChangeValue({ trustedSites });
  };
  const handleSaveSkippedDialog = (siteNo, value) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    if (dialogicAuthorizedSites[siteNo].permissions.skippedDialog.includes(value)) {
      dialogicAuthorizedSites[siteNo].permissions.skippedDialog = dialogicAuthorizedSites[siteNo].permissions.skippedDialog.filter(
        (method) => method !== value
      );
    } else {
      dialogicAuthorizedSites[siteNo].permissions.skippedDialog.push(value);
    }
    HandleChangeValue({ dialogicAuthorizedSites });
  };
  const handleResetSkippedDialog = (siteNo) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    dialogicAuthorizedSites[siteNo].permissions.skippedDialog = DefaultDialogDisplayOptions;
    HandleChangeValue({ dialogicAuthorizedSites });
  };
  function EditableControls() {
    const { isEditing, getEditButtonProps } = useEditableControls();
    return !isEditing && /* @__PURE__ */ jsxRuntimeExports.jsx(
      IconButton,
      {
        size: "md",
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdEdit, {}),
        "aria-label": "Edit Key",
        ml: "2",
        ...getEditButtonProps()
      }
    );
  }
  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    editingKey ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { maxW: 700, overflow: "hidden", variant: "filled", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { pb: 0, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Editable,
          {
            defaultValue: editingKey.properties.displayName,
            onSubmit: (value) => HandleChangeValue({
              properties: {
                ...editingKey.properties,
                displayName: value
              }
            }),
            fontSize: "xl",
            isPreviewFocusable: true,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(EditablePreview, { overflowWrap: "anywhere" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { as: EditableInput }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(EditableControls, {})
            ]
          }
        ) }),
        editingKey.properties.displayName !== editingKey.identifier && /* @__PURE__ */ jsxRuntimeExports.jsxs(Text, { fontSize: "md", children: [
          "(",
          editingKey.identifier,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardBody, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        VStack,
        {
          divider: /* @__PURE__ */ jsxRuntimeExports.jsx(StackDivider, { borderColor: "gray.200" }),
          spacing: 2,
          align: "stretch",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", my: 4, children: "Memo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Textarea,
                {
                  size: "sm",
                  value: editingKey.properties.memo,
                  onChange: (e) => HandleChangeValue({
                    properties: {
                      ...editingKey.properties,
                      memo: e.target.value
                    }
                  }),
                  placeholder: "Here is a sample placeholder",
                  backgroundColor: "white",
                  maxW: "400px"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", my: 4, children: "Trusted Sites" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "400px 1fr", gap: 2, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { colSpan: 2, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Input,
                      {
                        placeholder: "https://example",
                        value: newSite,
                        onChange: handleNewSiteChange,
                        onKeyPress: (e) => {
                          if (e.key === "Enter") {
                            handleRegisterSite(e);
                          }
                        },
                        maxW: "400px",
                        backgroundColor: "white"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        variant: "outline",
                        colorScheme: "blue",
                        onClick: handleRegisterSite,
                        children: "Register"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExampleUrlMatch, { width: "100%" })
                ] }),
                !editingKey.trustedSites.length && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "No registered" }),
                editingKey.trustedSites.map((site, i) => {
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                      !site.enabled && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { label: "Expired", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "baseline", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { as: MdOutlineTimerOff }) }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Text,
                        {
                          fontSize: "md",
                          whiteSpace: "normal",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          children: [
                            site.url,
                            site.name && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                              " (",
                              site.name,
                              ")"
                            ] })
                          ]
                        }
                      )
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: () => {
                            setEditingNumForTrusted(
                              i !== editingNumForTrusted ? i : -1
                            );
                          },
                          mr: "2",
                          children: "Permission"
                        }
                      ),
                      site.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: () => handleRemoveSite(site),
                          children: "Remove"
                        }
                      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: () => handleReRegister(site.url),
                          children: "Re-register"
                        }
                      )
                    ] }),
                    editingNumForTrusted === i && /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      VStack,
                      {
                        backgroundColor: "white",
                        p: "2",
                        alignItems: "flex-start",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "sm", children: "Narrow the trust scope" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(Menu$1, { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                MenuButton,
                                {
                                  as: Button,
                                  variant: "outline",
                                  colorScheme: "blue",
                                  children: "Select Options"
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuList, { children: NallowedMethods.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                                MenuItem,
                                {
                                  closeOnSelect: false,
                                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    Checkbox,
                                    {
                                      isChecked: site.permissions.nallowedMethod.includes(
                                        option
                                      ),
                                      onChange: () => handleSaveNallowedMethod(i, option),
                                      children: option
                                    }
                                  )
                                },
                                option
                              )) })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Button,
                              {
                                variant: "outline",
                                colorScheme: "blue",
                                onClick: () => handleResetNallowedMethod(i),
                                width: "150px",
                                children: "Revert to preset"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            ExplainNallowedMethod,
                            {
                              width: "100%",
                              protocolName: "nostr"
                            }
                          )
                        ]
                      }
                    ) })
                  ] });
                })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", my: 4, children: "Dialogic Authorization" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "400px 1fr", gap: 2, children: [
                !editingKey.dialogicAuthorizedSites.length && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "No registered" }),
                editingKey.dialogicAuthorizedSites.map((site, i) => {
                  const expirationTime = new Date(site.expirationTime);
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                      site.expirationTime <= Date.now() && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { label: "Expired", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "baseline", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { as: MdOutlineTimerOff }) }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Text,
                        {
                          fontSize: "md",
                          whiteSpace: "normal",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          children: [
                            site.url,
                            site.name && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                              " (",
                              site.name,
                              ")"
                            ] }),
                            site.expirationTime > Date.now() && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                              " - until ",
                              expirationTime.toLocaleDateString(),
                              " ",
                              expirationTime.toLocaleTimeString()
                            ] })
                          ]
                        }
                      )
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: () => {
                            setEditingNumForPassword(
                              i !== editingNumForPassword ? i : -1
                            );
                          },
                          mr: "2",
                          children: "Permission"
                        }
                      ),
                      site.expirationTime > Date.now() && /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          variant: "outline",
                          colorScheme: "blue",
                          onClick: () => handleRevokeSite(site),
                          children: "Revoke"
                        }
                      )
                    ] }),
                    editingNumForPassword === i && /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      VStack,
                      {
                        backgroundColor: "white",
                        p: "2",
                        alignItems: "flex-start",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "sm", children: "The Method authorized every time" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(HStack, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Menu$1, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              MenuButton,
                              {
                                as: Button,
                                variant: "outline",
                                colorScheme: "blue",
                                children: "Select Options"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuList, { children: EveryTimeAuthorizedMethods.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                              MenuItem,
                              {
                                closeOnSelect: false,
                                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Checkbox,
                                  {
                                    isChecked: site.permissions.everyTimeAuthorizedMethods.includes(
                                      option
                                    ),
                                    onChange: () => handleSaveEveryTimeAuthorizedMethods(
                                      i,
                                      option
                                    ),
                                    children: option
                                  }
                                )
                              },
                              option
                            )) })
                          ] }) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            ExplainEveryTimeAuthorizedMethod,
                            {
                              width: "100%",
                              protocolName: "nostr"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "sm", children: "Event Kinds authorized every time" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Textarea,
                              {
                                size: "sm",
                                value: site.permissions.excludedKinds.length > 0 ? site.permissions.excludedKinds.filter(Boolean).join(",") : "",
                                onChange: (e) => handleSaveExcludedKinds(i, e.target.value),
                                placeholder: site.permissions.excludedKinds.length > 0 ? "" : "Input kind number",
                                minW: "300px",
                                backgroundColor: "white"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Button,
                              {
                                variant: "outline",
                                colorScheme: "blue",
                                onClick: () => handleResetExcludedKinds(i),
                                width: "150px",
                                children: "Revert to preset"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ExampleNostrKind, { width: "100%" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "sm", children: "Dialog dispaly settings" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(Menu$1, { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                MenuButton,
                                {
                                  as: Button,
                                  variant: "outline",
                                  colorScheme: "blue",
                                  children: "Select Options"
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuList, { children: DialogDisplayOptions.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                                MenuItem,
                                {
                                  closeOnSelect: false,
                                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    Checkbox,
                                    {
                                      isChecked: site.permissions.skippedDialog.includes(
                                        option
                                      ),
                                      onChange: () => handleSaveSkippedDialog(i, option),
                                      children: option
                                    }
                                  )
                                },
                                option
                              )) })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Button,
                              {
                                variant: "outline",
                                colorScheme: "blue",
                                onClick: () => handleResetSkippedDialog(i),
                                width: "150px",
                                children: "Revert to preset"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            ExplainDialogDisplayOption,
                            {
                              width: "100%",
                              protocolName: "nostr"
                            }
                          )
                        ]
                      }
                    ) })
                  ] });
                })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", my: 4, children: "Primary" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Switch,
                {
                  isChecked: editingKey.primary,
                  onChange: (e) => HandleChangeValue({ primary: e.target.checked }),
                  alignSelf: "center"
                }
              )
            ] })
          ]
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardFooter, { pt: "0", justify: "space-evenly", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          IconButton,
          {
            icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdOutlineCancel, {}),
            variant: "transparent",
            fontSize: "20px",
            "aria-label": "Cancel",
            onClick: handleGoBack
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          IconButton,
          {
            icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdSaveAlt, {}),
            variant: "filled",
            fontSize: "24px",
            "aria-label": "Save",
            onClick: handleSave
          }
        )
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, {}),
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
  const { prefs, credentials } = props;
  const { states, resetState, updateState } = reactExports.useContext(StateContext);
  const {
    addCredentialToStore: addCredentialToStore2,
    modifyCredentialToStore: modifyCredentialToStore2,
    deleteCredentialToStore: deleteCredentialToStore2,
    onPrimaryChanged: onPrimaryChanged2
  } = dispatchEvents;
  const [importedKey, setImportedKey] = reactExports.useState("");
  const [newKey, setNewKey] = reactExports.useState("");
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  const nostrKeys = reactExports.useMemo(
    () => credentials.map(addInterpretedKeys),
    [credentials]
  );
  const defaultTrustedSites = reactExports.useMemo(
    () => [
      ...DefaultTrustedSites,
      ...prefs.base.addons.map((addon) => ({
        url: addon.url,
        name: addon.name,
        enabled: true,
        permissions: { nallowedMethod: DefaultNallowedMethods }
      }))
    ],
    [prefs.base.addons]
  );
  const handleGenNewKey = async (e) => {
    e.preventDefault();
    const [, seckey] = generateSecretOnToolkit("nostr", "nsec");
    const [, pubkey] = generateSecretOnToolkit("nostr", "npub", {
      secretKey: seckey
    });
    const npubkey = encodeToNostrKey("npub", hexToBytes(pubkey));
    addCredentialToStore2({
      ...NostrTemplate,
      identifier: npubkey,
      secret: bytesToHex(seckey),
      primary: nostrKeys.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        ...NostrTemplate.properties,
        displayName: npubkey,
        generationMethod: "bip340",
        generationFrom: location.href
      }
    });
    setNewKey(npubkey);
  };
  const handleImportedKeyChange = (e) => setImportedKey(e.target.value);
  const handleSave = async (e) => {
    e.preventDefault();
    let nseckey = importedKey;
    if (!NostrTypeGuard.isNSec(nseckey)) {
      try {
        const rawSeckey2 = hexToBytes(nseckey);
        nseckey = encodeToNostrKey("nsec", rawSeckey2);
        if (!NostrTypeGuard.isNSec(nseckey)) {
          alert("The typed key is not nsec!");
          return;
        }
      } catch (e2) {
        alert("The typed key is not nsec!");
        return;
      }
    }
    const { data: rawSeckey } = decodeFromNostrKey(nseckey);
    const seckey = bytesToHex(rawSeckey);
    if (nostrKeys.some((key) => key.secret === seckey)) {
      alert("The typed key is existing!");
      return;
    }
    const [, pubkey] = generateSecretOnToolkit("nostr", "npub", {
      secretKey: seckey
    });
    const npubkey = encodeToNostrKey("npub", hexToBytes(pubkey));
    addCredentialToStore2({
      ...NostrTemplate,
      identifier: npubkey,
      secret: seckey,
      primary: nostrKeys.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        ...NostrTemplate.properties,
        displayName: npubkey,
        generationMethod: "import",
        generationFrom: location.href
      }
    });
    setImportedKey("");
  };
  const handleChangePrimary = async (checked, item) => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    changePrimary(item.guid, checked, nostrKeys);
  };
  const handleDeleteCredential = async (item) => {
    if (!confirm("The key can't be restored if no backup. Okay?")) {
      return;
    }
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    if (item.primary === true) {
      const prev = nostrKeys.find((key) => !key.primary);
      if (prev) {
        modifyCredentialToStore2({
          guid: prev.guid,
          primary: true
        });
      }
      onPrimaryChanged2({ protocolName: "nostr", guid: prev ? prev.guid : "" });
    }
    deleteCredentialToStore2(item);
  };
  const handleAllRemove = async (e) => {
    e.preventDefault();
    if (!confirm("All data will be deleted. Okay?")) {
      return;
    }
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    for (const credential of nostrKeys) {
      deleteCredentialToStore2(credential);
    }
    onPrimaryChanged2({ protocolName: "nostr", guid: "" });
    location.reload();
  };
  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };
  function addInterpretedKeys(item) {
    const rawSeckey = hexToBytes(item.secret);
    const nseckey = encodeToNostrKey("nsec", rawSeckey);
    const [, rawPubkey] = generateSecretOnToolkit("nostr", "npub", {
      secretKey: rawSeckey
    });
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
                  placeholder: "nsec or hex secret key",
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
            nostrKeys.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "No key registered" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Flex, { gap: 6, wrap: "wrap", children: nostrKeys.map((item, i) => {
              return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: states.nostr.editingNo !== i ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { maxW: "md", overflow: "hidden", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { pb: "0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "md", isTruncated: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      contentEditable: true,
                      onBlur: (e) => {
                        e.preventDefault();
                        modifyCredentialToStore2({
                          guid: item.guid,
                          properties: {
                            ...item.properties,
                            displayName: e.target.textContent
                          }
                        });
                      },
                      children: item.properties.displayName
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(HStack, { children: item.trustedSites.some((site) => site.url === "*") && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { label: "All URL trusted", children: "🚨" }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardBody, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "md", isTruncated: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      contentEditable: true,
                      onBlur: (e) => {
                        e.preventDefault();
                        modifyCredentialToStore2({
                          guid: item.guid,
                          properties: {
                            ...item.properties,
                            memo: e.target.textContent
                          }
                        });
                      },
                      children: item.properties.memo
                    }
                  ) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { mt: 2, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "N Format" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "md", isTruncated: true, children: item.identifier }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Secret,
                      {
                        protocolName: item.protocolName,
                        value: item.nseckey,
                        onChangeVisibility: () => {
                        },
                        prefs,
                        textProps: { fontSize: "md", isTruncated: true }
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { mt: 2, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { size: "xs", textTransform: "uppercase", children: "Hex Format" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "md", isTruncated: true, children: item.rawPubkey }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Secret,
                      {
                        protocolName: item.protocolName,
                        value: item.secret,
                        onChangeVisibility: () => {
                        },
                        prefs,
                        textProps: { fontSize: "md", isTruncated: true }
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Text, { fontSize: "sm", children: [
                    item.properties.generationMethod === "import" ? "Imported" : "Generated",
                    " ",
                    "on ",
                    new Date(item.timeCreated).toLocaleDateString(),
                    " ",
                    new Date(item.timeCreated).toLocaleTimeString(),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
                    "at ",
                    item.properties.generationFrom
                  ] }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardFooter, { pt: "0", justify: "space-evenly", children: [
                  nostrKeys.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { gap: "2", children: [
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
                    IconButton,
                    {
                      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdEdit, {}),
                      variant: "transparent",
                      fontSize: "20px",
                      "aria-label": "Edit Key",
                      onClick: () => updateState("nostr", { editingNo: i })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    IconButton,
                    {
                      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdDeleteForever, {}),
                      variant: "transparent",
                      fontSize: "20px",
                      "aria-label": "Delete Key",
                      onClick: () => handleDeleteCredential(item)
                    }
                  )
                ] })
              ] }, i) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                KeyEditor,
                {
                  credential: nostrKeys[states.nostr.editingNo],
                  nostrKeys,
                  prefs,
                  goBack: () => resetState()
                }
              ) });
            }) })
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
const OneHour = 60 * 60 * 1e3;
function NIP07(props) {
  const { prefs, credentials: nostrKeys } = props;
  const { states, resetState, updateState } = reactExports.useContext(StateContext);
  const { modifyCredentialToStore: modifyCredentialToStore2, onPrefChanged: onPrefChanged2 } = dispatchEvents;
  const [newSite, setNewSite] = reactExports.useState("");
  const [newExcludedKindsPreset, setNewExcludedKindsPreset] = reactExports.useState("");
  const [newNallowedMethodPreset, setNewNallowedMethodPreset] = reactExports.useState([]);
  const [newDialogDisplayOptionPreset, setNewDialogDisplayOptionPreset] = reactExports.useState([]);
  const [tabIndex, setTabIndex] = reactExports.useState(-1);
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (tabIndex === -1) {
      setTabIndex(parseInt(prefs.nostr.tabPinInNip07));
    }
  }, [prefs.nostr.tabPinInNip07]);
  reactExports.useEffect(() => {
    setNewNallowedMethodPreset(
      prefs.nostr.nallowedMethodPreset.split(",")
    );
  }, [prefs.nostr.nallowedMethodPreset]);
  reactExports.useEffect(() => {
    setNewDialogDisplayOptionPreset(
      prefs.nostr.dialogDisplayOptionPreset.split(",")
    );
  }, [prefs.nostr.dialogDisplayOptionPreset]);
  const tabPin = (tabId) => TabPin(
    tabId.toString(),
    { key: "tabPinInNip07", value: prefs.nostr.tabPinInNip07 },
    "nostr"
  );
  const handleUsedTrustedSites = async (checked) => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    onPrefChanged2({ protocolName: "nostr", usedTrustedSites: checked });
  };
  const handleNewSiteChange = (e) => setNewSite(e.target.value);
  const handleRegisterSite = async (e) => {
    e.preventDefault();
    if (!SafeProtocols.some((protocol) => newSite.startsWith(protocol)) && !SpecialCards.includes(newSite)) {
      alert(`Currently, only supports ${SafeProtocols.join(",")}.`);
      return;
    }
    const existings = nostrKeys.filter(
      (key) => key.trustedSites.some((site) => site.url === newSite && site.enabled)
    );
    if (nostrKeys.length === existings.length) {
      alert("The url exists already.");
      return;
    }
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    for (const key of nostrKeys) {
      const idx = key.trustedSites.findIndex((site) => site.url === newSite);
      if (idx >= 0) {
        if (key.trustedSites[idx].enabled) {
          return;
        }
        key.trustedSites[idx].enabled = true;
      } else {
        key.trustedSites.push({
          url: newSite,
          name: newSite !== "*" ? "" : "<all_urls>",
          enabled: true,
          permissions: { nallowedMethod: DefaultNallowedMethods }
        });
      }
      modifyCredentialToStore2(
        {
          guid: key.guid,
          trustedSites: key.trustedSites
        },
        newSite.startsWith("moz-extension") ? { newExtensionForTrustedSite: [newSite] } : void 0
      );
    }
  };
  const handleRemoveTrustedSite = async (identifier, removedSite) => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    const item = nostrKeys.find((key) => key.identifier === identifier);
    modifyCredentialToStore2({
      guid: item.guid,
      trustedSites: item.trustedSites.map((site) => {
        if (site.url === removedSite.url) {
          site.enabled = false;
        }
        return site;
      })
    });
  };
  const handleRemoveAllTrustedSites = async (removedSite) => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    for (const item of nostrKeys) {
      modifyCredentialToStore2({
        guid: item.guid,
        trustedSites: item.trustedSites.map((site) => {
          if (site.url === removedSite.url) {
            site.enabled = false;
          }
          return site;
        })
      });
    }
  };
  const handleUsedBuiltinNip07 = (e) => {
    e.preventDefault();
    const checked = e.target.checked;
    onPrefChanged2({ protocolName: "nostr", usedBuiltinNip07: checked });
  };
  const handleUsedPrimarypasswordToApps = async (checked) => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    onPrefChanged2({
      protocolName: "nostr",
      usedPrimarypasswordToApps: checked
    });
  };
  const handleExpirationTimeForPrimarypasswordToApps = async (valueAsString, valueAsNumber) => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    onPrefChanged2({
      protocolName: "nostr",
      expirationTimeForPrimarypasswordToApps: valueAsNumber * OneHour
    });
  };
  const handleRevokeAuthorizedSite = async (identifier, revokedSite) => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    const item = nostrKeys.find((key) => key.identifier === identifier);
    modifyCredentialToStore2({
      guid: item.guid,
      dialogicAuthorizedSites: item.dialogicAuthorizedSites.map((site) => {
        if (site.url === revokedSite.url) {
          site.expirationTime = 0;
        }
        return site;
      })
    });
  };
  const handleRevokeAllAuthorizedSites = async (revokedSite) => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    for (const item of nostrKeys) {
      modifyCredentialToStore2({
        guid: item.guid,
        dialogicAuthorizedSites: item.dialogicAuthorizedSites.map((site) => {
          if (site.url === revokedSite) {
            site.expirationTime = 0;
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
  const handleChangeExcludedKinds = (e) => {
    e.preventDefault();
    const value = e.target.value;
    if (!/^[1-9][0-9,]*$/.test(value) && value !== "") {
      alert("Input must be Kind number or ','.");
      return;
    }
    setNewExcludedKindsPreset(value);
  };
  const handleResetExcludedKinds = async (sort) => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    onPrefChanged2({
      protocolName: "nostr",
      excludedKindsPreset: sort === "edit" ? newExcludedKindsPreset : DefaultExcludedKinds.join(",")
    });
    if (sort === "default") {
      setNewExcludedKindsPreset(DefaultExcludedKinds.filter(Boolean).join(","));
    }
  };
  const handleChangeNallowedMethod = (value) => {
    let newVal = [];
    if (newNallowedMethodPreset.includes(value)) {
      newVal = newNallowedMethodPreset.filter((method) => method !== value);
    } else {
      newVal = newNallowedMethodPreset.concat([value]);
    }
    onPrefChanged2({
      protocolName: "nostr",
      nallowedMethodPreset: newVal.filter(Boolean).join(",")
    });
    setNewNallowedMethodPreset(newVal);
  };
  const handleResetNallowedMethod = async () => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    onPrefChanged2({
      protocolName: "nostr",
      nallowedMethodPreset: DefaultNallowedMethods.filter(Boolean).join(",")
    });
    setNewNallowedMethodPreset(DefaultNallowedMethods);
  };
  const handleChangeDialogDisplayOption = (value) => {
    let newVal = [];
    if (newDialogDisplayOptionPreset.includes(value)) {
      newVal = newDialogDisplayOptionPreset.filter((method) => method !== value);
    } else {
      newVal = newDialogDisplayOptionPreset.concat([value]);
    }
    onPrefChanged2({
      protocolName: "nostr",
      dialogDisplayOptionPreset: newVal.filter(Boolean).join(",")
    });
    setNewDialogDisplayOptionPreset(newVal);
  };
  const handleResetDialogDisplayOption = async () => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    onPrefChanged2({
      protocolName: "nostr",
      dialogDisplayOptionPreset: DefaultDialogDisplayOptions.filter(Boolean).join(",")
    });
    setNewDialogDisplayOptionPreset(DefaultDialogDisplayOptions);
  };
  const getTrustedSites = reactExports.useCallback(() => {
    const trustedSites = Array.from(
      new Set(
        nostrKeys.map(
          (key) => key.trustedSites.filter((site) => site.enabled).map((site) => {
            const { permissions, ...rest } = site;
            return rest;
          })
        ).flat().map((site) => JSON.stringify(site))
      )
    ).map((site) => JSON.parse(site));
    return trustedSites.length > 0 ? trustedSites.map((site) => /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Accordion, { allowToggle: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionItem, { css: { border: "none" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          AccordionButton,
          {
            textAlign: "left",
            css: { padding: 0, lineBreak: "anywhere" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Heading, { as: "h5", size: "sm", children: [
                site.url,
                site.name && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  " (",
                  site.name,
                  ")"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionIcon, {})
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionPanel, { pb: 4, children: nostrKeys.filter(
          (key) => key.trustedSites.some(
            (_site) => _site.enabled && _site.url === site.url
          )
        ).map((key, i) => {
          return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: !(states.nostr.editingNo === i && states.nostr.editingUrl === site.url) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Grid,
            {
              gridTemplateColumns: "550px 1fr",
              gap: 6,
              alignItems: "start",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: key.properties.displayName }),
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    IconButton,
                    {
                      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdEdit, {}),
                      variant: "transparent",
                      "aria-label": "Edit Key",
                      onClick: () => updateState("nostr", {
                        editingNo: i,
                        editingUrl: site.url
                      })
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "outline",
                    colorScheme: "blue",
                    onClick: () => handleRemoveTrustedSite(
                      key.identifier,
                      site
                    ),
                    children: "Remove"
                  }
                ) })
              ]
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            KeyEditor,
            {
              credential: nostrKeys[states.nostr.editingNo],
              nostrKeys,
              prefs,
              goBack: () => resetState()
            }
          ) });
        }) })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outline",
          colorScheme: "blue",
          onClick: () => handleRemoveAllTrustedSites(site),
          children: "Remove from All keys"
        }
      ) })
    ] })) : /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "No site enabled" });
  }, [nostrKeys, states.nostr]);
  const getDialogicAuthorizedSites = reactExports.useCallback(() => {
    const dialogicAuthorizedSites = nostrKeys.reduce((acc, key, i) => {
      key.dialogicAuthorizedSites.filter((site) => site.expirationTime > Date.now()).forEach((site) => {
        const found = Object.keys(acc).find((url) => site.url === url);
        if (found) {
          acc[found].push({ key, site, keyNo: i });
          return;
        }
        acc[site.url] = [{ key, site, keyNo: i }];
      });
      return acc;
    }, {});
    return Object.keys(dialogicAuthorizedSites).length > 0 ? Object.entries(dialogicAuthorizedSites).map(([url, keys]) => {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Accordion, { allowToggle: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionItem, { css: { border: "none" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            AccordionButton,
            {
              textAlign: "left",
              css: { padding: 0, lineBreak: "anywhere" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Heading, { as: "h5", size: "sm", children: [
                  url,
                  keys[0].site.name && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    " (",
                    keys[0].site.name,
                    ")"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionIcon, {})
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionPanel, { pb: 4, children: keys.map((item) => {
            const expirationTime = new Date(item.site.expirationTime);
            return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: !(states.nostr.editingNo === item.keyNo && states.nostr.editingUrl === url) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Grid,
              {
                gridTemplateColumns: "550px 1fr",
                gap: 6,
                alignItems: "start",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: item.key.properties.displayName }),
                    " ",
                    " - until ",
                    expirationTime.toLocaleDateString(),
                    " ",
                    expirationTime.toLocaleTimeString(),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      IconButton,
                      {
                        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MdEdit, {}),
                        variant: "transparent",
                        "aria-label": "Edit Key",
                        onClick: () => updateState("nostr", {
                          editingNo: item.keyNo,
                          editingUrl: url
                        })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      variant: "outline",
                      colorScheme: "blue",
                      onClick: () => handleRevokeAuthorizedSite(
                        item.key.identifier,
                        item.site
                      ),
                      children: "Revoke"
                    }
                  ) })
                ]
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              KeyEditor,
              {
                credential: nostrKeys[states.nostr.editingNo],
                nostrKeys,
                prefs,
                goBack: () => resetState()
              }
            ) });
          }) })
        ] }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outline",
            colorScheme: "blue",
            onClick: () => handleRevokeAllAuthorizedSites(url),
            children: "Revoke All keys"
          }
        ) })
      ] });
    }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { children: "No site enabled" });
  }, [nostrKeys, states.nostr]);
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
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "300px 1fr", gap: 6, alignItems: "center", children: [
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
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h4", size: "md", children: "Protect Options" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "The following helps save you against theft:" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Tabs,
              {
                variant: "enclosed",
                index: tabIndex,
                onChange: (index) => {
                  setTabIndex(index);
                  resetState();
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(TabList, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h5", size: "md", children: "Trusted Sites" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "center", mr: 1, children: tabPin(0) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h5", size: "md", children: "Dialogic Authorization" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "center", mr: 1, children: tabPin(1) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(TabPanels, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabPanel, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Grid,
                        {
                          gridTemplateColumns: "300px 1fr",
                          gap: 6,
                          alignItems: "start",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "Any URL registered here will be allowed for your key indefinitely." }) }),
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
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Input,
                                  {
                                    placeholder: "https://example",
                                    value: newSite,
                                    onChange: handleNewSiteChange,
                                    onKeyPress: (e) => {
                                      if (e.key === "Enter") {
                                        handleRegisterSite(e);
                                      }
                                    },
                                    maxW: "300px"
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
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(ExampleUrlMatch, { width: "600px" })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Presets to narrow down to specific methods" }) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(Menu$1, { closeOnSelect: false, children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    MenuButton,
                                    {
                                      as: Button,
                                      variant: "outline",
                                      colorScheme: "blue",
                                      children: "Select Options"
                                    }
                                  ),
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuList, { children: NallowedMethods.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    Checkbox,
                                    {
                                      isChecked: newNallowedMethodPreset.includes(
                                        option
                                      ),
                                      onChange: () => handleChangeNallowedMethod(option),
                                      children: option
                                    }
                                  ) }, option)) })
                                ] }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Button,
                                  {
                                    variant: "outline",
                                    colorScheme: "blue",
                                    onClick: (e) => {
                                      e.preventDefault();
                                      handleResetNallowedMethod();
                                    },
                                    children: "Reset to default"
                                  }
                                )
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(ExplainNallowedMethod, { width: "600px", protocolName: "nostr" })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, {})
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Grid,
                        {
                          gridTemplateColumns: "700px 1fr",
                          gap: 6,
                          alignItems: "start",
                          children: getTrustedSites()
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabPanel, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Grid,
                        {
                          gridTemplateColumns: "300px 1fr",
                          gap: 6,
                          alignItems: "start",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { colSpan: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { fontSize: "sm", children: "Authorize interactively when the app requests you, having an expiration." }) }),
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
                              /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "nostr-pref-expirationTimeForPrimarypasswordToApps", children: "Expiration Hour" }) }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                NumberInput,
                                {
                                  id: "nostr-pref-expirationTimeForPrimarypasswordToApps",
                                  value: prefs.nostr.expirationTimeForPrimarypasswordToApps / OneHour,
                                  onChange: handleExpirationTimeForPrimarypasswordToApps,
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
                              ) }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Preset for the Event Kind authorized every time" }) }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                VStack,
                                {
                                  backgroundColor: "white",
                                  p: "2",
                                  alignItems: "flex-start",
                                  children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                        Input,
                                        {
                                          placeholder: "Input kind number",
                                          value: newExcludedKindsPreset || prefs.nostr.excludedKindsPreset,
                                          onChange: handleChangeExcludedKinds,
                                          maxW: "300px"
                                        }
                                      ),
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                        Button,
                                        {
                                          variant: "outline",
                                          colorScheme: "blue",
                                          onClick: (e) => {
                                            e.preventDefault();
                                            handleResetExcludedKinds("edit");
                                          },
                                          children: "Edit"
                                        }
                                      ),
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                        Button,
                                        {
                                          variant: "outline",
                                          colorScheme: "blue",
                                          onClick: (e) => {
                                            e.preventDefault();
                                            handleResetExcludedKinds("default");
                                          },
                                          children: "Reset to default"
                                        }
                                      )
                                    ] }),
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(ExampleNostrKind, { width: "600px" })
                                  ]
                                }
                              ) }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Preset for dialog dispaly settings" }) }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(GridItem, { children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(HStack, { children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Menu$1, { closeOnSelect: false, children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                                      MenuButton,
                                      {
                                        as: Button,
                                        variant: "outline",
                                        colorScheme: "blue",
                                        children: "Select Options"
                                      }
                                    ),
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(MenuList, { children: DialogDisplayOptions.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                      Checkbox,
                                      {
                                        isChecked: newDialogDisplayOptionPreset.includes(
                                          option
                                        ),
                                        onChange: () => handleChangeDialogDisplayOption(option),
                                        children: option
                                      }
                                    ) }, option)) })
                                  ] }),
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    Button,
                                    {
                                      variant: "outline",
                                      colorScheme: "blue",
                                      onClick: (e) => {
                                        e.preventDefault();
                                        handleResetDialogDisplayOption();
                                      },
                                      children: "Reset to default"
                                    }
                                  )
                                ] }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  ExplainDialogDisplayOption,
                                  {
                                    width: "600px",
                                    protocolName: "nostr"
                                  }
                                )
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, {})
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Grid,
                        {
                          gridTemplateColumns: "700px 1fr",
                          gap: 6,
                          alignItems: "start",
                          children: getDialogicAuthorizedSites()
                        }
                      )
                    ] })
                  ] })
                ]
              }
            )
          ] })
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
function More(props) {
  const { prefs } = props;
  const { onPrefChanged: onPrefChanged2 } = dispatchEvents;
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  const handleUsedPrimarypasswordToSettings = async (checked) => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
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
  const { resetState } = reactExports.useContext(StateContext);
  const { onPrefChanged: onPrefChanged2 } = dispatchEvents;
  const [tabIndex, setTabIndex] = reactExports.useState(-1);
  reactExports.useEffect(() => {
    if (tabIndex === -1) {
      setTabIndex(parseInt(prefs.nostr.tabPin));
    }
  }, [prefs.nostr.tabPin]);
  const nostrKeys = reactExports.useMemo(
    () => credentials.filter((credential) => credential.protocolName === "nostr").sort((a, b) => b.primary ? 1 : 0),
    [credentials]
  );
  const handleEnable = (e) => {
    e.preventDefault();
    const checked = e.target.checked;
    onPrefChanged2({ protocolName: "nostr", enabled: checked });
  };
  const tabPin = (tabId) => TabPin(
    tabId.toString(),
    { key: "tabPin", value: prefs.nostr.tabPin },
    "nostr"
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { height: "calc(100vh - 40px)", mt: 10, overflowY: "auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { size: "md", mb: "10px", children: "Your keys are stored locally, isolated from and inaccessible to the web app." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "100px 1fr", gap: 6, mb: "2rem", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "nostr-pref-enabled", children: "Enable" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Switch,
        {
          id: "nostr-pref-enabled",
          isChecked: prefs.nostr.enabled,
          onChange: handleEnable
        }
      ) })
    ] }),
    prefs.nostr.tabPin ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Tabs,
      {
        variant: "enclosed",
        index: tabIndex,
        onChange: (index) => {
          setTabIndex(index);
          resetState();
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabList, { position: "sticky", top: "0", zIndex: 1, m: 2, bg: "white", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h3", size: "lg", children: "Keys" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "center", mr: 3, children: tabPin(0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h3", size: "lg", children: "NIP-07" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "center", mr: 3, children: tabPin(1) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { as: "h3", size: "lg", children: "More" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", alignItems: "center", mr: 3, children: tabPin(2) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabPanels, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabPanel, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Nostr$1, { prefs, credentials: nostrKeys }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabPanel, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(NIP07, { prefs, credentials: nostrKeys }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabPanel, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(More, { prefs, credentials: nostrKeys }) })
          ] })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, {})
  ] });
}
function Settings(props) {
  const { prefs, credentials } = props;
  const { onPrimaryChanged: onPrimaryChanged2, removeAllCredentialsToStore: removeAllCredentialsToStore2 } = dispatchEvents;
  const [isOpenDialog, setIsOpenDialog] = reactExports.useState(false);
  const handleAllRemove = async (e) => {
    e.preventDefault();
    if (!confirm("All data will be deleted. Okay?")) {
      return;
    }
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }
    removeAllCredentialsToStore2();
    for (const protocolName of ["bitcoin", "nostr"]) {
      onPrimaryChanged2({ protocolName, guid: "" });
    }
  };
  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { height: "calc(100vh - 40px)", mt: 10, overflowY: "auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { gridTemplateColumns: "100px 1fr", gap: 6, mb: "2rem", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "setting-pref-reset", children: "Delete All data" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(GridItem, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outline",
          colorScheme: "blue",
          onClick: handleAllRemove,
          children: "Reset"
        }
      ) })
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
function SelfSovereignIndividual() {
  const { prefs, credentials } = useChildActorEvent();
  const { initStore: initStore2 } = dispatchEvents;
  const [selectedMenu, setSelectedMenu] = reactExports.useState("");
  reactExports.useEffect(() => {
    initStore2();
  }, []);
  reactExports.useEffect(() => {
    if (!selectedMenu) {
      setSelectedMenu(prefs.base.menuPin);
    }
  }, [prefs.base.menuPin]);
  const switchContent = () => {
    if (selectedMenu === "bitcoin") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Bitcoin, { prefs, credentials });
    } else if (selectedMenu === "nostr") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Nostr, { prefs, credentials });
    } else if (selectedMenu === "settings") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { prefs, credentials });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    HStack,
    {
      width: "100%",
      height: "100vh",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      overflow: "auto",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Menu,
          {
            selectedMenu,
            setSelectedMenu,
            menuPin: prefs.base.menuPin
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: "1", children: prefs.base.menuPin ? switchContent() : /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, {}) })
      ]
    }
  );
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
    const root = clientExports.createRoot(container);
    root.render(
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChakraProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(StateProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelfSovereignIndividual, {}) }) })
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
