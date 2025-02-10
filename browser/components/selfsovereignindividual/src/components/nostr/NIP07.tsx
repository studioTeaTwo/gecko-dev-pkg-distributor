import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Divider,
  Grid,
  GridItem,
  Heading,
  IconButton,
  Input,
  InputGroup,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  StackDivider,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import {
  NostrCredential,
  SelfSovereignIndividualDefaultProps,
} from "../../custom.type";
import { promptForPrimaryPassword } from "../../shared/utils";
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword";
import TabPin from "../shared/TabPin";
import { MdEdit } from "../shared/react-icons/Icons";
import KeyEditor from "./KeyEditor";
import { DefaultExcludedKinds, SafeProtocols, SpecialCards } from "./contants";
import { ExampleNostrKind, ExampleUrlMatch } from "../shared/Examples";
import { StateContext } from "../../contexts/StatesProvider";

const OneHour = 60 * 60 * 1000;

export default function NIP07(props: SelfSovereignIndividualDefaultProps) {
  const { prefs, credentials } = props;
  const { states, resetState, updateState } = useContext(StateContext);
  const { modifyCredentialToStore, onPrefChanged } = dispatchEvents;

  const [newSite, setNewSite] = useState("");
  const [newExcludedKindsPreset, setNewExcludedKindsPreset] = useState("");
  const [tabIndex, setTabIndex] = useState(-1);
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTabIndex(parseInt(prefs.nostr.tabPinInNip07));
  }, [prefs.nostr.tabPinInNip07]);

  const tabPin = (tabId: number) =>
    TabPin(
      tabId.toString(),
      { key: "tabPinInNip07", value: prefs.nostr.tabPinInNip07 },
      "nostr"
    );

  const nostrkeys = useMemo(
    () =>
      credentials
        .filter(credential => credential.protocolName === "nostr")
        .sort((a, b) => (b.primary ? 1 : 0)) as NostrCredential[],
    [credentials]
  );

  const handleUsedTrustedSites = async (checked: boolean) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    onPrefChanged({ protocolName: "nostr", usedTrustedSites: checked });
  };

  const handleNewSiteChange = e => setNewSite(e.target.value);
  const handleRegisterSite = async (
    e:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();

    if (
      !SafeProtocols.some(protocol => newSite.startsWith(protocol)) &&
      !SpecialCards.includes(newSite)
    ) {
      alert(`Currently, only supports ${SafeProtocols.join(",")}.`);
      return;
    }
    const existings = nostrkeys.filter(key =>
      key.trustedSites.some(site => site.url === newSite && site.enabled)
    );
    if (nostrkeys.length === existings.length) {
      alert("The url exists already.");
      return;
    }
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    for (const key of nostrkeys) {
      const idx = key.trustedSites.findIndex(site => site.url === newSite);
      if (idx >= 0) {
        if (key.trustedSites[idx].enabled) {
          return;
        }
        key.trustedSites[idx].enabled = true;
      } else {
        key.trustedSites.push({
          url: newSite,
          name: newSite !== "*" ? "" : "<all_urls>",
          enabled: true,
          permissions: {},
        });
      }
      modifyCredentialToStore(
        {
          guid: key.guid,
          trustedSites: key.trustedSites,
        },
        newSite.startsWith("moz-extension")
          ? { newExtensionForTrustedSite: [newSite] }
          : undefined
      );
    }
  };

  const handleRemoveSite = async (
    removedSite: NostrCredential["trustedSites"][number]
  ) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    for (const item of nostrkeys) {
      modifyCredentialToStore({
        guid: item.guid,
        trustedSites: item.trustedSites.map(site => {
          if (site.url === removedSite.url) {
            site.enabled = false;
          }
          return site;
        }),
      });
    }
  };

  const handleUsedBuiltinNip07 = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const checked = e.target.checked;
    onPrefChanged({ protocolName: "nostr", usedBuiltinNip07: checked });
  };

  const handleUsedPrimarypasswordToApps = async (checked: boolean) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    onPrefChanged({
      protocolName: "nostr",
      usedPrimarypasswordToApps: checked,
    });
  };

  const handleExpiryTimeForPrimarypasswordToApps = async (
    valueAsString: string,
    valueAsNumber: number
  ) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    onPrefChanged({
      protocolName: "nostr",
      expiryTimeForPrimarypasswordToApps: valueAsNumber * OneHour,
    });
  };

  const handleRevokeSite = async (
    identifier: string,
    revokedSite: NostrCredential["passwordAuthorizedSites"][number]
  ) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    const item = nostrkeys.find(key => key.identifier === identifier);
    modifyCredentialToStore({
      guid: item.guid,
      passwordAuthorizedSites: item.passwordAuthorizedSites.map(site => {
        if (site.url === revokedSite.url) {
          site.expiryTime = 0;
        }
        return site;
      }),
    });
  };

  const handleUsedAccountChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const checked = e.target.checked;
    onPrefChanged({ protocolName: "nostr", usedAccountChanged: checked });
  };

  const handleChangeExcludedKinds = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    const value = e.target.value;
    if (!/^[1-9][0-9,]*$/.test(value) && value !== "") {
      alert("Input must be Kind number or ','.");
      return;
    }

    setNewExcludedKindsPreset(value);
  };
  const handleEditExcludedKinds = async (sort: "edit" | "default") => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    onPrefChanged({
      protocolName: "nostr",
      excludedKindsPreset:
        sort === "edit"
          ? newExcludedKindsPreset
          : DefaultExcludedKinds.join(","),
    });
    if (sort === "default") {
      setNewExcludedKindsPreset(DefaultExcludedKinds.join(","));
    }
  };

  const getTrustedSites = useCallback(() => {
    const trustedSites = Array.from(
      new Set(
        nostrkeys
          .map(key => key.trustedSites.filter(site => site.enabled))
          .flat()
          .map(site => JSON.stringify(site))
      )
    ).map(site => JSON.parse(site)) as NostrCredential["trustedSites"];
    return trustedSites.length > 0 ? (
      trustedSites.map(site => (
        <>
          <GridItem>
            <Accordion allowToggle>
              <AccordionItem css={{ border: "none" }}>
                <AccordionButton
                  textAlign="left"
                  css={{ padding: 0, lineBreak: "anywhere" }}
                >
                  <Heading as="h5" size="sm">
                    {site.url}
                    {site.name && <>&nbsp;&#40;{site.name}&#41;</>}
                  </Heading>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  {nostrkeys
                    .filter(key =>
                      key.trustedSites.some(_site => _site.url === site.url)
                    )
                    .map((key, i) => {
                      return (
                        <>
                          {!(
                            states.nostr.editingNo === i &&
                            states.nostr.editingUrl === site.url
                          ) ? (
                            <Box>
                              <label>{key.properties.displayName}</label>{" "}
                              <IconButton
                                icon={<MdEdit />}
                                variant="transparent"
                                aria-label="Edit Key"
                                onClick={() =>
                                  updateState("nostr", {
                                    editingNo: i,
                                    editingUrl: site.url,
                                  })
                                }
                              />
                            </Box>
                          ) : (
                            <KeyEditor
                              credential={nostrkeys[states.nostr.editingNo]}
                              nostrKeys={nostrkeys}
                              usedPrimarypasswordToSettings={
                                prefs.nostr.usedPrimarypasswordToSettings
                              }
                              goBack={() => resetState()}
                            ></KeyEditor>
                          )}
                        </>
                      );
                    })}
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </GridItem>
          <GridItem>
            <Button
              variant="outline"
              colorScheme="blue"
              onClick={() => handleRemoveSite(site)}
            >
              Remove from All keys
            </Button>
          </GridItem>
        </>
      ))
    ) : (
      <Text>No site registered</Text>
    );
  }, [nostrkeys, states.nostr]);

  const getPasswordAuthorizedSites = useCallback(() => {
    const passwordAuthorizedSites = nostrkeys.reduce<{
      [url: string]: {
        key: NostrCredential;
        site: NostrCredential["passwordAuthorizedSites"][number];
        keyNo: number;
      }[];
    }>((acc, key, i) => {
      key.passwordAuthorizedSites
        .filter(site => site.expiryTime > 0)
        .forEach(site => {
          const found = Object.keys(acc).find(url => site.url === url);
          if (found) {
            acc[found].push({ key, site, keyNo: i });
            return;
          }
          acc[site.url] = [{ key, site, keyNo: i }];
        });
      return acc;
    }, {});
    return Object.keys(passwordAuthorizedSites).length > 0 ? (
      Object.entries(passwordAuthorizedSites).map(([url, keys]) => {
        return (
          <>
            <GridItem colSpan={2}>
              <Accordion allowToggle>
                <AccordionItem css={{ border: "none" }}>
                  <AccordionButton
                    textAlign="left"
                    css={{ padding: 0, lineBreak: "anywhere" }}
                  >
                    <Heading as="h5" size="sm">
                      {url}
                      {keys[0].site.name && (
                        <>&nbsp;&#40;{keys[0].site.name}&#41;</>
                      )}
                    </Heading>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    {keys.map(item => {
                      const expiryTime = new Date(item.site.expiryTime);
                      return (
                        <>
                          {!(
                            states.nostr.editingNo === item.keyNo &&
                            states.nostr.editingUrl === url
                          ) ? (
                            <Grid
                              gridTemplateColumns={"700px 1fr"}
                              gap={6}
                              alignItems="start"
                            >
                              <GridItem>
                                <label>{item.key.properties.displayName}</label>{" "}
                                &nbsp;-&nbsp;until&nbsp;
                                {expiryTime.toLocaleDateString()}
                                &nbsp;{expiryTime.toLocaleTimeString()}
                                <IconButton
                                  icon={<MdEdit />}
                                  variant="transparent"
                                  aria-label="Edit Key"
                                  onClick={() =>
                                    updateState("nostr", {
                                      editingNo: item.keyNo,
                                      editingUrl: url,
                                    })
                                  }
                                />
                              </GridItem>
                              <GridItem>
                                <Button
                                  variant="outline"
                                  colorScheme="blue"
                                  onClick={() =>
                                    handleRevokeSite(
                                      item.key.identifier,
                                      item.site
                                    )
                                  }
                                >
                                  Revoke
                                </Button>
                              </GridItem>
                            </Grid>
                          ) : (
                            <KeyEditor
                              credential={nostrkeys[states.nostr.editingNo]}
                              nostrKeys={nostrkeys}
                              usedPrimarypasswordToSettings={
                                prefs.nostr.usedPrimarypasswordToSettings
                              }
                              goBack={() => resetState()}
                            ></KeyEditor>
                          )}
                        </>
                      );
                    })}
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </GridItem>
          </>
        );
      })
    ) : (
      <Text>No site registered</Text>
    );
  }, [nostrkeys, states.nostr]);

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
          <Grid gridTemplateColumns={"300px 1fr"} gap={6} alignItems={"center"}>
            <GridItem colSpan={2}>
              <Text fontSize="sm">
                You can still use these features realated to your keys on
                extensions/apps compatible with this browser, even if turning
                off &quot;Use built-in NIP-07&quot;.
              </Text>
            </GridItem>
            <GridItem>
              <label htmlFor="nostr-pref-usedBuiltinNip07">
                Use built-in NIP-07
              </label>
            </GridItem>
            <GridItem>
              <Switch
                id="nostr-pref-usedBuiltinNip07"
                isChecked={prefs.nostr.usedBuiltinNip07}
                onChange={handleUsedBuiltinNip07}
              />
            </GridItem>
            <GridItem>
              <label htmlFor="nostr-pref-usedAccountChanged">
                Notify &quot;Account Changed&quot; to Web apps
              </label>
            </GridItem>
            <GridItem>
              <Switch
                id="nostr-pref-usedAccountChanged"
                isChecked={prefs.nostr.usedAccountChanged}
                onChange={handleUsedAccountChanged}
              />
            </GridItem>
          </Grid>
        </Box>
        <Box>
          <Tabs
            variant="enclosed"
            index={tabIndex}
            onChange={index => {
              setTabIndex(index);
              resetState();
            }}
          >
            <TabList>
              <Tab>
                <Heading as="h4" size="md">
                  Trusted Sites
                </Heading>
                {tabPin(0)}
              </Tab>
              <Tab>
                <Heading as="h4" size="md">
                  Password Authorization
                </Heading>
                {tabPin(1)}
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <Grid
                  gridTemplateColumns={"300px 1fr"}
                  gap={6}
                  alignItems="start"
                >
                  <GridItem>
                    <label htmlFor="nostr-pref-usedTrustedSites">Enable</label>
                  </GridItem>
                  <GridItem>
                    <Switch
                      id="nostr-pref-usedTrustedSites"
                      isChecked={prefs.nostr.usedTrustedSites}
                      onChange={e => handleUsedTrustedSites(e.target.checked)}
                    />
                  </GridItem>
                  <GridItem>
                    <label>Register</label>
                  </GridItem>
                  <GridItem>
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
                        maxW="300px"
                      />
                      <Button
                        variant="outline"
                        colorScheme="blue"
                        onClick={handleRegisterSite}
                      >
                        Register to All keys
                      </Button>
                    </InputGroup>
                    <ExampleUrlMatch maxW="500px" />
                  </GridItem>
                  <GridItem>
                    <Divider />
                  </GridItem>
                  <GridItem></GridItem>
                </Grid>
                <Grid
                  gridTemplateColumns={"600px 1fr"}
                  gap={6}
                  alignItems="start"
                >
                  {getTrustedSites()}
                </Grid>
              </TabPanel>
              <TabPanel>
                <Grid
                  gridTemplateColumns={"300px 1fr"}
                  gap={6}
                  alignItems="start"
                >
                  <GridItem>
                    <label htmlFor="nostr-pref-usedPrimarypasswordToApps">
                      Enable
                    </label>
                  </GridItem>
                  <GridItem>
                    <Switch
                      id="nostr-pref-usedPrimarypasswordToApps"
                      isChecked={prefs.nostr.usedPrimarypasswordToApps}
                      onChange={e =>
                        handleUsedPrimarypasswordToApps(e.target.checked)
                      }
                    />
                  </GridItem>
                  {prefs.nostr.usedPrimarypasswordToApps && (
                    <>
                      <GridItem>
                        <label htmlFor="nostr-pref-expiryTimeForPrimarypasswordToApps">
                          Expiry Hour
                        </label>
                      </GridItem>
                      <GridItem>
                        <NumberInput
                          id="nostr-pref-expiryTimeForPrimarypasswordToApps"
                          value={
                            prefs.nostr.expiryTimeForPrimarypasswordToApps /
                            OneHour
                          }
                          onChange={handleExpiryTimeForPrimarypasswordToApps}
                          min={0}
                          size="sm"
                          maxW={20}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </GridItem>
                      <GridItem>
                        <label>
                          Preset for the Event Kind authorized every time
                        </label>
                      </GridItem>
                      <GridItem>
                        <VStack
                          backgroundColor="white"
                          p="2"
                          alignItems="flex-start"
                        >
                          <InputGroup>
                            <Input
                              placeholder="Input kind number"
                              value={
                                newExcludedKindsPreset ||
                                prefs.nostr.excludedKindsPreset
                              }
                              onChange={handleChangeExcludedKinds}
                              maxW="300px"
                            />
                            <Button
                              variant="outline"
                              colorScheme="blue"
                              onClick={e => {
                                e.preventDefault();
                                handleEditExcludedKinds("edit");
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              colorScheme="blue"
                              onClick={e => {
                                e.preventDefault();
                                handleEditExcludedKinds("default");
                              }}
                            >
                              Reset to default
                            </Button>
                          </InputGroup>
                          <ExampleNostrKind width="100%" />
                        </VStack>
                      </GridItem>
                    </>
                  )}
                  <GridItem>
                    <Divider />
                  </GridItem>
                  <GridItem></GridItem>
                </Grid>
                <Grid
                  gridTemplateColumns={"600px 1fr"}
                  gap={6}
                  alignItems="start"
                >
                  {getPasswordAuthorizedSites()}
                </Grid>
              </TabPanel>
            </TabPanels>
          </Tabs>
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
