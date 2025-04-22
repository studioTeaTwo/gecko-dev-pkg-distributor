import React, { useState } from "react";
import {
  Grid,
  GridItem,
  HStack,
  StackDivider,
  Switch,
  VStack,
} from "@chakra-ui/react";
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import { authorizePrimaryPassword } from "../shared/ipc";
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword";
import { SelfSovereignIndividualDefaultProps } from "../../custom.type";

export default function More(props: SelfSovereignIndividualDefaultProps) {
  const { prefs } = props;
  const { onPrefChanged } = dispatchEvents;

  const [isOpenDialog, setIsOpenDialog] = useState(false);
  // const [error, setError] = useState("");

  const handleUsedPrimarypasswordToSettings = async (checked: boolean) => {
    const isAuthorized = await authorizePrimaryPassword(
      "bitcoin",
      prefs,
      setIsOpenDialog
    );
    if (!isAuthorized) {
      return;
    }

    onPrefChanged({
      protocolName: "bitcoin",
      usedPrimarypasswordToSettings: checked,
    });
  };

  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };

  return (
    <>
      <VStack
        divider={<StackDivider borderColor="gray.200" />}
        spacing={4}
        align="stretch"
      >
        <HStack>
          <Grid gridTemplateColumns={"400px 1fr"} gap={6}>
            <GridItem>
              <label htmlFor="bitcoin-pref-usedPrimarypasswordToSettings">
                Use primary password to setting page
              </label>
            </GridItem>
            <GridItem>
              <Switch
                id="bitcoin-pref-usedPrimarypasswordToSettings"
                isChecked={prefs.bitcoin.usedPrimarypasswordToSettings}
                onChange={e =>
                  handleUsedPrimarypasswordToSettings(e.target.checked)
                }
              />
            </GridItem>
          </Grid>
        </HStack>
      </VStack>
      <AlertPrimaryPassword
        isOpen={isOpenDialog}
        onClose={onCloseDialog}
        cancelRef={cancelRef}
      />
    </>
  );
}
