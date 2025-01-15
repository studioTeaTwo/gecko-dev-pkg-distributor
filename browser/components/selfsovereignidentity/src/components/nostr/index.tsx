import React, { useEffect, useState } from "react";
import {
  Heading,
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
import { SelfsovereignidentityDefaultProps } from "../../custom.type";
import TabPin from "../shared/TabPin";

export default function Nostr(props: SelfsovereignidentityDefaultProps) {
  const { prefs, credentials } = props;

  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    setTabIndex(parseInt(prefs.nostr.tabPin));
  }, [prefs.nostr.tabPin]);

  const tabPin = (tabId: number) =>
    TabPin(
      tabId.toString(),
      { key: "tabPin", value: prefs.nostr.tabPin },
      "nostr"
    );

  return (
    <div>
      <Text size="md" mb="10px">
        Your keys are stored locally, isolated from and inaccessible to the web
        app.
      </Text>
      <Tabs
        variant="enclosed"
        index={tabIndex}
        onChange={index => {
          setTabIndex(index);
        }}
      >
        <TabList>
          <Tab>
            <Heading as="h3" size="lg">
              Keys
            </Heading>
            {tabPin(0)}
          </Tab>
          <Tab>
            <Heading as="h3" size="lg">
              NIP-07
            </Heading>
            {tabPin(1)}
          </Tab>
          <Tab>
            <Heading as="h3" size="lg">
              More
            </Heading>
            {tabPin(2)}
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Keys prefs={prefs} credentials={credentials} />
          </TabPanel>
          <TabPanel>
            <NIP07 prefs={prefs} credentials={credentials} />
          </TabPanel>
          <TabPanel>
            <More prefs={prefs} credentials={credentials} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
