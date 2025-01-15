import React, { useCallback } from "react";
import { VStack, Button, HStack } from "@chakra-ui/react";
import { MenuItem } from "../custom.type";
import BitcoinIcon from "./shared/Logo";
import { GiBirdTwitter } from "./shared/react-icons/Icons";
import TabPin from "./shared/TabPin";

interface Props {
  selectedMenu: MenuItem;
  setSelectedMenu: (menuItem: MenuItem) => void;
  menuPin: MenuItem;
}

function Menu(props: Props) {
  const { selectedMenu, setSelectedMenu, menuPin } = props;

  const buildMenu = useCallback(() => {
    const list: { name: MenuItem; icon: JSX.Element }[] = [
      { name: "bitcoin", icon: <BitcoinIcon /> },
      { name: "nostr", icon: <GiBirdTwitter /> },
      // { name: 'lightning', icon: <MdElectricBolt />},
      // { name: 'ecash', icon: null},
    ];
    return (
      <>
        {list.map((menu, index) => (
          <HStack key={index}>
            <Button
              variant={selectedMenu === menu.name ? "solid" : "transparent"}
              leftIcon={menu.icon}
              onClick={e => {
                e.preventDefault();
                setSelectedMenu(menu.name);
              }}
            >
              {menu.name.charAt(0).toUpperCase() + menu.name.slice(1)}
            </Button>

            {TabPin(menu.name, { key: "menuPin", value: menuPin }, "base")}
          </HStack>
        ))}
      </>
    );
  }, [selectedMenu, menuPin]);

  return <VStack>{buildMenu()}</VStack>;
}

export default Menu;
