import React, { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardHeader,
  Heading,
  Editable,
  EditablePreview,
  EditableInput,
  CardBody,
  Box,
  CardFooter,
  Text,
  IconButton,
  Button,
  GridItem,
  VStack,
  StackDivider,
  Input,
  InputGroup,
  useEditableControls,
  HStack,
  Textarea,
  Switch,
  Icon,
  Tooltip,
  Checkbox,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import {
  MdEdit,
  MdSaveAlt,
  MdOutlineCancel,
  MdOutlineTimerOff,
} from "../shared/react-icons/Icons";
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import {
  NostrCredential,
  SelfSovereignIndividualPrefs,
} from "../../custom.type";
import { authorizePrimaryPassword } from "../shared/utils";
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword";
import {
  DefaultExcludedKinds,
  DefaultNallowedMethods,
  SafeProtocols,
  SpecialCards,
  DialogDisplayOptions,
  DefaultDialogDisplayOptions,
  NallowedMethods,
  EveryTimeAuthorizedMethods,
} from "./contants";
import {
  ExampleNostrKind,
  ExampleUrlMatch,
  ExplainDialogDisplayOption,
  ExplainEveryTimeAuthorizedMethod,
  ExplainNallowedMethod,
} from "../shared/Examples";
import { changePrimary } from "../shared/functions";

interface Props {
  credential: NostrCredential;
  nostrKeys: NostrCredential[];
  prefs: SelfSovereignIndividualPrefs;
  goBack: (direction?: unknown) => void;
}

export default function KeyEditor(props: Props) {
  const { credential, nostrKeys, prefs } = props;
  const { modifyCredentialToStore } = dispatchEvents;

  const [editingKey, setEditingKey] = useState<Props["credential"]>(null);
  const [newSite, setNewSite] = useState("");
  const [newExtensions, setNewExtensions] = useState([]);
  const [editingNumForTrusted, setEditingNumForTrusted] = useState(-1);
  const [editingNumForPassword, setEditingNumForPassword] = useState(-1);
  const [isOpenDialog, setIsOpenDialog] = useState(false);

  useEffect(() => {
    setEditingKey(JSON.parse(JSON.stringify(credential)));
  }, []);

  const handleSave = async () => {
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }

    modifyCredentialToStore(editingKey, {
      newExtensionForTrustedSite: newExtensions,
    });
    if (credential.primary !== editingKey.primary) {
      changePrimary(editingKey.guid, editingKey.primary, nostrKeys);
    }

    props.goBack();
  };
  const handleGoBack = async () => {
    if (JSON.stringify(editingKey) !== JSON.stringify(credential)) {
      const result = window.confirm(
        "Not yet saved. Do you really want to leave?"
      );
      if (!result) {
        return;
      }
    }

    setEditingKey(credential);
    props.goBack();
  };

  const HandleChangeValue = (
    newKV: Partial<{ [key in keyof NostrCredential]: NostrCredential[key] }>
  ) => {
    setEditingKey(prev => ({ ...prev, ...newKV }));
  };

  const handleNewSiteChange = e => setNewSite(e.target.value);
  const handleRegisterSite = async (
    e:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();

    handleReRegister(newSite);
  };
  const handleReRegister = (
    url: NostrCredential["trustedSites"][number]["url"]
  ) => {
    if (
      !SafeProtocols.some(protocol => url.startsWith(protocol)) &&
      !SpecialCards.includes(url)
    ) {
      alert(`Currently, only supports ${SafeProtocols.join(",")}.`);
      return;
    }
    const existing = editingKey.trustedSites.some(
      site => site.url === url && site.enabled
    );
    if (existing) {
      alert("The url exists already.");
      return;
    }

    const value = editingKey.trustedSites.some(site => site.url === url)
      ? editingKey.trustedSites.map(site => {
          if (site.url === url) {
            site.enabled = true;
          }
          return site;
        })
      : editingKey.trustedSites.concat([
          {
            url: url,
            name: url !== "*" ? "" : "<all_urls>",
            enabled: true,
            permissions: { nallowedMethod: DefaultNallowedMethods },
          },
        ]);
    HandleChangeValue({ trustedSites: value });
    if (url.startsWith("moz-extension")) {
      setNewExtensions(prev => prev.concat([url]));
    }
  };

  const handleRemoveSite = (
    removedSite: NostrCredential["trustedSites"][number]
  ) => {
    const value = {
      trustedSites: editingKey.trustedSites.map(site => {
        if (site.url === removedSite.url) {
          site.enabled = false;
        }
        return site;
      }),
    };
    HandleChangeValue(value);
  };

  const handleRevokeSite = (
    revokedSite: NostrCredential["dialogicAuthorizedSites"][number]
  ) => {
    const value = {
      dialogicAuthorizedSites: editingKey.dialogicAuthorizedSites.map(site => {
        if (site.url === revokedSite.url) {
          site.expirationTime = 0;
        }
        return site;
      }),
    };
    HandleChangeValue(value);
  };

  const handleSaveExcludedKinds = (siteNo: number, value: string) => {
    if (!/^[1-9][0-9,]*$/.test(value) && value !== "") {
      alert("Input must be Kind number or ','.");
      return;
    }

    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    dialogicAuthorizedSites[siteNo].permissions.excludedKinds = value
      ? value.split(",")
      : [];
    HandleChangeValue({ dialogicAuthorizedSites });
  };
  const handleResetExcludedKinds = (siteNo: number) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    dialogicAuthorizedSites[siteNo].permissions.excludedKinds =
      DefaultExcludedKinds;
    HandleChangeValue({ dialogicAuthorizedSites });
  };

  const handleSaveEveryTimeAuthorizedMethods = (
    siteNo: number,
    value: string
  ) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    if (
      dialogicAuthorizedSites[
        siteNo
      ].permissions.everyTimeAuthorizedMethods.includes(value)
    ) {
      dialogicAuthorizedSites[siteNo].permissions.everyTimeAuthorizedMethods =
        dialogicAuthorizedSites[
          siteNo
        ].permissions.everyTimeAuthorizedMethods.filter(
          method => method !== value
        );
    } else {
      dialogicAuthorizedSites[
        siteNo
      ].permissions.everyTimeAuthorizedMethods.push(value);
    }
    HandleChangeValue({ dialogicAuthorizedSites });
  };

  const handleSaveNallowedMethod = (siteNo: number, value: string) => {
    const trustedSites = JSON.parse(JSON.stringify(editingKey.trustedSites));
    if (trustedSites[siteNo].permissions.nallowedMethod.includes(value)) {
      trustedSites[siteNo].permissions.nallowedMethod = trustedSites[
        siteNo
      ].permissions.nallowedMethod.filter(method => method !== value);
    } else {
      trustedSites[siteNo].permissions.nallowedMethod.push(value);
    }
    HandleChangeValue({ trustedSites });
  };
  const handleResetNallowedMethod = (siteNo: number) => {
    const trustedSites = JSON.parse(JSON.stringify(editingKey.trustedSites));
    trustedSites[siteNo].permissions.nallowedMethod = DefaultNallowedMethods;
    HandleChangeValue({ trustedSites });
  };

  const handleSaveSkippedDialog = (siteNo: number, value: string) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    if (
      dialogicAuthorizedSites[siteNo].permissions.skippedDialog.includes(value)
    ) {
      dialogicAuthorizedSites[siteNo].permissions.skippedDialog =
        dialogicAuthorizedSites[siteNo].permissions.skippedDialog.filter(
          method => method !== value
        );
    } else {
      dialogicAuthorizedSites[siteNo].permissions.skippedDialog.push(value);
    }
    HandleChangeValue({ dialogicAuthorizedSites });
  };
  const handleResetSkippedDialog = (siteNo: number) => {
    const dialogicAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.dialogicAuthorizedSites)
    );
    dialogicAuthorizedSites[siteNo].permissions.skippedDialog =
      DefaultDialogDisplayOptions;
    HandleChangeValue({ dialogicAuthorizedSites });
  };

  function EditableControls() {
    const { isEditing, getEditButtonProps } = useEditableControls();
    return (
      !isEditing && (
        <IconButton
          size="md"
          icon={<MdEdit />}
          aria-label="Edit Key"
          ml="2"
          {...getEditButtonProps()}
        />
      )
    );
  }

  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };

  return (
    <>
      {editingKey ? (
        <Card maxW={700} overflow="hidden" variant="filled">
          <CardHeader pb={0}>
            <Heading size="md">
              <Editable
                defaultValue={editingKey.properties.displayName}
                onSubmit={value =>
                  HandleChangeValue({
                    properties: {
                      ...editingKey.properties,
                      displayName: value,
                    },
                  })
                }
                fontSize="xl"
                isPreviewFocusable
              >
                <EditablePreview overflowWrap="anywhere" />
                {/* Here is the custom input */}
                <Input as={EditableInput} />
                <EditableControls />
              </Editable>
            </Heading>
            {editingKey.properties.displayName !== editingKey.identifier && (
              <Text fontSize="md">&#40;{editingKey.identifier}&#41;</Text>
            )}
          </CardHeader>
          <CardBody>
            <VStack
              divider={<StackDivider borderColor="gray.200" />}
              spacing={2}
              align="stretch"
            >
              <Box>
                <Heading size="xs" textTransform="uppercase" my={4}>
                  Memo
                </Heading>
                <Textarea
                  size="sm"
                  value={editingKey.properties.memo}
                  onChange={e =>
                    HandleChangeValue({
                      properties: {
                        ...editingKey.properties,
                        memo: e.target.value,
                      },
                    })
                  }
                  placeholder="Here is a sample placeholder"
                  backgroundColor="white"
                  maxW="400px"
                />
              </Box>
              <Box>
                <Heading size="xs" textTransform="uppercase" my={4}>
                  Trusted Sites
                </Heading>
                <Grid gridTemplateColumns={"400px 1fr"} gap={2}>
                  <GridItem colSpan={2}>
                    <InputGroup>
                      <Input
                        placeholder="https://example"
                        value={newSite}
                        onChange={handleNewSiteChange}
                        onKeyPress={e => {
                          if (e.key === "Enter") {
                            handleRegisterSite(e);
                          }
                        }}
                        maxW="400px"
                        backgroundColor="white"
                      />
                      <Button
                        variant="outline"
                        colorScheme="blue"
                        onClick={handleRegisterSite}
                      >
                        Register
                      </Button>
                    </InputGroup>
                    <ExampleUrlMatch width="100%" />
                  </GridItem>
                  {!editingKey.trustedSites.length && (
                    <Text fontSize="sm">No registered</Text>
                  )}
                  {editingKey.trustedSites.map((site, i) => {
                    return (
                      <>
                        <GridItem>
                          <HStack>
                            {!site.enabled && (
                              <Tooltip label="Expired">
                                <Box display="flex" alignItems="baseline">
                                  <Icon as={MdOutlineTimerOff} />
                                </Box>
                              </Tooltip>
                            )}
                            <Text
                              fontSize="md"
                              whiteSpace="normal"
                              overflow="hidden"
                              textOverflow="ellipsis"
                            >
                              {site.url}
                              {site.name && <>&nbsp;&#40;{site.name}&#41;</>}
                            </Text>
                          </HStack>
                        </GridItem>
                        <GridItem>
                          <Button
                            variant="outline"
                            colorScheme="blue"
                            onClick={() => {
                              setEditingNumForTrusted(
                                i !== editingNumForTrusted ? i : -1
                              );
                            }}
                            mr="2"
                          >
                            Permission
                          </Button>
                          {site.enabled ? (
                            <Button
                              variant="outline"
                              colorScheme="blue"
                              onClick={() => handleRemoveSite(site)}
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              colorScheme="blue"
                              onClick={() => handleReRegister(site.url)}
                            >
                              Re-register
                            </Button>
                          )}
                        </GridItem>
                        {editingNumForTrusted === i && (
                          <GridItem colSpan={2}>
                            <VStack
                              backgroundColor="white"
                              p="2"
                              alignItems="flex-start"
                            >
                              <Heading size="sm">
                                Narrow the trust scope
                              </Heading>
                              <HStack>
                                <Menu>
                                  <MenuButton
                                    as={Button}
                                    variant="outline"
                                    colorScheme="blue"
                                  >
                                    Select Options
                                  </MenuButton>
                                  <MenuList>
                                    {NallowedMethods.map(option => (
                                      <MenuItem
                                        key={option}
                                        closeOnSelect={false}
                                      >
                                        <Checkbox
                                          isChecked={site.permissions.nallowedMethod.includes(
                                            option
                                          )}
                                          onChange={() =>
                                            handleSaveNallowedMethod(i, option)
                                          }
                                        >
                                          {option}
                                        </Checkbox>
                                      </MenuItem>
                                    ))}
                                  </MenuList>
                                </Menu>
                                <Button
                                  variant="outline"
                                  colorScheme="blue"
                                  onClick={() => handleResetNallowedMethod(i)}
                                  width="150px"
                                >
                                  Revert to preset
                                </Button>
                              </HStack>
                              <ExplainNallowedMethod
                                width="100%"
                                protocolName="nostr"
                              />
                            </VStack>
                          </GridItem>
                        )}
                      </>
                    );
                  })}
                </Grid>
              </Box>
              <Box>
                <Heading size="xs" textTransform="uppercase" my={4}>
                  Dialogic Authorization
                </Heading>
                <Grid gridTemplateColumns={"400px 1fr"} gap={2}>
                  {!editingKey.dialogicAuthorizedSites.length && (
                    <Text fontSize="sm">No registered</Text>
                  )}
                  {editingKey.dialogicAuthorizedSites.map((site, i) => {
                    const expirationTime = new Date(site.expirationTime);
                    return (
                      <>
                        <GridItem>
                          <HStack>
                            {site.expirationTime <= Date.now() && (
                              <Tooltip label="Expired">
                                <Box display="flex" alignItems="baseline">
                                  <Icon as={MdOutlineTimerOff} />
                                </Box>
                              </Tooltip>
                            )}
                            <Text
                              fontSize="md"
                              whiteSpace="normal"
                              overflow="hidden"
                              textOverflow="ellipsis"
                            >
                              {site.url}
                              {site.name && <>&nbsp;&#40;{site.name}&#41;</>}
                              {site.expirationTime > Date.now() && (
                                <>
                                  &nbsp;-&nbsp;until&nbsp;
                                  {expirationTime.toLocaleDateString()}
                                  &nbsp;{expirationTime.toLocaleTimeString()}
                                </>
                              )}
                            </Text>
                          </HStack>
                        </GridItem>
                        <GridItem>
                          <Button
                            variant="outline"
                            colorScheme="blue"
                            onClick={() => {
                              setEditingNumForPassword(
                                i !== editingNumForPassword ? i : -1
                              );
                            }}
                            mr="2"
                          >
                            Permission
                          </Button>
                          {site.expirationTime > Date.now() && (
                            <Button
                              variant="outline"
                              colorScheme="blue"
                              onClick={() => handleRevokeSite(site)}
                            >
                              Revoke
                            </Button>
                          )}
                        </GridItem>
                        {editingNumForPassword === i && (
                          <GridItem colSpan={2}>
                            <VStack
                              backgroundColor="white"
                              p="2"
                              alignItems="flex-start"
                            >
                              <Heading size="sm">
                                The Method authorized every time
                              </Heading>
                              <HStack>
                                <Menu>
                                  <MenuButton
                                    as={Button}
                                    variant="outline"
                                    colorScheme="blue"
                                  >
                                    Select Options
                                  </MenuButton>
                                  <MenuList>
                                    {EveryTimeAuthorizedMethods.map(option => (
                                      <MenuItem
                                        key={option}
                                        closeOnSelect={false}
                                      >
                                        <Checkbox
                                          isChecked={site.permissions.everyTimeAuthorizedMethods.includes(
                                            option
                                          )}
                                          onChange={() =>
                                            handleSaveEveryTimeAuthorizedMethods(
                                              i,
                                              option
                                            )
                                          }
                                        >
                                          {option}
                                        </Checkbox>
                                      </MenuItem>
                                    ))}
                                  </MenuList>
                                </Menu>
                              </HStack>
                              <ExplainEveryTimeAuthorizedMethod
                                width="100%"
                                protocolName="nostr"
                              />
                              <Heading size="sm">
                                Event Kinds authorized every time
                              </Heading>
                              <HStack>
                                <Textarea
                                  size="sm"
                                  value={
                                    site.permissions.excludedKinds.length > 0
                                      ? site.permissions.excludedKinds
                                          .filter(Boolean)
                                          .join(",")
                                      : ""
                                  }
                                  onChange={e =>
                                    handleSaveExcludedKinds(i, e.target.value)
                                  }
                                  placeholder={
                                    site.permissions.excludedKinds.length > 0
                                      ? ""
                                      : "Input kind number"
                                  }
                                  minW="300px"
                                  backgroundColor="white"
                                />
                                <Button
                                  variant="outline"
                                  colorScheme="blue"
                                  onClick={() => handleResetExcludedKinds(i)}
                                  width="150px"
                                >
                                  Revert to preset
                                </Button>
                              </HStack>
                              <ExampleNostrKind width="100%" />
                              <Heading size="sm">
                                Dialog dispaly settings
                              </Heading>
                              <HStack>
                                <Menu>
                                  <MenuButton
                                    as={Button}
                                    variant="outline"
                                    colorScheme="blue"
                                  >
                                    Select Options
                                  </MenuButton>
                                  <MenuList>
                                    {DialogDisplayOptions.map(option => (
                                      <MenuItem
                                        key={option}
                                        closeOnSelect={false}
                                      >
                                        <Checkbox
                                          isChecked={site.permissions.skippedDialog.includes(
                                            option
                                          )}
                                          onChange={() =>
                                            handleSaveSkippedDialog(i, option)
                                          }
                                        >
                                          {option}
                                        </Checkbox>
                                      </MenuItem>
                                    ))}
                                  </MenuList>
                                </Menu>
                                <Button
                                  variant="outline"
                                  colorScheme="blue"
                                  onClick={() => handleResetSkippedDialog(i)}
                                  width="150px"
                                >
                                  Revert to preset
                                </Button>
                              </HStack>
                              <ExplainDialogDisplayOption
                                width="100%"
                                protocolName="nostr"
                              />
                            </VStack>
                          </GridItem>
                        )}
                      </>
                    );
                  })}
                </Grid>
              </Box>
              <Box>
                <Heading size="xs" textTransform="uppercase" my={4}>
                  Primary
                </Heading>
                <Switch
                  isChecked={editingKey.primary}
                  onChange={e =>
                    HandleChangeValue({ primary: e.target.checked })
                  }
                  alignSelf="center"
                />
              </Box>
            </VStack>
          </CardBody>
          <CardFooter pt="0" justify="space-evenly">
            <IconButton
              icon={<MdOutlineCancel />}
              variant="transparent"
              fontSize="20px"
              aria-label="Cancel"
              onClick={handleGoBack}
            />
            <IconButton
              icon={<MdSaveAlt />}
              variant="filled"
              fontSize="24px"
              aria-label="Save"
              onClick={handleSave}
            />
          </CardFooter>
        </Card>
      ) : (
        <></>
      )}
      <AlertPrimaryPassword
        isOpen={isOpenDialog}
        onClose={onCloseDialog}
        cancelRef={cancelRef}
      />
    </>
  );
}
