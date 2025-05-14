import React, { useContext, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Input,
  InputGroup,
  StackDivider,
  Switch,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import {
  NostrCredential,
  SelfSovereignIndividualDefaultProps,
} from "../../custom.type";
import {
  decodeFromNostrKey,
  encodeToNostrKey,
  NostrTypeGuard,
} from "../shared/keys";
import Secret from "../shared/Secret";
import { NostrTemplate } from "./constants";
import {
  authorizePrimaryPassword,
  generateSecretOnToolkit,
} from "../shared/ipc";
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword";
import { MdDeleteForever, MdEdit } from "../shared/react-icons/Icons";
import KeyEditor from "./KeyEditor";
import { changePrimary } from "../shared/functions";
import { StateContext } from "../../contexts/StatesProvider";
import {
  DefaultNallowedMethods,
  DefaultTrustedSites,
} from "../shared/constants";

interface NostrDisplayedCredential extends NostrCredential {
  nseckey: string;
  rawPubkey: string;
}

export default function Nostr(props: SelfSovereignIndividualDefaultProps) {
  const { prefs, credentials } = props;
  const { states, resetState, updateState } = useContext(StateContext);
  const {
    addCredentialToStore,
    modifyCredentialToStore,
    deleteCredentialToStore,
    onPrimaryChanged,
  } = dispatchEvents;

  const [importedKey, setImportedKey] = useState("");
  const [newKey, setNewKey] = useState("");
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  // const [error, setError] = useState("");

  const nostrKeys = useMemo(
    () =>
      credentials
        .filter(credential => credential.credentialName === "nsec")
        .map(addInterpretedKeys) as NostrDisplayedCredential[],
    [credentials]
  );
  const defaultTrustedSites = useMemo(
    () => [
      ...DefaultTrustedSites,
      ...prefs.base.addons.map(addon => ({
        url: addon.url,
        name: addon.name,
        enabled: true,
        permissions: { nallowedMethod: DefaultNallowedMethods },
      })),
    ],
    [prefs.base.addons]
  );

  const handleGenNewKey = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();

    const [, seckey] = generateSecretOnToolkit("nostr", "nsec");
    const [, pubkey] = generateSecretOnToolkit("nostr", "npub", {
      secretKey: seckey,
    });
    const npubkey = encodeToNostrKey("npub", hexToBytes(pubkey));

    addCredentialToStore({
      ...NostrTemplate,
      identifier: npubkey,
      secret: bytesToHex(seckey),
      primary: nostrKeys.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        ...NostrTemplate.properties,
        displayName: npubkey,
        generationMethod: "bip340",
        generationFrom: location.href,
        sharing: [],
      },
    });

    setNewKey(npubkey);

    // Notifying "PrimaryChanged" to the buit-in extension when this is the first key will be done in hooks,
    // because here is no guid yet.
  };

  const handleImportedKeyChange = e => setImportedKey(e.target.value);
  const handleSave = async (
    e:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();

    let nseckey = importedKey;
    if (!NostrTypeGuard.isNSec(nseckey)) {
      try {
        const rawSeckey = hexToBytes(nseckey);
        nseckey = encodeToNostrKey("nsec", rawSeckey);
        if (!NostrTypeGuard.isNSec(nseckey)) {
          alert("The typed key is not nsec!");
          return;
        }
      } catch (e) {
        alert("The typed key is not nsec!");
        return;
      }
    }

    const { data: rawSeckey } = decodeFromNostrKey(nseckey);
    const seckey = bytesToHex(rawSeckey as Uint8Array);
    if (nostrKeys.some(key => key.secret === seckey)) {
      alert("The typed key is existing!");
      return;
    }

    const [, pubkey] = generateSecretOnToolkit("nostr", "npub", {
      secretKey: seckey,
    });
    const npubkey = encodeToNostrKey("npub", hexToBytes(pubkey));

    addCredentialToStore({
      ...NostrTemplate,
      identifier: npubkey,
      secret: seckey,
      primary: nostrKeys.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        ...NostrTemplate.properties,
        displayName: npubkey,
        generationMethod: "import",
        generationFrom: location.href,
        sharing: [],
      },
    });

    setImportedKey("");

    // Notifying "PrimaryChanged" to the buit-in extension when this is the first key will be done in hooks,
    // because here is no guid yet.
  };

  const handleChangePrimary = async (
    checked,
    item: NostrDisplayedCredential
  ) => {
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

  const handleDeleteCredential = async (item: NostrDisplayedCredential) => {
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
      // Set the first of current falses to primary
      const prev = nostrKeys.find(key => !key.primary);
      if (prev) {
        modifyCredentialToStore({
          guid: prev.guid,
          primary: true,
        });
      }
      // Notify to the buit-in extension
      onPrimaryChanged({ protocolName: "nostr", guid: prev ? prev.guid : "" });
    }

    deleteCredentialToStore(item);
  };

  const handleAllRemove = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
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
      deleteCredentialToStore(credential);
    }

    // Notify to the buit-in extension
    onPrimaryChanged({ protocolName: "nostr", guid: "" });

    // FIXME(ssb)
    location.reload();
  };

  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };

  function addInterpretedKeys(item: NostrCredential): NostrDisplayedCredential {
    const rawSeckey = hexToBytes(item.secret);
    const nseckey = encodeToNostrKey("nsec", rawSeckey);
    const [, rawPubkey] = generateSecretOnToolkit("nostr", "npub", {
      secretKey: rawSeckey,
    });
    return { ...item, nseckey, rawPubkey };
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
                  placeholder="nsec or hex secret key"
                  value={importedKey}
                  onChange={handleImportedKeyChange}
                  onKeyPress={e => {
                    if (e.key === "Enter") {
                      handleSave(e);
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
          {nostrKeys.length === 0 && (
            <Text fontSize="sm">No key registered</Text>
          )}
          <Flex gap={6} wrap="wrap">
            {nostrKeys.map((item, i) => {
              return (
                <>
                  {states.nostr.editingNo !== i ? (
                    <Card maxW="md" overflow="hidden" key={i}>
                      <CardHeader pb="0">
                        <Heading size="md" isTruncated>
                          <div
                            contentEditable
                            onBlur={e => {
                              e.preventDefault();
                              modifyCredentialToStore({
                                guid: item.guid,
                                properties: {
                                  ...item.properties,
                                  displayName: e.target.textContent,
                                },
                              });
                            }}
                          >
                            {item.properties.displayName}
                          </div>
                        </Heading>
                        <HStack>
                          {item.trustedSites.some(site => site.url === "*") && (
                            <Tooltip label="All URL Trusted">🚨</Tooltip>
                          )}
                          {item.properties.generationMethod === "bip32" && (
                            <Tooltip label="Mnemonic Derived">🗒️</Tooltip>
                          )}
                        </HStack>
                      </CardHeader>
                      <CardBody>
                        <Box>
                          <Text fontSize="md" isTruncated>
                            <div
                              contentEditable
                              onBlur={e => {
                                e.preventDefault();
                                modifyCredentialToStore({
                                  guid: item.guid,
                                  properties: {
                                    ...item.properties,
                                    memo: e.target.textContent,
                                  },
                                });
                              }}
                            >
                              {item.properties.memo}
                            </div>
                          </Text>
                        </Box>
                        <Box mt={2}>
                          <Heading size="xs" textTransform="uppercase">
                            N Format
                          </Heading>
                          <Text fontSize="md" isTruncated>
                            {item.identifier}
                          </Text>
                          <Secret
                            protocolName={item.protocolName}
                            value={item.nseckey}
                            onChangeVisibility={() => {}}
                            prefs={prefs}
                            textProps={{ fontSize: "md", isTruncated: true }}
                          />
                        </Box>
                        <Box mt={2}>
                          <Heading size="xs" textTransform="uppercase">
                            Hex Format
                          </Heading>
                          <Text fontSize="md" isTruncated>
                            {item.rawPubkey}
                          </Text>
                          <Secret
                            protocolName={item.protocolName}
                            value={item.secret}
                            onChangeVisibility={() => {}}
                            prefs={prefs}
                            textProps={{ fontSize: "md", isTruncated: true }}
                          />
                        </Box>
                        <Box>
                          <Text fontSize="sm">
                            {item.properties.generationMethod === "import"
                              ? "Imported"
                              : "Generated"}{" "}
                            on {new Date(item.timeCreated).toLocaleDateString()}
                            &nbsp;
                            {new Date(item.timeCreated).toLocaleTimeString()}
                            <br />
                            at {item.properties.generationFrom}
                          </Text>
                        </Box>
                      </CardBody>
                      <CardFooter pt="0" justify="space-evenly">
                        {nostrKeys.length > 1 && (
                          <Flex gap="2">
                            <Switch
                              isChecked={item.primary}
                              onChange={e =>
                                handleChangePrimary(e.target.checked, item)
                              }
                              alignSelf="center"
                            />
                            {item.primary && <Text>primary now</Text>}
                          </Flex>
                        )}
                        <IconButton
                          icon={<MdEdit />}
                          variant="transparent"
                          fontSize="20px"
                          aria-label="Edit Key"
                          onClick={() => updateState("nostr", { editingNo: i })}
                        />
                        <IconButton
                          icon={<MdDeleteForever />}
                          variant="transparent"
                          fontSize="20px"
                          aria-label="Delete Key"
                          onClick={() => handleDeleteCredential(item)}
                        />
                      </CardFooter>
                    </Card>
                  ) : (
                    <KeyEditor
                      credential={nostrKeys[states.nostr.editingNo]}
                      nostrKeys={nostrKeys}
                      prefs={prefs}
                      goBack={() => resetState()}
                    ></KeyEditor>
                  )}
                </>
              );
            })}
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
  );
}
