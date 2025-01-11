/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useState, useEffect } from "react";
import { Box, Grid, GridItem } from "@chakra-ui/react";
import Menu from "./Menu";
import Bitcoin from "./bitcoin";
import Lightning from "./lightning";
import Nostr from "./nostr";
import ECash from "./ecash";
import { MenuItem } from "../custom.type";
import useChildActorEvent from "../hooks/useChildActorEvent";

function Selfsovereignidentity(props) {
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>("nostr");
  const { prefs, credentials } = useChildActorEvent(); // Just once to ensure that useeffect is called only once

  useEffect(() => {}, []);

  const setMenu = (menuItem: MenuItem) => {
    setSelectedMenu(menuItem);
  };

  const switchContent = () => {
    if (selectedMenu === "bitcoin") {
      return <Bitcoin />;
    } else if (selectedMenu === "lightning") {
      return <Lightning />;
    } else if (selectedMenu === "ecash") {
      return <ECash />;
    } else if (selectedMenu === "nostr") {
      return <Nostr prefs={prefs} credentials={credentials} />;
    }
  };

  return (
    <Box m={10}>
      <Grid w="100%" h="100%" templateColumns="200px auto" gap={4}>
        <GridItem colSpan={1}>
          <Menu selectedMenu={selectedMenu} setMenu={setMenu} />
        </GridItem>
        <GridItem colSpan={1}>{switchContent()}</GridItem>
      </Grid>
    </Box>
  );
}

export default Selfsovereignidentity;
