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
} from "@chakra-ui/react";
import {
  MdEdit,
  MdSaveAlt,
  MdOutlineCancel,
  MdOutlineTimerOff,
} from "../shared/react-icons/Icons";
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import { NostrCredential } from "../../custom.type";
import { promptForPrimaryPassword } from "../../shared/utils";
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword";
import { DefaultExcludedKinds, SafeProtocols, SpecialCards } from "./contants";
import { ExampleNostrKind, ExampleUrlMatch } from "../shared/Examples";
import { changePrimary } from "../shared/functions";

interface Props {
  credential: NostrCredential;
  nostrKeys: NostrCredential[];
  usedPrimarypasswordToSettings: boolean;
  goBack: (direction?: unknown) => void;
}

export default function KeyEditor(props: Props) {
  const { credential, nostrKeys, usedPrimarypasswordToSettings } = props;
  const { modifyCredentialToStore } = dispatchEvents;

  const [editingKey, setEditingKey] = useState<Props["credential"]>(null);
  const [newSite, setNewSite] = useState("");
  const [newExtensions, setNewExtensions] = useState([]);
  // const [editingNumForTrusted, setEditingNumForTrusted] = useState(-1);
  const [editingNumForPassword, setEditingNumForPassword] = useState(-1);
  const [isOpenDialog, setIsOpenDialog] = useState(false);

  useEffect(() => {
    setEditingKey(JSON.parse(JSON.stringify(credential)));
  }, []);

  const handleSave = async () => {
    if (usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    modifyCredentialToStore(editingKey, {
      newExtensionForTrustedSite: newExtensions,
    });
    if (credential.primary !== editingKey.primary) {
      changePrimary(editingKey.guid, editingKey.primary, nostrKeys);
    }

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

    handleReenable(newSite);
  };
  const handleReenable = (
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
            permissions: {},
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
    revokedSite: NostrCredential["passwordAuthorizedSites"][number]
  ) => {
    const value = {
      passwordAuthorizedSites: editingKey.passwordAuthorizedSites.map(site => {
        if (site.url === revokedSite.url) {
          site.expiryTime = 0;
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

    const passwordAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.passwordAuthorizedSites)
    );
    passwordAuthorizedSites[siteNo].permissions.excludedKinds = value
      ? value.split(",")
      : [];
    HandleChangeValue({ passwordAuthorizedSites });
  };
  const handleResetExcludedKinds = (siteNo: number) => {
    const passwordAuthorizedSites = JSON.parse(
      JSON.stringify(editingKey.passwordAuthorizedSites)
    );
    passwordAuthorizedSites[siteNo].permissions.excludedKinds =
      DefaultExcludedKinds;
    HandleChangeValue({ passwordAuthorizedSites });
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
                  HandleChangeValue({ properties: { displayName: value } })
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
                <Grid
                  gridTemplateColumns={"400px 1fr"}
                  gap={2}
                  alignItems={"center"}
                >
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
                    <ExampleUrlMatch maxW="500px" />
                  </GridItem>
                  {!editingKey.trustedSites.length && (
                    <Text fontSize="sm">No registered</Text>
                  )}
                  {editingKey.trustedSites.map(site => {
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
                            <Text fontSize="md">
                              {site.url}
                              {site.name && <>&nbsp;&#40;{site.name}&#41;</>}
                            </Text>
                          </HStack>
                        </GridItem>
                        <GridItem>
                          {/* <Button
                              variant="outline"
                              colorScheme="blue"
                              onClick={() => setEditingNumForTrusted(i)}
                              mr="2"
                            >
                              Permission
                            </Button> */}
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
                              onClick={() => handleReenable(site.url)}
                            >
                              Re-enable
                            </Button>
                          )}
                        </GridItem>
                        {/* {editingNumForTrusted === i && (
                            <GridItem colSpan={2}>
                              <VStack backgroundColor="white">
                                <Box>N/A</Box>
                              </VStack>
                            </GridItem>
                          )} */}
                      </>
                    );
                  })}
                </Grid>
              </Box>
              <Box>
                <Heading size="xs" textTransform="uppercase" my={4}>
                  Password Authorization
                </Heading>
                <Grid gridTemplateColumns={"400px 1fr"} gap={2}>
                  {!editingKey.passwordAuthorizedSites.length && (
                    <Text fontSize="sm">No registered</Text>
                  )}
                  {editingKey.passwordAuthorizedSites.map((site, i) => {
                    const expiryTime = new Date(site.expiryTime);
                    return (
                      <>
                        <GridItem>
                          <HStack>
                            {site.expiryTime <= Date.now() && (
                              <Tooltip label="Expired">
                                <Box display="flex" alignItems="baseline">
                                  <Icon as={MdOutlineTimerOff} />
                                </Box>
                              </Tooltip>
                            )}
                            <Text fontSize="md">
                              {site.url}
                              {site.name && <>&nbsp;&#40;{site.name}&#41;</>}
                              &nbsp;-&nbsp;until&nbsp;
                              {expiryTime.toLocaleDateString()}
                              &nbsp;{expiryTime.toLocaleTimeString()}
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
                          {site.expiryTime > Date.now() && (
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
                                Event Kinds authorized every time
                              </Heading>
                              <HStack>
                                <Textarea
                                  size="sm"
                                  value={
                                    site.permissions.excludedKinds.length > 0
                                      ? site.permissions.excludedKinds.join(",")
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
              onClick={() => {
                setEditingKey(credential);
                props.goBack();
              }}
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
