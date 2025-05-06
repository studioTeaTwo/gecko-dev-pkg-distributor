import React, { useState } from "react";
import {
  AboutSelfSovereignIndividualStates,
  ProtocolName,
} from "../custom.type";

export const StateContext = React.createContext<{
  states: AboutSelfSovereignIndividualStates;
  resetState: () => void;
  updateState: (
    protocolName: ProtocolName,
    value: Partial<
      AboutSelfSovereignIndividualStates[keyof AboutSelfSovereignIndividualStates]
    >
  ) => void;
}>(null);

const DefaultState = {
  bitcoin: {
    editingNo: -1,
    editingUrl: "",
  },
  nostr: {
    editingNo: -1,
    editingUrl: "",
  },
};

export const StateProvider = ({ children }: { children: React.ReactNode }) => {
  const [states, setStates] = useState<AboutSelfSovereignIndividualStates>({
    ...DefaultState,
  });

  function updateState(
    protocolName: ProtocolName,
    value: Partial<
      AboutSelfSovereignIndividualStates[keyof AboutSelfSovereignIndividualStates]
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
