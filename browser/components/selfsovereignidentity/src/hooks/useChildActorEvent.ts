import { useEffect, useState } from "react"
import {
  Credential,
  CredentialForPayload,
  ProtocolName,
  SelfsovereignidentityPrefs,
} from "../custom.type"

/**
 * Send to child actor
 *
 */

function initStore() {
  console.log("event emit!")
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityInit", {
      bubbles: true,
    })
  )
}

function getAllCredentialsToStore() {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityGetAllCredentials", {
      bubbles: true,
    })
  )
}

function addCredentialToStore(credential: Credential) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityCreateCredential", {
      bubbles: true,
      detail: transformToPayload(credential),
    })
  )
}

function modifyCredentialToStore(credential: Credential) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityUpdateCredential", {
      bubbles: true,
      detail: transformToPayload(credential),
    })
  )
}

function deleteCredentialToStore(
  deletedCredential: Credential,
  credentials: Credential[]
) {
  if (credentials.length <= 2) {
    if (credentials.length === 2) {
      const leftCredential = credentials.find(
        (credential) => credential.guid !== deletedCredential.guid
      )
      leftCredential.primary = true
      modifyCredentialToStore(leftCredential)
    }
  }
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityDeleteCredential", {
      bubbles: true,
      detail: transformToPayload(deletedCredential),
    })
  )
}

function removeAllCredentialsToStore() {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityRemoveAllCredentials", {
      bubbles: true,
    })
  )
}

function onPrimaryChanged(changeSet: {
  protocolName: ProtocolName
  guid: string
}) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityPrimaryChanged", {
      bubbles: true,
      detail: changeSet,
    })
  )
}

function onPrefChanged(changeSet: {
  protocolName: ProtocolName
  enabled: boolean
}) {
  window.dispatchEvent(
    new CustomEvent("AboutSelfsovereignidentityPrefChanged", {
      bubbles: true,
      detail: changeSet,
    })
  )
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
}

/**
 * Utils
 *
 */

function transformToPayload(credential: Credential) {
  const newVal = { ...credential } as unknown as CredentialForPayload
  newVal.properties = JSON.stringify(credential.properties)
  return newVal
}

function transformCredentialsFromStore(
  credentialForPayloads: CredentialForPayload[]
) {
  return credentialForPayloads.map((credential) => {
    const properties = JSON.parse(credential.properties.replace(/^''$/g, '"'))
    return {
      ...credential,
      properties,
    }
  })
}

type Op = "get" | "add" | "update" | "remove" | "removeAll" | null

export default function useChildActorEvent() {
  const [prefs, setPrefs] = useState<SelfsovereignidentityPrefs>({
    nostr: true,
  })
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [credentialsFromStore, setCredentialsFromStore] = useState<
    [Op, Credential[]]
  >([null, []])

  // Only do once
  useEffect(() => {
    window.addEventListener(
      "AboutSelfsovereignidentityChromeToContent",
      receiveFromChildActor
    )
    return () => {
      window.removeEventListener(
        "AboutSelfsovereignidentityChromeToContent",
        receiveFromChildActor
      )
    }
  }, [])

  useEffect(() => {
    const [op, state] = credentialsFromStore
    if (op === "add") {
      if (state[0].primary) {
        // emit becase of the fisrt register
        onPrimaryChanged({
          protocolName: state[0].protocolName,
          guid: state[0].guid,
        })
      }
      setCredentials((prev) => [...prev, ...state])
    } else if (op === "update") {
      setCredentials((prev) =>
        prev.map((credential) =>
          credential.guid === state[0].guid ? state[0] : credential
        )
      )
    } else if (op === "remove") {
      setCredentials((prev) =>
        prev.filter((credential) => credential.guid !== state[0].guid)
      )
    } else if (op === "removeAll") {
      setCredentials([])
    } else {
      setCredentials((prev) => [...prev, ...state])
    }
  }, [credentialsFromStore])

  // one-way listner to receive the event
  const receiveFromChildActor = (event) => {
    switch (event.detail.messageType) {
      case "Setup":
      case "AllCredentials": {
        const newState = transformCredentialsFromStore(
          event.detail.value.credentials
        )
        setCredentialsFromStore(["get", newState])
        break
      }
      case "CredentialAdded": {
        const newState = transformCredentialsFromStore([event.detail.value])
        setCredentialsFromStore(["add", newState])
        break
      }
      case "CredentialModified": {
        const newState = transformCredentialsFromStore([event.detail.value])
        setCredentialsFromStore(["update", newState])
        break
      }
      case "CredentialRemoved": {
        setCredentialsFromStore(["remove", [event.detail.value]])
        break
      }
      case "RemoveAllCredentials": {
        setCredentialsFromStore(["removeAll", []])
        break
      }
      case "Prefs": {
        setPrefs(event.detail.value)
        break
      }
    }
  }

  return {
    prefs,
    credentials,
  }
}
