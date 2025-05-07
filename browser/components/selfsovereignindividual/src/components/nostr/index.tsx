import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Spinner,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import Keys from "./Keys";
import NIP07 from "./NIP07";
import More from "./More";
import {
  NostrCredential,
  SelfSovereignIndividualDefaultProps,
} from "../../custom.type";
import TabPin from "../shared/TabPin";
import { StateContext } from "../../contexts/StatesProvider";
import { dispatchEvents } from "../../hooks/useChildActorEvent";

export default function Nostr(props: SelfSovereignIndividualDefaultProps) {
  const { prefs, credentials } = props;
  const { resetState } = useContext(StateContext);
  const { onPrefChanged } = dispatchEvents;

  const [tabIndex, setTabIndex] = useState(-1);

  useEffect(() => {
    if (tabIndex === -1) {
      setTabIndex(parseInt(prefs.nostr.tabPin));
    }
  }, [prefs.nostr.tabPin]);

  const nostrKeys = useMemo(
    () =>
      credentials
        .filter(credential => credential.protocolName === "nostr")
        .sort((a, b) => (b.primary ? 1 : 0)) as NostrCredential[],
    [credentials]
  );

  const handleEnable = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const checked = e.target.checked;
    onPrefChanged({ protocolName: "nostr", enabled: checked });
  };

  const tabPin = (tabId: number) =>
    TabPin(
      tabId.toString(),
      { key: "tabPin", value: prefs.nostr.tabPin },
      "nostr"
    );

  return (
    <Box height={"calc(100vh - 40px)"} mt={10} overflowY="auto">
      <Text size="md" mb="10px">
        Your keys are stored locally, isolated from and inaccessible to the web
        app.
      </Text>
      <Grid gridTemplateColumns={"100px 1fr"} gap={6} mb="2rem">
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
      </Grid>

      {prefs.nostr.tabPin ? (
        <Tabs
          variant="enclosed"
          index={tabIndex}
          onChange={index => {
            setTabIndex(index);
            resetState();
          }}
        >
          <TabList position="sticky" top="0" zIndex={1} m={2} bg="white">
            <Tab>
              <Heading as="h3" size="lg">
                Keys
              </Heading>
            </Tab>
            <Box display="flex" alignItems="center" mr={3}>
              {tabPin(0)}
            </Box>
            <Tab>
              <Heading as="h3" size="lg">
                NIP-07
              </Heading>
            </Tab>
            <Box display="flex" alignItems="center" mr={3}>
              {tabPin(1)}
            </Box>
            <Tab>
              <Heading as="h3" size="lg">
                More
              </Heading>
            </Tab>
            <Box display="flex" alignItems="center" mr={3}>
              {tabPin(2)}
            </Box>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Keys prefs={prefs} credentials={nostrKeys} />
            </TabPanel>
            <TabPanel>
              <NIP07 prefs={prefs} credentials={nostrKeys} />
            </TabPanel>
            <TabPanel>
              <More prefs={prefs} credentials={nostrKeys} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      ) : (
        <Spinner />
      )}
    </Box>
  );
}
