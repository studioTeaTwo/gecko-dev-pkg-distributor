import React from "react"
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Link,
} from "@chakra-ui/react"

export default function AlertPrimaryPassword(props) {
  const { cancelRef, onClose, isOpen } = props

  return (
    <AlertDialog
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isOpen={isOpen}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader> Sorry!</AlertDialogHeader>
          <AlertDialogCloseButton />
          <AlertDialogBody>
            Please set{" "}
            <Link
              color="teal.500"
              href="https://support.mozilla.org/en-US/kb/use-primary-password-protect-stored-logins?as=u&utm_source=inproduct&redirectslug=use-master-password-protect-stored-logins&redirectlocale=en-US"
              isExternal
            >
              primary password
            </Link>{" "}
            , or turn off &quot;Use primary password to setting page&quot;.
          </AlertDialogBody>
          <AlertDialogFooter>
            NEXT ACTION
            <br />
            To set, go to &quot;about:preferences#privacy&quot;
            <br />
            To turn off, open &quot;More&quot; tab
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}
