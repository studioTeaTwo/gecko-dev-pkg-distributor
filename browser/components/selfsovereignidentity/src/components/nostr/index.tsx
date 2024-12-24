import React, { useEffect } from "react"
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
import { SelfsovereignidentityDefaultProps } from "src/custom.type"

export default function Nostr(props: SelfsovereignidentityDefaultProps) {
  const { prefs, credentials } = props
  const { initStore } = dispatchEvents

  // on mount
  useEffect(() => {
    initStore()
  }, [])

  return (
    <div>
      <Text size="md" mb="10px">
        Your keys are stored locally, isolated from and inaccessible to the web
        app.
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
  )
}
