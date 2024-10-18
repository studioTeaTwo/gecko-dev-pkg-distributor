import { useEffect, useState } from "react"
import { Credential, CredentialForPayload } from "src/custom.type"

/**
 * Send to child actor
 *
 */

function initStore() {
  window.dispatchEvent(
    new CustomEvent("AboutIdentityInit", {
      bubbles: true,
    })
  )
}

function addCredentialToStore(credential: Credential) {
  window.dispatchEvent(
    new CustomEvent("AboutIdentityCreateCredential", {
      bubbles: true,
      detail: transformToPayload(credential),
    })
  )
}

function modifyCredentialToStore(credential: Credential) {
  window.dispatchEvent(
    new CustomEvent("AboutIdentityUpdateCredential", {
      bubbles: true,
      detail: transformToPayload(credential),
    })
  )
}

function deleteCredentialToStore(credential: Credential) {
  window.dispatchEvent(
    new CustomEvent("AboutIdentityDeleteCredential", {
      bubbles: true,
      detail: transformToPayload(credential),
    })
  )
}

function removeAllCredentialsToStore() {
  window.dispatchEvent(
    new CustomEvent("AboutIdentityRemoveAllCredentials", {
      bubbles: true,
    })
  )
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
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [credentialsFromStore, setCredentialsFromStore] = useState<
    [Op, Credential[]]
  >([null, []])

  // Only do once
  useEffect(() => {
    window.addEventListener(
      "AboutIdentityChromeToContent",
      receiveFromChildActor
    )
    return () => {
      window.removeEventListener(
        "AboutIdentityChromeToContent",
        receiveFromChildActor
      )
    }
  }, [])

  useEffect(() => {
    const [op, state] = credentialsFromStore
    if (op === "update") {
      const newCredentials = credentials.map((credential) =>
        credential.guid === state[0].guid ? state[0] : credential
      )
      setCredentials(newCredentials)
    } else if (op === "remove") {
      const newCredentials = credentials.filter(
        (credential) => credential.guid !== state[0].guid
      )
      setCredentials(newCredentials)
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
    }
  }

  return {
    credentials,
    initStore,
    addCredentialToStore,
    modifyCredentialToStore,
    deleteCredentialToStore,
    removeAllCredentialsToStore,
  }
}
