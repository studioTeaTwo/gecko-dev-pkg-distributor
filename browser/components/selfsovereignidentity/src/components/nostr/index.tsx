import React, { useEffect, useMemo, useState } from "react"
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
import useChildActorEvent from "../../hooks/useChildActorEvent"
import { Credential } from "../../custom.type"
import { getPublicKey, nip19 } from "nostr-tools"
import { npubEncode } from "nostr-tools/nip19"
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
  const {
    credentials,
    initStore,
    addCredentialToStore,
    modifyCredentialToStore,
    deleteCredentialToStore,
    removeAllCredentialsToStore,
  } = useChildActorEvent()

  const [nseckey, setNseckey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const nostrkeys = useMemo(
    () =>
      credentials.filter(
        (credential) => credential.protocolName === "nostr"
      ) as NostrCredential[],
    [credentials]
  )

  // on mount
  useEffect(() => {
    setLoading(true)
    initStore()
    setLoading(false)
  }, [])

  const handleNewKeyChange = (e) => setNseckey(e.target.value)

  const handleSave = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()

    if (!nip19.NostrTypeGuard.isNSec(nseckey)) {
      alert("The typed key is not nsec!")
      return
    }
    if (nostrkeys.some((key) => key.secret === nseckey)) {
      alert("The typed key is existing!")
      return
    }

    const { data: seckey } = nip19.decode(nseckey)
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
          <FormControl>
            <FormLabel>New Key</FormLabel>
            <InputGroup>
              <Input
                placeholder="nsec key"
                value={nseckey}
                onChange={handleNewKeyChange}
                maxW="500px"
              />
              <Button variant="outline" colorScheme="blue" onClick={handleSave}>
                Save
              </Button>
            </InputGroup>
            <FormHelperText>
              Your key will be stored in local separated from web apps.
            </FormHelperText>
          </FormControl>
        </Box>
        <Box>
          {nostrkeys.length === 0 && <p>No key is regisitered.</p>}
          <Grid templateColumns="repeat(4, 1fr)" gap={6}>
            {nostrkeys.map((item, i) => (
              <GridItem key={i}>
                <Card>
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
                    <Flex gap="2">
                      <Switch
                        isChecked={item.primary}
                        onChange={(e) =>
                          modifyCredentialToStore({
                            ...item,
                            primary: e.target.checked,
                          })
                        }
                        alignSelf="center"
                      />
                      {item.primary && <Text>primary now</Text>}
                    </Flex>
                    <Button
                      variant="ghost"
                      colorScheme="blue"
                      onClick={() => deleteCredentialToStore(item)}
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
