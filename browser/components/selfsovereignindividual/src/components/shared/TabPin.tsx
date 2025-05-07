import React from "react";
import { Box } from "@chakra-ui/react";
import { LuPinOff, LuPin } from "./react-icons/Icons";
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import { ProtocolName } from "../../custom.type";

type PinName = "menuPin" | "tabPin" | "tabPinInNip07";

export default function TabPin(
  tabId: string,
  pref: { key: PinName; value: string },
  prtocolName: ProtocolName | "base"
) {
  const { onPrefChanged } = dispatchEvents;

  return (
    <Box
      onClick={e => {
        e.preventDefault();
        onPrefChanged({ protocolName: prtocolName, [pref.key]: tabId });
      }}
      ml={2}
    >
      {tabId === pref.value ? <LuPin /> : <LuPinOff />}
    </Box>
  );
}
