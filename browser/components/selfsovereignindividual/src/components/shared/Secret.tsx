import React, { useCallback, useState } from "react";
import { HStack, IconButton, Text } from "@chakra-ui/react";
import { LuEye, LuEyeOff, MdOutlineContentCopy } from "./react-icons/Icons";
import { promptForPrimaryPassword } from "./utils";
import AlertPrimaryPassword from "./AlertPrimaryPassword";

export default function Secret(props: {
  value: string;
  onChangeVisibility;
  usedPrimarypasswordToSettings: boolean;
  primaryPasswordEnabled: boolean;
  platform: string;
  textProps?;
}) {
  const [visible, setVisible] = useState(false);
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const {
    value,
    textProps,
    onChangeVisibility,
    usedPrimarypasswordToSettings,
    primaryPasswordEnabled,
    platform,
  } = props;

  const maskedValue = useCallback(() => "*".repeat(value.length), [value]);

  const handleToggole = async () => {
    if (visible === false && usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-secrets-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        if (!primaryPasswordEnabled && platform === "linux") {
          setIsOpenDialog(true);
        }
        return;
      }
    }

    setVisible(prev => !prev);
    onChangeVisibility();
  };
  const handleCopy = async () => {
    if (visible === false && usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignindividual-access-secrets-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        if (!primaryPasswordEnabled && platform === "linux") {
          setIsOpenDialog(true);
        }
        return;
      }
    }

    navigator.clipboard
      .writeText(value)
      .then(() => {
        alert("Copied!");
      })
      .catch(error => {
        console.error(error);
        alert(`Failed to copy: ${error}`);
      });
  };

  const cancelRef = React.useRef();
  const onCloseDialog = () => {
    setIsOpenDialog(false);
  };

  return (
    <>
      <HStack>
        {visible ? (
          <Text {...textProps}>{value}</Text>
        ) : (
          <Text {...textProps}>{maskedValue()}</Text>
        )}
        <IconButton
          icon={visible ? <LuEyeOff /> : <LuEye />}
          variant="transparent"
          aria-label="Toggle secret visibility"
          onClick={handleToggole}
        />
        <IconButton
          icon={<MdOutlineContentCopy />}
          variant="transparent"
          aria-label="Copy secret"
          onClick={handleCopy}
        />
      </HStack>
      <AlertPrimaryPassword
        isOpen={isOpenDialog}
        onClose={onCloseDialog}
        cancelRef={cancelRef}
      />
    </>
  );
}
