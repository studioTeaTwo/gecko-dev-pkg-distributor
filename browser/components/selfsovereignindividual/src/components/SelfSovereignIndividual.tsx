/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useState, useEffect } from "react";
import { Box, HStack, Spinner } from "@chakra-ui/react";
import Menu from "./Menu";
import Bitcoin from "./bitcoin";
import Nostr from "./nostr";
import Settings from "./settings";
import { MenuItem } from "../custom.type";
import useChildActorEvent, {
  dispatchEvents,
} from "../hooks/useChildActorEvent";

function SelfSovereignIndividual() {
  const { prefs, credentials } = useChildActorEvent(); // Just once to ensure that useEffect is called only once
  const { initStore } = dispatchEvents;

  const [selectedMenu, setSelectedMenu] = useState<MenuItem>("");

  // on mount
  useEffect(() => {
    initStore();
  }, []);

  useEffect(() => {
    if (!selectedMenu) {
      setSelectedMenu(prefs.base.menuPin);
    }
  }, [prefs.base.menuPin]);

  const switchContent = () => {
    if (selectedMenu === "bitcoin") {
      return <Bitcoin prefs={prefs} credentials={credentials} />;
    } else if (selectedMenu === "nostr") {
      return <Nostr prefs={prefs} credentials={credentials} />;
    } else if (selectedMenu === "settings") {
      return <Settings prefs={prefs} credentials={credentials} />;
    }
  };

  return (
    <HStack
      width={"100%"}
      height={"100vh"}
      alignItems="flex-start"
      justifyContent="flex-start"
      overflow="auto"
    >
      <Menu
        selectedMenu={selectedMenu}
        setSelectedMenu={setSelectedMenu}
        menuPin={prefs.base.menuPin}
      />
      <Box flex="1">{prefs.base.menuPin ? switchContent() : <Spinner />}</Box>
    </HStack>
  );
}

export default SelfSovereignIndividual;
