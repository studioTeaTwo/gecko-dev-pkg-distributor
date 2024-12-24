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
import { dispatchEvents } from "../../hooks/useChildActorEvent"
import {
  Credential,
  SelfsovereignidentityDefaultProps,
} from "../../custom.type"
import { bytesToHex, hexToBytes } from "@noble/hashes/utils"
import {
  BIP340,
  decodeFromNostrKey,
  encodeToNostrKey,
  NostrTypeGuard,
} from "../../shared/keys"
import Secret from "../shared/Secret"
import { DefaultTrustedSites } from "./NIP07"
import { promptForPrimaryPassword } from "../../shared/utils"
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword"

interface NostrCredential extends Credential {
  properties: {
    displayName: string
  }
}
interface NostrDisplayedCredential extends NostrCredential {
  nseckey: string
  rawPubkey: string
}

const NostrTemplate: NostrCredential = {
  protocolName: "nostr",
  credentialName: "nsec",
  identifier: "", // npubkey
  secret: "", // raw seckey
  primary: false,
  trustedSites: [],
  properties: {
    displayName: "",
  },
}

export default function Nostr(props: SelfsovereignidentityDefaultProps) {
  const { prefs, credentials } = props
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

    const seckey = BIP340.generateSecretKey()
    const pubkey = BIP340.generatePublicKey(seckey)
    const npubkey = encodeToNostrKey("npub", hexToBytes(pubkey))

    addCredentialToStore({
      ...NostrTemplate,
      identifier: npubkey,
      secret: bytesToHex(seckey),
      primary: nostrkeys.length === 0,
      trustedSites: DefaultTrustedSites,
      properties: {
        displayName: npubkey,
      },
    })

    setNewKey(npubkey)

    // Notifying "PrimaryChanged" to the buit-in extension when this is the first key will be done in hooks,
    // because here is no guid yet.
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

    const { data: seckey } = decodeFromNostrKey(importedKey)
    const pubkey = BIP340.generatePublicKey(seckey)
    const npubkey = encodeToNostrKey("npub", hexToBytes(pubkey))

    addCredentialToStore({
      ...NostrTemplate,
      identifier: npubkey,
      secret: bytesToHex(seckey as Uint8Array),
      primary: nostrkeys.length === 0,
      properties: {
        displayName: npubkey,
      },
    })

    setImportedKey("")

    // Notifying "PrimaryChanged" to the buit-in extension when this is the first key will be done in hooks,
    // because here is no guid yet.
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
      if (prev) {
        modifyCredentialToStore({
          ...prev,
          primary: true,
        })
        newPrimaryGuid = prev.guid
      }
    }

    modifyCredentialToStore({
      ...item,
      primary: checked,
    })

    // Notify to the buit-in extension
    onPrimaryChanged({ protocolName: "nostr", guid: newPrimaryGuid })
  }

  const handleDeleteCredential = async (item: Credential) => {
    if (!confirm("The key can't be restored if no backup. Okay?")) {
      return
    }
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-secrets-os-auth-dialog-message"
      )
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true)
        return
      }
    }

    if (item.primary === true) {
      // Set the first of current falses to primary
      const prev = nostrkeys.find((key) => !key.primary)
      if (prev) {
        modifyCredentialToStore({
          ...prev,
          primary: true,
        })
      }
      // Notify to the buit-in extension
      onPrimaryChanged({ protocolName: "nostr", guid: prev ? prev.guid : "" })
    }

    deleteCredentialToStore(item, nostrkeys)
  }

  const handleAllRemove = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault()
    if (!confirm("All data will be deleted. Okay?")) {
      return
    }
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-secrets-os-auth-dialog-message"
      )
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true)
        return
      }
    }
    removeAllCredentialsToStore()

    // Notify to the buit-in extension
    onPrimaryChanged({ protocolName: "nostr", guid: "" })
  }

  const cancelRef = React.useRef()
  const onCloseDialog = () => {
    setIsOpenDialog(false)
  }

  function addInterpretedKeys(item: NostrCredential): NostrDisplayedCredential {
    const rawSeckey = hexToBytes(item.secret)
    const nseckey = encodeToNostrKey("nsec", rawSeckey)
    const rawPubkey = BIP340.generatePublicKey(rawSeckey)
    return { ...item, nseckey, rawPubkey }
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
            {nostrkeys.map(addInterpretedKeys).map((item, i) => (
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
                      value={item.nseckey}
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
                      {item.rawPubkey}
                    </Text>
                  </Box>
                  <Box>
                    <Heading size="xs" textTransform="uppercase">
                      Raw Secret Key
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
