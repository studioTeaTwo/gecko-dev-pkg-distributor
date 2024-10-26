import React, { useCallback, useEffect, useState } from "react"
import { VStack, Button, HStack, IconButton } from "@chakra-ui/react"
import { MdElectricBolt } from "react-icons/md"
import { GiBirdTwitter } from "react-icons/gi"
import BitcoinIcon from "./bitcoin/Logo"
import { MenuItem } from "../custom.type"
import { LuPin, LuPinOff } from "react-icons/lu"

const IDB_NAME = "selfsovereignidentity"
const STORE_NAME = "settings"
const KEY_NAME = "menuPin"

function Menu(props: { selectedMenu: MenuItem; setMenu: Function }) {
  const [menuPin, setMenuPin] = useState<MenuItem>("nostr")
  const [db, setDb] = useState<IDBDatabase>()

  const { selectedMenu, setMenu } = props

  useEffect(() => {
    const request = indexedDB.open(IDB_NAME)
    request.onerror = (event) => {
      console.log(event)
    }
    request.onsuccess = (event) => {
      console.log("indexedDb onsuccess:", event.target.result)
      setDb(event.target.result)
      event.target.result
        .transaction(STORE_NAME)
        .objectStore(STORE_NAME)
        .get(KEY_NAME).onsuccess = (event) => {
        console.log(event.target.result)
        const initialMenu = (event.target.result.value as MenuItem) ?? "nostr"
        setMenuPin(initialMenu)
        setMenu(initialMenu)
      }
    }
    request.onupgradeneeded = (event) => {
      console.log("indexedDb onupgradeneeded:", event.target.result)
      setDb(event.target.result)
      event.target.result.createObjectStore(STORE_NAME, { keyPath: "key" })
    }
  }, [])

  const handleToggole = (selectedPin: MenuItem) => {
    setMenuPin(selectedPin)
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.put({ key: KEY_NAME, value: selectedPin })
    request.onsuccess = (event) => {
      console.log(event)
    }
    request.onerror = (event) => {
      console.log(event)
    }
  }

  const buildMenu = useCallback(() => {
    const list: { name: MenuItem; icon: JSX.Element }[] = [
      { name: "nostr", icon: <GiBirdTwitter /> },
      { name: "bitcoin", icon: <BitcoinIcon /> },
      // { name: 'lightning', icon: <MdElectricBolt />},
      // { name: 'ecash', icon: null},
    ]
    return (
      <>
        {list.map((menu, index) => (
          <HStack key={index}>
            <Button
              variant={selectedMenu === menu.name ? "solid" : "transparent"}
              leftIcon={menu.icon}
              onClick={(e) => {
                e.preventDefault()
                setMenu(menu.name)
              }}
            >
              {menu.name.charAt(0).toUpperCase() + menu.name.slice(1)}
            </Button>

            <IconButton
              icon={menuPin === menu.name ? <LuPinOff /> : <LuPin />}
              variant="transparent"
              aria-label="Toggle Pin"
              onClick={(e) => {
                e.preventDefault()
                handleToggole(menu.name)
              }}
            />
          </HStack>
        ))}
      </>
    )
  }, [selectedMenu, menuPin, db])

  return <VStack>{buildMenu()}</VStack>
}

export default Menu
