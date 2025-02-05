import { type Credential } from "../../custom.type";
import { dispatchEvents } from "../../hooks/useChildActorEvent";

const { modifyCredentialToStore, onPrimaryChanged } = dispatchEvents;

export function changePrimary(
  guid: string,
  checked: boolean,
  keys: Credential[]
) {
  let newPrimaryGuid = "";

  if (checked === true) {
    // Set the current primary to false
    const prevs = keys.filter(key => key.primary);
    for (const prev of prevs) {
      modifyCredentialToStore({
        guid: prev.guid,
        primary: false,
      });
    }
    newPrimaryGuid = guid;
  } else {
    // Set the first of current falses to primary
    const prev = keys.find(key => !key.primary);
    if (prev) {
      modifyCredentialToStore({
        guid: prev.guid,
        primary: true,
      });
      newPrimaryGuid = prev.guid;
    }
  }

  // setTimeout, because of making state change order in hooks ensured
  setTimeout(() => {
    modifyCredentialToStore({
      guid,
      primary: checked,
    });
  });

  // Notify to the buit-in extension
  onPrimaryChanged({ protocolName: "nostr", guid: newPrimaryGuid });
}
