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
  VStack,
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
          {/* FIXME(ssb): location.href control */}
          <AlertDialogBody>
            Please set{" "}
            <Link
              color="teal.500"
              href="https://support.mozilla.org/en-US/kb/use-primary-password-protect-stored-logins?as=u&utm_source=inproduct&redirectslug=use-master-password-protect-stored-logins&redirectlocale=en-US"
            >
              primary password
            </Link>{" "}
            , or turn off &quot;Use primary password to setting page&quot;.
          </AlertDialogBody>
          <AlertDialogFooter>
            <VStack align="stretch">
              <div>NEXT ACTION</div>
              <div>
                To set, go to{" "}
                <Link color="teal.500" href="about:preferences#privacy">
                  about:preferences#privacy
                </Link>
              </div>
              <div>To turn off, open &quot;More&quot; tab</div>
            </VStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}
