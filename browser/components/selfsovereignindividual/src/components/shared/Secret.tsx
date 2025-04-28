import React, { useCallback, useState } from "react";
import { HStack, IconButton, Text } from "@chakra-ui/react";
import { LuEye, LuEyeOff, MdOutlineContentCopy } from "./react-icons/Icons";
import { authorizePrimaryPassword } from "./ipc";
import AlertPrimaryPassword from "./AlertPrimaryPassword";
import { ProtocolName, SelfSovereignIndividualPrefs } from "../../custom.type";

export default function Secret(props: {
  protocolName: ProtocolName;
  value: string;
  onChangeVisibility;
  prefs: SelfSovereignIndividualPrefs;
  textProps?;
}) {
  const [visible, setVisible] = useState(false);
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const { protocolName, value, textProps, onChangeVisibility, prefs } = props;

  const maskedValue = useCallback(() => "*".repeat(value.length), [value]);

  const handleToggole = async () => {
    if (!visible) {
      const isAuthorized = await authorizePrimaryPassword(
        protocolName,
        prefs,
        setIsOpenDialog,
        "about-selfsovereignindividual-access-secrets-os-auth-dialog-message"
      );
      if (!isAuthorized) {
        return;
      }
    }

    setVisible(prev => !prev);
    onChangeVisibility();
  };
  const handleCopy = async () => {
    if (!visible) {
      const isAuthorized = await authorizePrimaryPassword(
        protocolName,
        prefs,
        setIsOpenDialog,
        "about-selfsovereignindividual-access-secrets-os-auth-dialog-message"
      );
      if (!isAuthorized) {
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
