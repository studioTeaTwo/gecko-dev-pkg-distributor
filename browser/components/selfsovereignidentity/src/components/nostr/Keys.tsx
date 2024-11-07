import React, { useMemo, useState } from "react"
import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Editable,
  EditableInput,
  EditablePreview,
  Flex,
  Grid,
  GridItem,
  Heading,
  Input,
  InputGroup,
  StackDivider,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react"
import useChildActorEvent, {
  dispatchEvents,
} from "../../hooks/useChildActorEvent"
import { Credential } from "../../custom.type"
import {
  decode,
  NostrTypeGuard,
  npubEncode,
  nsecEncode,
} from "nostr-tools/nip19"
import { generateSecretKey, getPublicKey } from "nostr-tools/pure"
import { bytesToHex } from "@noble/hashes/utils"
import Secret from "../shared/Secret"
import { DefaultTrustedSites } from "./NIP07"
import { promptForPrimaryPassword } from "../../shared/utils"
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword"

interface NostrCredential extends Credential {
  properties: {
    pubkey: string
    seckey: string
    displayName: string
  }
}

const NostrTemplate: NostrCredential = {
  protocolName: "nostr",
  credentialName: "nsec",
  identifier: "", // npub key
  secret: "", // nsec key
  primary: false,
  trustedSites: [],
  properties: {
    pubkey: "", // raw pubkey
    seckey: "", // raw seckey
    displayName: "",
  },
}

export default function Nostr(props) {
  const { prefs, credentials } = useChildActorEvent()
  const {
    addCredentialToStore,
    modifyCredentialToStore,
    deleteCredentialToStore,
    removeAllCredentialsToStore,
    onPrimaryChanged,
    onPrefChanged,
  } = dispatchEvents

  const [importedKey, setImportedKey] = useState("")
  const [newKey, setNewKey] = useState("")
  const [isOpenDialog, setIsOpenDialog] = useState(false)
  const [error, setError] = useState("")

  const nostrkeys = useMemo(
    () =>
      credentials
        .filter((credential) => credential.protocolName === "nostr")
        .sort((a, b) => (b.primary ? 1 : 0)) as NostrCredential[],
    [credentials]
  )

  const handleEnable = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()

    const checked = e.target.checked
    onPrefChanged({ protocolName: "nostr", enabled: checked })
  }

  const handleGenNewKey = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault()

    const seckey = generateSecretKey()
    const nseckey = nsecEncode(seckey)
    const pubkey = getPublicKey(seckey as Uint8Array)
    const npubkey = npubEncode(pubkey)

    addCredentialToStore({
      ...NostrTemplate,
      identifier: npubkey,
      secret: nseckey,
      primary: nostrkeys.length === 0,
      trustedSites: DefaultTrustedSites,
      properties: {
        displayName: npubkey,
        pubkey,
        seckey: bytesToHex(seckey),
      },
    })

    setNewKey(npubkey)

    // Notifying to the buit-in extension will be done in hooks,
    // because there is no guid yet.
  }

  const handleImportedKeyChange = (e) => setImportedKey(e.target.value)
  const handleSave = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()

    if (!NostrTypeGuard.isNSec(importedKey)) {
      alert("The typed key is not nsec!")
      return
    }
    if (nostrkeys.some((key) => key.secret === importedKey)) {
      alert("The typed key is existing!")
      return
    }

    const { data: seckey } = decode(importedKey)
    const pubkey = getPublicKey(seckey as Uint8Array)
    const npubkey = npubEncode(pubkey)

    addCredentialToStore({
      ...NostrTemplate,
      identifier: npubkey,
      secret: importedKey,
      primary: nostrkeys.length === 0,
      properties: {
        displayName: npubkey,
        pubkey,
        seckey: bytesToHex(seckey),
      },
    })

    setImportedKey("")
  }

  const handleChangePrimary = (checked, item: Credential) => {
    let newPrimaryGuid = ""

    if (checked === true) {
      // Set the current primary to false
      const prevs = nostrkeys.filter((key) => key.primary)
      for (const prev of prevs) {
        modifyCredentialToStore({
          ...prev,
          primary: false,
        })
      }
      newPrimaryGuid = item.guid
    } else {
      // Set the first of current falses to primary
      const prev = nostrkeys.find((key) => !key.primary)
      modifyCredentialToStore({
        ...prev,
        primary: true,
      })
      newPrimaryGuid = prev.guid
    }

    modifyCredentialToStore({
      ...item,
      primary: checked,
    })

    // Notify to the buit-in extension
    onPrimaryChanged({ protocolName: "nostr", guid: newPrimaryGuid })

    window.location.reload() // FIXME(ssb)
  }

  const handleDeleteCredential = (item: Credential) => {
    if (item.primary === true) {
      // Set the first of current falses to primary
      const prev = nostrkeys.find((key) => !key.primary)
      if (!prev) {
        // Notify to the buit-in extension
        onPrimaryChanged({ protocolName: "nostr", guid: "" })
      } else {
        modifyCredentialToStore({
          ...prev,
          primary: true,
        })
      }
    }

    deleteCredentialToStore(item, nostrkeys)

    window.location.reload() // FIXME(ssb)
  }

  const handleAllRemove = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault()
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-secrets-os-auth-dialog-message"
      )
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true)
        return
      }
    }
    if (!confirm("All data will be deleted. Okay?")) {
      return
    }
    removeAllCredentialsToStore()

    // Notify to the buit-in extension
    onPrimaryChanged({ protocolName: "nostr", guid: "" })
  }

  const cancelRef = React.useRef()
  const onCloseDialog = () => {
    setIsOpenDialog(false)
  }

  return (
    <>
      <VStack
        divider={<StackDivider borderColor="gray.200" />}
        spacing={4}
        align="stretch"
      >
        <Box>
          <Grid gridTemplateColumns={"100px 1fr"} gap={6}>
            <GridItem>
              <label htmlFor="nostr-pref-enabled">Enable</label>
            </GridItem>
            <GridItem>
              <Switch
                id="nostr-pref-enabled"
                isChecked={prefs.nostr.enabled}
                onChange={handleEnable}
              />
            </GridItem>
            <GridItem>
              <label>New Key</label>
            </GridItem>
            <GridItem>
              <Button
                variant="outline"
                colorScheme="blue"
                onClick={handleGenNewKey}
              >
                Generate
              </Button>
              {newKey && (
                <Text as="mark" ml="10px">
                  {newKey}
                </Text>
              )}
            </GridItem>
            <GridItem>
              <label>Import</label>
            </GridItem>
            <GridItem>
              <InputGroup>
                <Input
                  placeholder="nsec key"
                  value={importedKey}
                  onChange={handleImportedKeyChange}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSave(e)
                    }
                  }}
                  maxW="500px"
                />
                <Button
                  variant="outline"
                  colorScheme="blue"
                  onClick={handleSave}
                >
                  Save
                </Button>
              </InputGroup>
            </GridItem>
          </Grid>
        </Box>
        <Box>
          {nostrkeys.length === 0 && <p>No key is regisitered.</p>}
          <Flex gap={6} wrap="wrap">
            {nostrkeys.map((item, i) => (
              <Card maxW="md" overflow="hidden" key={i}>
                <CardHeader>
                  <Heading size="md">
                    <Editable
                      defaultValue={item.properties.displayName}
                      onSubmit={(value) =>
                        modifyCredentialToStore({
                          ...item,
                          properties: {
                            ...item.properties,
                            displayName: value,
                          },
                        })
                      }
                      isTruncated
                    >
                      <EditablePreview />
                      <EditableInput />
                    </Editable>
                  </Heading>
                </CardHeader>
                <CardBody>
                  <Box>
                    <Heading size="xs" textTransform="uppercase">
                      Nostr Public Key
                    </Heading>
                    <Text fontSize="sm" isTruncated>
                      {item.identifier}
                    </Text>
                  </Box>
                  <Box>
                    <Heading size="xs" textTransform="uppercase">
                      Nostr Secret Key
                    </Heading>
                    <Secret
                      value={item.secret}
                      onChangeVisibility={() => {}}
                      usedPrimarypasswordToSettings={
                        prefs.nostr.usedPrimarypasswordToSettings
                      }
                      textProps={{ fontSize: "sm", isTruncated: true }}
                    />
                  </Box>
                  <Box>
                    <Heading size="xs" textTransform="uppercase">
                      Raw Public Key
                    </Heading>
                    <Text fontSize="sm" isTruncated>
                      {item.properties.pubkey}
                    </Text>
                  </Box>
                  <Box>
                    <Heading size="xs" textTransform="uppercase">
                      Raw Secret Key
                    </Heading>
                    <Secret
                      value={item.properties.seckey}
                      onChangeVisibility={() => {}}
                      usedPrimarypasswordToSettings={
                        prefs.nostr.usedPrimarypasswordToSettings
                      }
                      textProps={{ fontSize: "sm", isTruncated: true }}
                    />
                  </Box>
                </CardBody>
                <CardFooter pt="0" justify="space-evenly">
                  {nostrkeys.length > 1 && (
                    <Flex gap="2">
                      <Switch
                        isChecked={item.primary}
                        onChange={(e) =>
                          handleChangePrimary(e.target.checked, item)
                        }
                        alignSelf="center"
                      />
                      {item.primary && <Text>primary now</Text>}
                    </Flex>
                  )}
                  <Button
                    variant="ghost"
                    colorScheme="blue"
                    onClick={() => handleDeleteCredential(item)}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </Flex>
        </Box>
        <Box>
          <Button variant="ghost" colorScheme="blue" onClick={handleAllRemove}>
            Reset
          </Button>
        </Box>
      </VStack>
      <AlertPrimaryPassword
        isOpen={isOpenDialog}
        onClose={onCloseDialog}
        cancelRef={cancelRef}
      />
    </>
  )
}
