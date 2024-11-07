import React, { useEffect, useState } from "react"
import {
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react"
import { dispatchEvents } from "../../hooks/useChildActorEvent"
import Keys from "./Keys"
import NIP07 from "./NIP07"
import More from "./More"

export default function Nostr(props) {
  const { initStore } = dispatchEvents

  // on mount
  useEffect(() => {
    initStore()
  }, [])

  return (
    <div>
      <Text size="md" mb="10px">
        Your key is stored in local, where separated and not been able to
        accessed from web apps.
      </Text>
      <Tabs variant="enclosed">
        <TabList>
          <Tab>
            <Heading as="h3" size="lg">
              Keys
            </Heading>
          </Tab>
          <Tab>
            <Heading as="h3" size="lg">
              NIP-07
            </Heading>
          </Tab>
          <Tab>
            <Heading as="h3" size="lg">
              More
            </Heading>
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Keys />
          </TabPanel>
          <TabPanel>
            <NIP07 />
          </TabPanel>
          <TabPanel>
            <More />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
