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
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import {
  BitcoinCredential,
  SelfSovereignIndividualDefaultProps,
} from "../../custom.type";
import Secret from "../shared/Secret";
import {
  authorizePrimaryPassword,
  generateSecretOnToolkit,
} from "../shared/ipc";
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword";
import { MdDeleteForever, MdEdit } from "../shared/react-icons/Icons";
import { changePrimary } from "../shared/functions";
import { StateContext } from "../../contexts/StatesProvider";
import {
  DefaultTrustedSites,
  DefaultNallowedMethods,
} from "../shared/contants";
import { BitcoinTemplate } from "./contants";

interface BitcoinDisplayedCredential extends BitcoinCredential {
  nseckey: string;
  rawPubkey: string;
}

export default function Bitcoin(props: SelfSovereignIndividualDefaultProps) {
  const { prefs, credentials } = props;
  const { states, resetState, updateState } = useContext(StateContext);
  const {
    addCredentialToStore,
    modifyCredentialToStore,
    deleteCredentialToStore,
    removeAllCredentialsToStore,
    onPrimaryChanged,
  } = dispatchEvents;

  const [importedKey, setImportedSeed] = useState("");
  const [newSeed, setNewSeed] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  // const [error, setError] = useState("");

  const mnemonics = useMemo(
    () =>
      credentials.filter(
        credential => credential.credentialName === "bip39"
      ) as BitcoinDisplayedCredential[],
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

  const handlePassphraseChange = e => setPassphrase(e.target.value);
  const handleGenNewSeed = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();

    const { mnemonic, xpub, xpriv } = await generateSecretOnToolkit(
      "bitcoin",
      "bip39",
      { passphrase: passphrase }
    );
    console.log("seed", mnemonic, xpub, xpriv);

    addCredentialToStore({
      ...BitcoinTemplate,
      identifier: xpub,
      secret: mnemonic,
      primary: mnemonics.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        passphrase: passphrase,
        xpriv,
        displayName: xpub,
        generationMethod: "new",
        generationFrom: "about",
        memo: "",
      },
    });

    setNewSeed(xpub);

    // Notifying "PrimaryChanged" to the buit-in extension when this is the first key will be done in hooks,
    // because here is no guid yet.
  };

  const handleImportedKeyChange = e => setImportedSeed(e.target.value);
  const handleImportedKeySave = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();

    const mnemonic = importedKey;
    console.log("mnemonic", mnemonic);
    const result = await generateSecretOnToolkit("bitcoin", "bip39", {
      import: true,
      mnemonic,
      passphrase: passphrase,
    });
    if (!result[0]) {
      alert("Invalid!");
      return;
    }

    addCredentialToStore({
      ...BitcoinTemplate,
      identifier: result[1].xpub,
      secret: mnemonic,
      primary: mnemonics.length === 0,
      trustedSites: defaultTrustedSites,
      properties: {
        passphrase: passphrase,
        xpriv: result[1].xpriv,
        displayName: result[1].xpub,
        generationMethod: "new",
        generationFrom: "about",
        memo: "",
      },
    });

    setImportedSeed("");

    // Notifying "PrimaryChanged" to the buit-in extension when this is the first key will be done in hooks,
    // because here is no guid yet.
  };

  const handleChangePrimary = async (
    checked,
    item: BitcoinDisplayedCredential
  ) => {
    const isAuthorized = await authorizePrimaryPassword(
      "bitcoin",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }

    changePrimary(item.guid, checked, mnemonics);
  };

  const handleDeleteCredential = async (item: BitcoinDisplayedCredential) => {
    if (!confirm("The key can't be restored if no backup. Okay?")) {
      return;
    }
    const isAuthorized = await authorizePrimaryPassword(
      "bitcoin",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }

    if (item.primary === true) {
      // Set the first of current falses to primary
      const prev = mnemonics.find(key => !key.primary);
      if (prev) {
        modifyCredentialToStore({
          guid: prev.guid,
          primary: true,
        });
      }
      // Notify to the buit-in extension
      onPrimaryChanged({
        protocolName: "bitcoin",
        guid: prev ? prev.guid : "",
      });
    }

    deleteCredentialToStore(item, mnemonics);
  };

  const handleAllRemove = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (!confirm("All data will be deleted. Okay?")) {
      return;
    }
    const isAuthorized = await authorizePrimaryPassword(
      "bitcoin",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }

    removeAllCredentialsToStore();

    // Notify to the buit-in extension
    onPrimaryChanged({ protocolName: "bitcoin", guid: "" });
  };

  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };

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
              <label>New Seed</label>
            </GridItem>
            <GridItem>
              <InputGroup>
                <Input
                  placeholder="optional passphrase"
                  value={passphrase}
                  onChange={handlePassphraseChange}
                  maxW="200px"
                />
                <Button
                  variant="outline"
                  colorScheme="blue"
                  onClick={handleGenNewSeed}
                >
                  Generate
                </Button>
              </InputGroup>
              {newSeed && (
                <Text as="mark" ml="10px">
                  {newSeed}
                </Text>
              )}
            </GridItem>
            <GridItem>
              <label>Import</label>
            </GridItem>
            <GridItem>
              <InputGroup>
                <Input
                  placeholder="mnemonic words"
                  value={importedKey}
                  onChange={handleImportedKeyChange}
                  onKeyPress={e => {
                    if (e.key === "Enter") {
                      handleImportedKeySave(e);
                    }
                  }}
                  maxW="500px"
                />
                <Input
                  placeholder="optional passphrase"
                  value={passphrase}
                  onChange={handlePassphraseChange}
                  maxW="200px"
                />
                <Button
                  variant="outline"
                  colorScheme="blue"
                  onClick={handleImportedKeySave}
                >
                  Save
                </Button>
              </InputGroup>
            </GridItem>
          </Grid>
        </Box>
        <Box>
          {mnemonics.length === 0 && (
            <Text fontSize="sm">No key registered</Text>
          )}
          <Flex gap={6} wrap="wrap">
            {mnemonics.map((item, i) => {
              return (
                <>
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
                          <Tooltip label="All URL trusted">🚨</Tooltip>
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
                          X Format
                        </Heading>
                        <Text fontSize="md" isTruncated>
                          {item.identifier}
                        </Text>
                        <Secret
                          value={item.properties.xpriv}
                          onChangeVisibility={() => {}}
                          prefs={prefs}
                          textProps={{ fontSize: "md", isTruncated: true }}
                        />
                      </Box>
                      <Box mt={2}>
                        <Heading size="xs" textTransform="uppercase">
                          mnemonic
                        </Heading>
                        <Secret
                          value={item.secret}
                          onChangeVisibility={() => {}}
                          prefs={prefs}
                          textProps={{
                            fontSize: "md",
                            overflowWrap: "anywhere",
                          }}
                        />
                      </Box>
                      <Box mt={2}>
                        <Heading size="xs" textTransform="uppercase">
                          passphrase
                        </Heading>
                        {item.properties.passphrase ? (
                          <Secret
                            value={item.properties.passphrase}
                            onChangeVisibility={() => {}}
                            prefs={prefs}
                            textProps={{
                              fontSize: "md",
                              overflowWrap: "anywhere",
                            }}
                          />
                        ) : (
                          "none"
                        )}
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
                      {mnemonics.length > 1 && (
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
                        onClick={() => updateState("bitcoin", { editingNo: i })}
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
