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
  HStack,
  Input,
  InputGroup,
  Spinner,
  StackDivider,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
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
import { promptForPrimaryPassword } from "../../shared/utils"

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
const SafeProtocols = ["http", "moz-extension"]
const DefaultTrustedSites = [
  {
    url: "http://localhost",
    permissions: { read: true, write: true, admin: true },
  },
]

export default function Nostr(props) {
  const { prefs, credentials } = useChildActorEvent()
  const {
    initStore,
    addCredentialToStore,
    modifyCredentialToStore,
    deleteCredentialToStore,
    removeAllCredentialsToStore,
    onPrimaryChanged,
    onPrefChanged,
  } = dispatchEvents

  const [importedKey, setImportedKey] = useState("")
  const [newKey, setNewKey] = useState("")
  const [newSite, setNewSite] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const nostrkeys = useMemo(
    () =>
      credentials
        .filter((credential) => credential.protocolName === "nostr")
        .sort((a, b) => (b.primary ? 1 : 0)) as NostrCredential[],
    [credentials]
  )

  // on mount
  useEffect(() => {
    setLoading(true)
    initStore()
    setLoading(false)
  }, [])

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

  const handleTrust = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()

    const checked = e.target.checked
    onPrefChanged({ protocolName: "nostr", trusted: checked })
  }

  const handleNewSiteChange = (e) => setNewSite(e.target.value)
  const handleRegistSite = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault()
    if (!SafeProtocols.some((protocol) => newSite.startsWith(protocol))) {
      alert(`Currently, only supports ${SafeProtocols.join(",")}.`)
      return
    }
    // FIXME(ssb): improve the match method, such as supporting glob.
    const found = nostrkeys.some((site) =>
      site.trustedSites.some((site) => site.url === newSite)
    )
    if (found) {
      alert("The url exists already.")
      return
    }
    const primaryPasswordAuth = await promptForPrimaryPassword(
      "about-selfsovereignidentity-regist-trustedsite-os-auth-dialog-message"
    )
    if (!primaryPasswordAuth) {
      alert("sorry!")
      return
    }

    for (const item of nostrkeys) {
      modifyCredentialToStore({
        ...item,
        trustedSites: item.trustedSites.concat([
          {
            url: newSite,
            permissions: {
              read: true,
              write: true,
              admin: true,
            },
          },
        ]),
      })
    }
  }

  const handleRemoveSite = (removedSite) => {
    for (const item of nostrkeys) {
      modifyCredentialToStore({
        ...item,
        trustedSites: item.trustedSites.filter(
          (site) => site.url !== removedSite.url
        ),
      })
    }
  }

  const getTrustedSites = useCallback(() => {
    const trustedSites = Array.from(
      new Set(nostrkeys.map((key) => key.trustedSites).flat())
    )
    return (
      <>
        {trustedSites.map((site) => (
          <>
            <GridItem>
              <Heading as="h5" size="sm">
                {site.url}
              </Heading>
            </GridItem>
            <GridItem>
              <Button
                variant="outline"
                colorScheme="blue"
                onClick={() => handleRemoveSite(site)}
              >
                remove
              </Button>
            </GridItem>
          </>
        ))}
      </>
    )
  }, [nostrkeys])

  return (
    <div>
      <Heading as="h2">NIP-07</Heading>
      <p>
        Your key will be stored in local, where separated and not been able to
        accessed from web apps.
      </p>
      <Tabs variant="enclosed">
        <TabList>
          <Tab>General</Tab>
          <Tab>Trusted Sites</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <VStack
              divider={<StackDivider borderColor="gray.200" />}
              spacing={4}
              align="stretch"
            >
              {loading && <Spinner size="xl" />}
              <Box>
                <Grid gridTemplateColumns={"100px 1fr"} gap={6}>
                  <GridItem>
                    <label htmlFor="enable-nostr">Enable</label>
                  </GridItem>
                  <GridItem>
                    <Switch
                      id="enable-nostr"
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
                    {newKey && <Text as="mark">{newKey}</Text>}
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
                          onClick={() =>
                            deleteCredentialToStore(item, nostrkeys)
                          }
                        >
                          Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </Flex>
              </Box>
              <Box>
                <Button
                  variant="ghost"
                  colorScheme="blue"
                  onClick={handleAllRemove}
                >
                  Reset
                </Button>
              </Box>
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack
              divider={<StackDivider borderColor="gray.200" />}
              spacing={4}
              align="stretch"
            >
              <HStack>
                <Grid gridTemplateColumns={"100px 1fr"} gap={6}>
                  <GridItem>
                    <label htmlFor="trust-nostr">Enable</label>
                  </GridItem>
                  <GridItem>
                    <Switch
                      id="trust-nostr"
                      isChecked={prefs.nostr.trusted}
                      onChange={handleTrust}
                    />
                  </GridItem>
                  <GridItem>
                    <label>Register</label>
                  </GridItem>
                  <GridItem>
                    <InputGroup>
                      <Input
                        placeholder="https://example/"
                        value={newSite}
                        onChange={handleNewSiteChange}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleRegistSite(e)
                          }
                        }}
                        maxW="500px"
                      />
                      <Button
                        variant="outline"
                        colorScheme="blue"
                        onClick={handleRegistSite}
                      >
                        Regist
                      </Button>
                    </InputGroup>
                  </GridItem>
                </Grid>
              </HStack>
              <Box>
                <Grid gridTemplateColumns={"1fr 100px"} gap={6}>
                  {getTrustedSites()}
                </Grid>
              </Box>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
