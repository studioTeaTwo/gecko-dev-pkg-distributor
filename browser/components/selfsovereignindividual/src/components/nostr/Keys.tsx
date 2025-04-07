import React, { useContext, useMemo, useState } from "react";
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
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import {
  NostrCredential,
  SelfSovereignIndividualDefaultProps,
} from "../../custom.type";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import {
  BIP340,
  decodeFromNostrKey,
  encodeToNostrKey,
  NostrTypeGuard,
} from "../../shared/keys";
import Secret from "../shared/Secret";
import {
  DefaultNallowedMethod,
  DefaultTrustedSites,
  NostrTemplate,
} from "./contants";
import { promptForPrimaryPassword } from "../../shared/utils";
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword";
import { MdDeleteForever, MdEdit } from "../shared/react-icons/Icons";
import KeyEditor from "./KeyEditor";
import { changePrimary } from "../shared/functions";
import { StateContext } from "../../contexts/StatesProvider";

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
    removeAllCredentialsToStore,
    onPrimaryChanged,
    onPrefChanged,
  } = dispatchEvents;

  const [importedKey, setImportedKey] = useState("");
  const [newKey, setNewKey] = useState("");
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  // const [error, setError] = useState("");

  const nostrKeys = useMemo(
    () =>
      credentials
        .filter(credential => credential.protocolName === "nostr")
        .map(addInterpretedKeys)
        .sort((a, b) => (b.primary ? 1 : 0)) as NostrDisplayedCredential[],
    [credentials]
  );
  const defaultTrustedSites = useMemo(
    () => [
      ...DefaultTrustedSites,
      ...prefs.base.addons.map(addon => ({
        url: addon.url,
        name: addon.name,
        enabled: true,
        permissions: { nallowedMethod: DefaultNallowedMethod },
      })),
    ],
    [prefs.base.addons]
  );

  const handleEnable = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const checked = e.target.checked;
    onPrefChanged({ protocolName: "nostr", enabled: checked });
  };

  const handleGenNewKey = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();

    const seckey = BIP340.generateSecretKey();
    const pubkey = BIP340.generatePublicKey(seckey);
    const npubkey = encodeToNostrKey("npub", hexToBytes(pubkey));

    addCredentialToStore({
      ...NostrTemplate,
      identifier: npubkey,
      secret: bytesToHex(seckey),
      primary: nostrKeys.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        displayName: npubkey,
        generationMethod: "bip340",
      },
    });

    setNewKey(npubkey);

    // Notifying "PrimaryChanged" to the buit-in extension when this is the first key will be done in hooks,
    // because here is no guid yet.
  };

  const handleImportedKeyChange = e => setImportedKey(e.target.value);
  const handleSave = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
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

    const pubkey = BIP340.generatePublicKey(seckey);
    const npubkey = encodeToNostrKey("npub", hexToBytes(pubkey));

    addCredentialToStore({
      ...NostrTemplate,
      identifier: npubkey,
      secret: seckey,
      primary: nostrKeys.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        displayName: npubkey,
        generationMethod: "import",
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
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-secrets-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    changePrimary(item.guid, checked, nostrKeys);
  };

  const handleDeleteCredential = async (item: NostrDisplayedCredential) => {
    if (!confirm("The key can't be restored if no backup. Okay?")) {
      return;
    }
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-secrets-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
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

    deleteCredentialToStore(item, nostrKeys);
  };

  const handleAllRemove = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (!confirm("All data will be deleted. Okay?")) {
      return;
    }
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-secrets-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }
    removeAllCredentialsToStore();

    // Notify to the buit-in extension
    onPrimaryChanged({ protocolName: "nostr", guid: "" });
  };

  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };

  function addInterpretedKeys(item: NostrCredential): NostrDisplayedCredential {
    const rawSeckey = hexToBytes(item.secret);
    const nseckey = encodeToNostrKey("nsec", rawSeckey);
    const rawPubkey = BIP340.generatePublicKey(rawSeckey);
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
                        <Heading size="md">
                          {/* FIXME(ssb): more performable and high UX */}
                          <Editable
                            value={item.properties.displayName}
                            onChange={value =>
                              modifyCredentialToStore({
                                guid: item.guid,
                                properties: {
                                  ...item.properties,
                                  displayName: value,
                                },
                              })
                            }
                            isPreviewFocusable
                            isTruncated
                          >
                            <EditablePreview />
                            <EditableInput />
                          </Editable>
                        </Heading>
                        <HStack>
                          {item.trustedSites.some(site => site.url === "*") && (
                            <Tooltip label="All URL trusted">🚨</Tooltip>
                          )}
                        </HStack>
                      </CardHeader>
                      <CardBody>
                        <Box>
                          {/* FIXME(ssb): more performable and high UX */}
                          <Editable
                            value={item.properties.memo}
                            onChange={value =>
                              modifyCredentialToStore({
                                guid: item.guid,
                                properties: {
                                  ...item.properties,
                                  memo: value,
                                },
                              })
                            }
                            isPreviewFocusable
                            isTruncated
                          >
                            <EditablePreview />
                            <EditableInput />
                          </Editable>
                        </Box>
                        <Box mt={2}>
                          <Heading size="xs" textTransform="uppercase">
                            N Format
                          </Heading>
                          <Text fontSize="md" isTruncated>
                            {item.identifier}
                          </Text>
                          <Secret
                            value={item.nseckey}
                            onChangeVisibility={() => {}}
                            usedPrimarypasswordToSettings={
                              prefs.nostr.usedPrimarypasswordToSettings
                            }
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
                            value={item.secret}
                            onChangeVisibility={() => {}}
                            usedPrimarypasswordToSettings={
                              prefs.nostr.usedPrimarypasswordToSettings
                            }
                            textProps={{ fontSize: "md", isTruncated: true }}
                          />
                        </Box>
                        <Box>
                          <Text fontSize="sm" isTruncated>
                            {item.properties.generationMethod === "import"
                              ? "Imported"
                              : "Generated"}{" "}
                            at {new Date(item.timeCreated).toLocaleDateString()}
                            &nbsp;
                            {new Date(item.timeCreated).toLocaleTimeString()}
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
                      usedPrimarypasswordToSettings={
                        prefs.nostr.usedPrimarypasswordToSettings
                      }
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
