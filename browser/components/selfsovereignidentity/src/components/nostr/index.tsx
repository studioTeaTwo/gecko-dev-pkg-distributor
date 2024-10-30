import React, { useCallback, useEffect, useMemo, useState } from "react"
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
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  Input,
  InputGroup,
  Spinner,
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
  properties: {
    pubkey: "", // raw pubkey
    seckey: "", // raw seckey
    displayName: "",
  },
}

export default function Nostr(props) {
  const { credentials } = useChildActorEvent()
  const {
    initStore,
    addCredentialToStore,
    modifyCredentialToStore,
    deleteCredentialToStore,
    removeAllCredentialsToStore,
    onPrimaryChanged,
  } = dispatchEvents

  const [nseckey, setNseckey] = useState("")
  const [newKey, setNewKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const nostrkeys = useMemo(
    () =>
      credentials
        .filter((credential) => credential.protocolName === "nostr")
        .sort((a, b) => (b.primary ? -1 : 0)) as NostrCredential[],
    [credentials]
  )

  // on mount
  useEffect(() => {
    setLoading(true)
    initStore()
    setLoading(false)
  }, [])

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
      properties: {
        displayName: npubkey,
        pubkey,
        seckey: bytesToHex(seckey),
      },
    })

    setNewKey(npubkey)
  }

  const handleNewKeyChange = (e) => setNseckey(e.target.value)
  const handleSave = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()

    if (!NostrTypeGuard.isNSec(nseckey)) {
      alert("The typed key is not nsec!")
      return
    }
    if (nostrkeys.some((key) => key.secret === nseckey)) {
      alert("The typed key is existing!")
      return
    }

    const { data: seckey } = decode(nseckey)
    const pubkey = getPublicKey(seckey as Uint8Array)
    const npubkey = npubEncode(pubkey)

    addCredentialToStore({
      ...NostrTemplate,
      identifier: npubkey,
      secret: nseckey,
      primary: nostrkeys.length === 0,
      properties: {
        displayName: npubkey,
        pubkey,
        seckey: bytesToHex(seckey),
      },
    })

    setNseckey("")
  }

  const handleChangePrimary = useCallback(
    (checked, item: Credential) => {
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
        // Set the first of the current false to primary
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

      // Notiry to the buit-in extension
      onPrimaryChanged({ protocolName: "nostr", guid: newPrimaryGuid })

      window.location.reload() // FIXME(ssb)
    },
    [nostrkeys]
  )

  const handleAllRemove = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault()
    if (!confirm("All data will be deleted. Okay?")) {
      return
    }
    removeAllCredentialsToStore()
  }

  return (
    <div>
      <h2>NIP-07</h2>
      <VStack
        divider={<StackDivider borderColor="gray.200" />}
        spacing={4}
        align="stretch"
      >
        {loading && <Spinner size="xl" />}
        <Box>
          <VStack>
            <FormControl>
              <FormLabel>New Key</FormLabel>
              <Button
                variant="outline"
                colorScheme="blue"
                onClick={handleGenNewKey}
              >
                Generate
              </Button>
            </FormControl>
            {newKey && <Text>{`New Key: ${newKey}`}</Text>}
            <FormControl>
              <FormLabel>Import</FormLabel>
              <InputGroup>
                <Input
                  placeholder="nsec key"
                  value={nseckey}
                  onChange={handleNewKeyChange}
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
              <FormHelperText>
                Your key will be stored in local separated from web apps.
              </FormHelperText>
            </FormControl>
          </VStack>
        </Box>
        <Box>
          {nostrkeys.length === 0 && <p>No key is regisitered.</p>}
          <Grid templateColumns="repeat(4, 1fr)" gap={6}>
            {nostrkeys.map((item, i) => (
              <GridItem key={i} overflow="hidden">
                <Card maxW="500px">
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
                      <Text fontSize="sm">{item.identifier}</Text>
                    </Box>
                    <Box>
                      <Heading size="xs" textTransform="uppercase">
                        Nostr Secret Key
                      </Heading>
                      <Secret
                        value={item.secret}
                        onChangeVisibility={() => {}}
                        textProps={{ fontSize: "sm" }}
                      />
                    </Box>
                    <Box>
                      <Heading size="xs" textTransform="uppercase">
                        Raw Public Key
                      </Heading>
                      <Text fontSize="sm">{item.properties.pubkey}</Text>
                    </Box>
                    <Box>
                      <Heading size="xs" textTransform="uppercase">
                        Raw Secret Key
                      </Heading>
                      <Secret
                        value={item.properties.seckey}
                        onChangeVisibility={() => {}}
                        textProps={{ fontSize: "sm" }}
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
                      onClick={() => deleteCredentialToStore(item, nostrkeys)}
                    >
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              </GridItem>
            ))}
          </Grid>
        </Box>
        <Box>
          <Button variant="ghost" colorScheme="blue" onClick={handleAllRemove}>
            Reset
          </Button>
        </Box>
      </VStack>
    </div>
  )
}
