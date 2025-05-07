import React, { useCallback } from "react";
import { Button, Divider, Flex, HStack, VStack } from "@chakra-ui/react";
import { MenuItem, ProtocolName } from "../custom.type";
import { BitcoinLogo, NostrLogo } from "./shared/Logo";
import TabPin from "./shared/TabPin";

interface Props {
  selectedMenu: MenuItem;
  setSelectedMenu: (menuItem: MenuItem) => void;
  menuPin: MenuItem;
}

function Menu(props: Props) {
  const { selectedMenu, setSelectedMenu, menuPin } = props;

  const buildMenu = useCallback(() => {
    const list: { name: ProtocolName; icon: JSX.Element }[] = [
      { name: "bitcoin", icon: <BitcoinLogo /> },
      { name: "nostr", icon: <NostrLogo /> },
    ];
    return (
      <>
        {list.map((menu, index) => (
          <HStack key={index} width={"150px"}>
            <Button
              variant={selectedMenu === menu.name ? "solid" : "transparent"}
              leftIcon={menu.icon}
              onClick={e => {
                e.preventDefault();
                setSelectedMenu(menu.name);
              }}
              size={"lg"}
            >
              {menu.name.charAt(0).toUpperCase() + menu.name.slice(1)}
            </Button>

            {TabPin(menu.name, { key: "menuPin", value: menuPin }, "base")}
          </HStack>
        ))}
      </>
    );
  }, [selectedMenu, menuPin]);

  return (
    <Flex
      direction={"column"}
      width={"200px"}
      height={"calc(100vh - 40px)"}
      justify={"space-between"}
      aria-label="Main Navigation"
      as="nav"
      pos={"sticky"}
      top={0}
      flexShrink={0}
      p={10}
      overflowY={"auto"}
    >
      <VStack gap={2}>{buildMenu()}</VStack>
      <VStack>
        <Divider />
        <HStack>
          <Button
            variant={selectedMenu === "settings" ? "solid" : "transparent"}
            onClick={e => {
              e.preventDefault();
              setSelectedMenu("settings");
            }}
            size={"lg"}
          >
            Settings
          </Button>
        </HStack>
      </VStack>
    </Flex>
  );
}

export default Menu;
