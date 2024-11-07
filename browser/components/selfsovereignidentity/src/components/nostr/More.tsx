import React, { useState } from "react"
import {
  Grid,
  GridItem,
  HStack,
  StackDivider,
  Switch,
  VStack,
} from "@chakra-ui/react"
import useChildActorEvent, {
  dispatchEvents,
} from "../../hooks/useChildActorEvent"
import { promptForPrimaryPassword } from "../../shared/utils"
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword"

export default function Nostr(props) {
  const { prefs } = useChildActorEvent()
  const { onPrefChanged } = dispatchEvents

  const [isOpenDialog, setIsOpenDialog] = useState(false)
  const [error, setError] = useState("")

  const handleUsedPrimarypasswordToSettings = async (checked: boolean) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      )
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true)
        return
      }
    }

    onPrefChanged({
      protocolName: "nostr",
      usedPrimarypasswordToSettings: checked,
    })
  }

  const cancelRef = React.useRef()
  const onCloseDialog = () => {
    setIsOpenDialog(false)
  }

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
              <label htmlFor="nostr-pref-usedPrimarypasswordToSettings">
                Use primary password to setting page
              </label>
            </GridItem>
            <GridItem>
              <Switch
                id="nostr-pref-usedPrimarypasswordToSettings"
                isChecked={prefs.nostr.usedPrimarypasswordToSettings}
                onChange={(e) =>
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
  )
}
