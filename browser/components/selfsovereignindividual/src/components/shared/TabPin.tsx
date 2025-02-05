import React from "react";
import { IconButton } from "@chakra-ui/react";
import { LuPinOff, LuPin } from "./react-icons/Icons";
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import { type MenuItem } from "../../custom.type";

type PinName = "menuPin" | "tabPin" | "tabPinInNip07";

export default function TabPin(
  tabId: string,
  pref: { key: PinName; value: string },
  prtocolName: MenuItem | "base"
) {
  const { onPrefChanged } = dispatchEvents;

  return (
    <IconButton
      variant="transparent"
      aria-label="Toggle Pin"
      onClick={e => {
        e.preventDefault();
        onPrefChanged({ protocolName: prtocolName, [pref.key]: tabId });
      }}
    >
      {tabId === pref.value ? <LuPinOff /> : <LuPin />}
    </IconButton>
  );
}
