import React, { useCallback, useState } from "react"
import { HStack, IconButton, Text } from "@chakra-ui/react"
import { LuEye, LuEyeOff } from "react-icons/lu"
import { promptForPrimaryPassword } from "../../shared/utils"

export default function Secret(props: {
  value: string
  onChangeVisibility
  usedPrimarypasswordToSettings
  textProps?
}) {
  const [visible, setVisible] = useState(false)
  const {
    value,
    textProps,
    onChangeVisibility,
    usedPrimarypasswordToSettings,
  } = props

  const maskedValue = useCallback(() => "*".repeat(value.length), [value])

  const handleToggole = async () => {
    if (visible === false && usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-secrets-os-auth-dialog-message"
      )
      if (!primaryPasswordAuth) {
        alert("sorry!")
        return
      }
    }

    setVisible((prev) => !prev)
    onChangeVisibility()
  }

  return (
    <HStack>
      {visible ? (
        <Text {...textProps}>{value}</Text>
      ) : (
        <Text {...textProps}>{maskedValue()}</Text>
      )}
      <IconButton
        icon={visible ? <LuEyeOff /> : <LuEye />}
        variant="transparent"
        aria-label="Toggle password visibility"
        onClick={handleToggole}
      />
    </HStack>
  )
}
