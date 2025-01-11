import { useEffect, useState } from "react";
import {
  Credential,
  CredentialForPayload,
  ProtocolName,
  SelfsovereignidentityPrefs,
} from "../custom.type";

/**
 * Send to child actor
 *
 */

function initStore() {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityInit", {
      bubbles: true,
    })
  );
}

function getAllCredentialsToStore() {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityGetAllCredentials", {
      bubbles: true,
    })
  );
}

function addCredentialToStore(credential: Credential) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityCreateCredential", {
      bubbles: true,
      detail: transformToPayload(credential),
    })
  );
}

function modifyCredentialToStore(
  credential: Partial<Credential>,
  options?: { newExtensionForTrustedSite: string }
) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityUpdateCredential", {
      bubbles: true,
      detail: { credential: transformToPayload(credential), options },
    })
  );
}

function deleteCredentialToStore(
  deletedCredential: Credential,
  credentials: Credential[]
) {
  if (credentials.length <= 2) {
    if (credentials.length === 2) {
      const leftCredential = credentials.find(
        credential => credential.guid !== deletedCredential.guid
      );
      leftCredential.primary = true;
      modifyCredentialToStore(leftCredential);
    }
  }
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityDeleteCredential", {
      bubbles: true,
      detail: transformToPayload(deletedCredential),
    })
  );
}

function removeAllCredentialsToStore() {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityRemoveAllCredentials", {
      bubbles: true,
    })
  );
}

function onPrimaryChanged(changeSet: {
  protocolName: ProtocolName;
  guid: string;
}) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityPrimaryChanged", {
      bubbles: true,
      detail: changeSet,
    })
  );
}

function onPrefChanged(
  changeSet: {
    protocolName: ProtocolName;
  } & Partial<SelfsovereignidentityPrefs["nostr"]>
) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityPrefChanged", {
      bubbles: true,
      detail: changeSet,
    })
  );
}

export const dispatchEvents = {
  initStore,
  getAllCredentialsToStore,
  addCredentialToStore,
  modifyCredentialToStore,
  deleteCredentialToStore,
  removeAllCredentialsToStore,
  onPrimaryChanged,
  onPrefChanged,
};

/**
 * Utils
 *
 */

function transformToPayload(credential: Partial<Credential>) {
  const newVal = { ...credential } as unknown as CredentialForPayload;
  if (credential.trustedSites) {
    newVal.trustedSites = JSON.stringify(credential.trustedSites);
  }
  if (credential.properties) {
    newVal.properties = JSON.stringify(credential.properties);
  }
  return newVal;
}

function transformCredentialsFromStore(
  credentialForPayloads: CredentialForPayload[]
) {
  return credentialForPayloads.map(credential => {
    const trustedSites = JSON.parse(
      credential.trustedSites.replace(/^''$/g, '"')
    );
    const properties = JSON.parse(credential.properties.replace(/^''$/g, '"'));
    return {
      ...credential,
      trustedSites,
      properties,
    };
  });
}

type Op = "get" | "add" | "update" | "remove" | "removeAll" | null;

export default function useChildActorEvent() {
  const [prefs, setPrefs] = useState<SelfsovereignidentityPrefs>({
    nostr: {
      enabled: true,
      usedPrimarypasswordToSettings: true,
      expiryTimeForPrimarypasswordToSettings: 300000,
      usedPrimarypasswordToApps: true,
      expiryTimeForPrimarypasswordToApps: 86400000,
      usedTrustedSites: false,
      usedBuiltinNip07: true,
      usedAccountChanged: true,
    },
    addons: [],
  });
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credentialsFromStore, setCredentialsFromStore] = useState<
    [Op, Credential[]]
  >([null, []]);

  // Only do once
  useEffect(() => {
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

  useEffect(() => {
    const [op, state] = credentialsFromStore;
    if (op === "add") {
      if (state[0].primary) {
        // emit becase of the fisrt register
        onPrimaryChanged({
          protocolName: state[0].protocolName,
          guid: state[0].guid,
        });
      }
      setCredentials(prev => [...prev, ...state]);
    } else if (op === "update") {
      setCredentials(prev =>
        prev.map(credential =>
          credential.guid === state[0].guid ? state[0] : credential
        )
      );
    } else if (op === "remove") {
      setCredentials(prev =>
        prev.filter(credential => credential.guid !== state[0].guid)
      );
    } else if (op === "removeAll") {
      setCredentials([]);
    } else {
      setCredentials(prev => [...prev, ...state]);
    }
  }, [credentialsFromStore]);

  // one-way listner to receive the event
  const receiveFromChildActor = event => {
    switch (event.detail.messageType) {
      case "Setup":
      case "AllCredentials": {
        const newState = transformCredentialsFromStore(
          event.detail.value.credentials
        );
        setCredentialsFromStore(["get", newState]);
        setPrefs(prev => ({ ...prev, addons: event.detail.value.addons }));
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
          setPrefs(prev => {
            const newState = {
              ...prev,
            };
            const keys = Object.keys(event.detail.value);
            for (const protocolName of keys) {
              newState[protocolName] = {
                ...prev[protocolName],
                ...event.detail.value[protocolName],
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
    credentials,
  };
}
