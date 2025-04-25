import React, { useState } from "react";
import { SelfSovereignIndividualDefaultProps } from "../../custom.type";
import { Grid, GridItem, Button } from "@chakra-ui/react";
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import { authorizePrimaryPassword } from "../shared/ipc";
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword";

export default function Settings(props: SelfSovereignIndividualDefaultProps) {
  const { prefs, credentials } = props;
  const { onPrimaryChanged, removeAllCredentialsToStore } = dispatchEvents;

  const [isOpenDialog, setIsOpenDialog] = useState(false);

  const handleAllRemove = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (!confirm("All data will be deleted. Okay?")) {
      return;
    }
    const isAuthorized = await authorizePrimaryPassword(
      "nostr",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }

    removeAllCredentialsToStore();

    // Notify to the buit-in extension
    for (const protocolName of ["bitcoin", "nostr"] as const) {
      onPrimaryChanged({ protocolName, guid: "" });
    }
  };

  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };

  return (
    <div>
      <Grid gridTemplateColumns={"100px 1fr"} gap={6} mb="2rem">
        <GridItem>
          <label htmlFor="setting-pref-reset">Delete All data</label>
        </GridItem>
        <GridItem>
          <Button
            variant="outline"
            colorScheme="blue"
            onClick={handleAllRemove}
          >
            Reset
          </Button>
        </GridItem>
      </Grid>
      <AlertPrimaryPassword
        isOpen={isOpenDialog}
        onClose={onCloseDialog}
        cancelRef={cancelRef}
      />
    </div>
  );
}
