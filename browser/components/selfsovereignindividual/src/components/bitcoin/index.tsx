import React, { useContext, useEffect, useMemo, useState } from "react";
import { SelfSovereignIndividualDefaultProps } from "../../custom.type";
import {
  Tabs,
  TabList,
  Tab,
  Heading,
  TabPanels,
  TabPanel,
  Spinner,
  Text,
  Grid,
  GridItem,
  Switch,
} from "@chakra-ui/react";
import { StateContext } from "../../contexts/StatesProvider";
import BIP39 from "./BIP39";
import More from "./More";
import TabPin from "../shared/TabPin";
import { dispatchEvents } from "../../hooks/useChildActorEvent";

export default function Bitcoin(props: SelfSovereignIndividualDefaultProps) {
  const { prefs, credentials } = props;
  const { resetState } = useContext(StateContext);
  const { onPrefChanged } = dispatchEvents;

  const [tabIndex, setTabIndex] = useState(-1);

  useEffect(() => {
    setTabIndex(parseInt(prefs.bitcoin.tabPin));
  }, [prefs.bitcoin.tabPin]);

  const tabPin = (tabId: number) =>
    TabPin(
      tabId.toString(),
      { key: "tabPin", value: prefs.bitcoin.tabPin },
      "bitcoin"
    );

  const bitcoinKeys = useMemo(
    () =>
      credentials
        .filter(credential => credential.protocolName === "bitcoin")
        .sort((a, b) => (b.primary ? 1 : 0)),
    [credentials]
  );

  const handleEnable = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const checked = e.target.checked;
    onPrefChanged({ protocolName: "bitcoin", enabled: checked });
  };

  return (
    <div>
      <Text size="md" mb="10px">
        Your keys are stored locally, isolated from and inaccessible to the web
        app.
      </Text>
      <Grid gridTemplateColumns={"100px 1fr"} gap={6} mb="2rem">
        <GridItem>
          <label htmlFor="bitcoin-pref-enabled">Enable</label>
        </GridItem>
        <GridItem>
          <Switch
            id="bitcoin-pref-enabled"
            isChecked={prefs.bitcoin.enabled}
            onChange={handleEnable}
          />
        </GridItem>
      </Grid>
      {prefs.bitcoin.tabPin ? (
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
              <Heading as="h3" size="lg">
                BIP-39
              </Heading>
              {tabPin(0)}
            </Tab>
            <Tab>
              <Heading as="h3" size="lg">
                More
              </Heading>
              {tabPin(1)}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <BIP39 prefs={prefs} credentials={bitcoinKeys} />
            </TabPanel>
            <TabPanel>
              <More prefs={prefs} credentials={bitcoinKeys} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      ) : (
        <Spinner />
      )}
    </div>
  );
}
