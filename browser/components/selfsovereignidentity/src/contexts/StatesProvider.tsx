import React, { useState } from "react";
import { AboutSelfsovereignidentityStates, ProtocolName } from "../custom.type";

export const StateContext = React.createContext<{
  states: AboutSelfsovereignidentityStates;
  resetState: () => void;
  updateState: (
    protocolName: ProtocolName,
    value: Partial<
      AboutSelfsovereignidentityStates[keyof AboutSelfsovereignidentityStates]
    >
  ) => void;
}>(null);

const DefaultState = {
  nostr: {
    editingNo: -1,
    editingUrl: "",
  },
};

export const StateProvider = ({ children }: { children: React.ReactNode }) => {
  const [states, setStates] = useState<AboutSelfsovereignidentityStates>({
    ...DefaultState,
  });

  function updateState(
    protocolName: ProtocolName,
    value: Partial<
      AboutSelfsovereignidentityStates[keyof AboutSelfsovereignidentityStates]
    >
  ) {
    setStates(prev => {
      const current = { ...prev[protocolName] };
      prev[protocolName] = { ...current, ...value };
      return { ...prev };
    });
  }

  function resetState() {
    setStates({ ...DefaultState });
  }

  return (
    <StateContext.Provider value={{ states, resetState, updateState }}>
      {children}
    </StateContext.Provider>
  );
};
