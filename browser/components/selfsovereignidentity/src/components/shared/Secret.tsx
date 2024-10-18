import React, { useCallback, useState } from "react"
import { HStack, IconButton, Text } from "@chakra-ui/react"
import { LuEye, LuEyeOff } from "react-icons/lu"

export default function Secret(props: {
  value: string
  onChangeVisibility
  textProps?
}) {
  const [visible, setVisible] = useState(false)
  const { value, textProps, onChangeVisibility } = props

  const maskedValue = useCallback(() => {
    let val = ""
    for (let i = 0; i < value.length; i++) {
      val += "*"
    }
    return val
  }, [value])

  const handleToggole = () => {
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
