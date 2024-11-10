import React, { useCallback, useMemo, useState } from "react"
import {
  Box,
  Button,
  Grid,
  GridItem,
  Heading,
  Input,
  InputGroup,
  StackDivider,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react"
import useChildActorEvent, {
  dispatchEvents,
} from "../../hooks/useChildActorEvent"
import { Credential } from "../../custom.type"
import { promptForPrimaryPassword } from "../../shared/utils"
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword"

interface NostrCredential extends Credential {
  properties: {
    pubkey: string
    seckey: string
    displayName: string
  }
}

const SafeProtocols = ["http", "https", "moz-extension"]
export const DefaultTrustedSites = [
  {
    url: "http://localhost",
    permissions: { read: true, write: true, admin: true },
  },
]

export default function NIP07(props) {
  const { prefs, credentials } = useChildActorEvent()
  const { modifyCredentialToStore, onPrefChanged, onPrimaryChanged } =
    dispatchEvents

  const [newSite, setNewSite] = useState("")
  const [isOpenDialog, setIsOpenDialog] = useState(false)
  const [error, setError] = useState("")

  const nostrkeys = useMemo(
    () =>
      credentials
        .filter((credential) => credential.protocolName === "nostr")
        .sort((a, b) => (b.primary ? 1 : 0)) as NostrCredential[],
    [credentials]
  )

  const handleUsedTrustedSites = async (checked: boolean) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      )
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true)
        return
      }
    }

    onPrefChanged({ protocolName: "nostr", usedTrustedSites: checked })
  }

  const handleNewSiteChange = (e) => setNewSite(e.target.value)
  const handleRegistSite = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault()

    if (!SafeProtocols.some((protocol) => newSite.startsWith(protocol))) {
      alert(`Currently, only supports ${SafeProtocols.join(",")}.`)
      return
    }
    // TODO(ssb): improve the match method, such as supporting glob.
    const found = nostrkeys.some((site) =>
      site.trustedSites.some((site) => site.url === newSite)
    )
    if (found) {
      alert("The url exists already.")
      return
    }
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      )
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true)
        return
      }
    }

    for (const item of nostrkeys) {
      modifyCredentialToStore({
        ...item,
        trustedSites: item.trustedSites.concat([
          {
            url: newSite,
            permissions: {
              read: true,
              write: true,
              admin: true,
            },
          },
        ]),
      })
    }

    // Notify to the buit-in extension
    // TODO(ssb): make TrustedSitesChanged a separate event.
    setTimeout(() => {
      const primary = nostrkeys.find((key) => key.primary)
      onPrimaryChanged({ protocolName: "nostr", guid: primary.guid })
    }, 100)
  }

  const handleRemoveSite = async (removedSite) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      )
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true)
        return
      }
    }

    for (const item of nostrkeys) {
      modifyCredentialToStore({
        ...item,
        trustedSites: item.trustedSites.filter(
          (site) => site.url !== removedSite.url
        ),
      })
    }

    // Notify to the buit-in extension
    // TODO(ssb): make TrustedSitesChanged a separate event.
    setTimeout(() => {
      const primary = nostrkeys.find((key) => key.primary)
      onPrimaryChanged({ protocolName: "nostr", guid: primary.guid })
    }, 100)
  }

  const getTrustedSites = useCallback(() => {
    const trustedSites = Array.from(
      new Set(
        nostrkeys
          .map((key) => key.trustedSites)
          .flat()
          .map((site) => JSON.stringify(site))
      )
    ).map((site) => JSON.parse(site))
    return (
      <>
        {trustedSites.map((site) => (
          <>
            <GridItem>
              <Heading as="h5" size="sm">
                {site.url}
              </Heading>
            </GridItem>
            <GridItem>
              <Button
                variant="outline"
                colorScheme="blue"
                onClick={() => handleRemoveSite(site)}
              >
                remove
              </Button>
            </GridItem>
          </>
        ))}
      </>
    )
  }, [nostrkeys])

  const handleUsedBuiltInNip07 = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()

    const checked = e.target.checked
    onPrefChanged({ protocolName: "nostr", usedBuiltInNip07: checked })
  }

  const handleUsedPrimarypasswordToApps = async (checked: boolean) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      )
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true)
        return
      }
    }

    onPrefChanged({ protocolName: "nostr", usedPrimarypasswordToApps: checked })
  }

  const handleUsedAccountChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()

    const checked = e.target.checked
    onPrefChanged({ protocolName: "nostr", usedAccountChanged: checked })
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
        <Box>
          <Grid gridTemplateColumns={"400px 1fr"} gap={6}>
            <GridItem colSpan={2}>
              <Text fontSize="xs">
                You can still use these features with your keys on
                extensions/apps compatible with this browser, if turning off
                &quot;built-in NIP-07&quot;.
              </Text>
            </GridItem>
            <GridItem>
              <label htmlFor="nostr-pref-usedBuiltInNip07">
                Use built-in NIP-07
              </label>
            </GridItem>
            <GridItem>
              <Switch
                id="nostr-pref-usedBuiltInNip07"
                isChecked={prefs.nostr.usedBuiltInNip07}
                onChange={handleUsedBuiltInNip07}
              />
            </GridItem>
            {/* <GridItem>
            <label htmlFor="nostr-pref-usedPrimarypasswordToApps">
              Use primary password to Web apps
            </label>
          </GridItem>
          <GridItem>
            <Switch
              id="nostr-pref-usedPrimarypasswordToApps"
              isChecked={prefs.nostr.usedPrimarypasswordToApps}
              onChange={(e) => handleUsedPrimarypasswordToApps(e.target.checked)}
            />
          </GridItem> */}
            <GridItem>
              <label htmlFor="nostr-pref-usedAccountChanged">
                Notify &quot;Account Changed&quot; to Web apps
              </label>
            </GridItem>
            <GridItem>
              <Switch
                id="nostr-pref-usedAccountChanged"
                isChecked={prefs.nostr.usedAccountChanged}
                onChange={handleUsedAccountChanged}
              />
            </GridItem>
          </Grid>
        </Box>
        <Box>
          <Grid gridTemplateColumns={"400px 1fr"} gap={6}>
            <GridItem colSpan={2}>
              <Heading as="h4" size="md">
                Trusted Sites
              </Heading>
            </GridItem>
            <GridItem>
              <label htmlFor="nostr-pref-usedTrustedSites">Enable</label>
            </GridItem>
            <GridItem>
              <Switch
                id="nostr-pref-usedTrustedSites"
                isChecked={prefs.nostr.usedTrustedSites}
                onChange={(e) => handleUsedTrustedSites(e.target.checked)}
              />
            </GridItem>
            <GridItem>
              <label>Register</label>
            </GridItem>
            <GridItem>
              <InputGroup>
                <Input
                  placeholder="https://example/"
                  value={newSite}
                  onChange={handleNewSiteChange}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleRegistSite(e)
                    }
                  }}
                  maxW="500px"
                />
                <Button
                  variant="outline"
                  colorScheme="blue"
                  onClick={handleRegistSite}
                >
                  Regist
                </Button>
              </InputGroup>
            </GridItem>
            {getTrustedSites()}
          </Grid>
        </Box>
      </VStack>
      <AlertPrimaryPassword
        isOpen={isOpenDialog}
        onClose={onCloseDialog}
        cancelRef={cancelRef}
      />
    </>
  )
}
