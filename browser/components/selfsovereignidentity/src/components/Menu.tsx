import React, { useCallback } from "react"
import { VStack, Button } from "@chakra-ui/react"
import { MdElectricBolt } from "react-icons/md"
import { GiBirdTwitter } from "react-icons/gi"
import BitcoinIcon from "./bitcoin/Logo"

function Menu(props) {
  return (
    <VStack>
      <Button
        variant={ props.selectedMenu === "nostr" ? "solid" : "transparent" }
        leftIcon={<GiBirdTwitter />}
        onClick={() => props.setMenu("nostr")}
      >
        Nostr
      </Button>
      <Button
        variant={ props.selectedMenu === "bitcoin" ? "solid" : "transparent" }
        leftIcon={<BitcoinIcon />}
        onClick={() => props.setMenu("bitcoin")}
      >
        Bitcoin
      </Button>
      <Button
        variant={ props.selectedMenu === "lightning" ? "solid" : "transparent" }
        leftIcon={<MdElectricBolt />}
        onClick={() => props.setMenu("lightning")}
      >
        Lightning
      </Button>
      <Button
        variant={ props.selectedMenu === "ecash" ? "solid" : "transparent" }
        // leftIcon={}
        onClick={() => props.setMenu("ecash")}
      >
        eCash
      </Button>
    </VStack>
  )
}

export default Menu
