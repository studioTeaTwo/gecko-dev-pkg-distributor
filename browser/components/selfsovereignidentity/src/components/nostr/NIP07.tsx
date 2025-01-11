import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  Grid,
  GridItem,
  Heading,
  Input,
  InputGroup,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  StackDivider,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react";
import { dispatchEvents } from "../../hooks/useChildActorEvent";
import {
  Credential,
  SelfsovereignidentityDefaultProps,
} from "../../custom.type";
import { promptForPrimaryPassword } from "../../shared/utils";
import AlertPrimaryPassword from "../shared/AlertPrimaryPassword";

interface NostrCredential extends Credential {
  properties: {
    pubkey: string;
    seckey: string;
    displayName: string;
  };
}

const SafeProtocols = ["http", "https", "moz-extension"];
export const DefaultTrustedSites = [
  {
    name: "",
    url: "http://localhost",
    permissions: { read: true, write: true, admin: true },
  },
];

const OneHour = 60 * 60 * 1000;

export default function NIP07(props: SelfsovereignidentityDefaultProps) {
  const { prefs, credentials } = props;
  const { modifyCredentialToStore, onPrefChanged } = dispatchEvents;

  const [newSite, setNewSite] = useState("");
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const [error, setError] = useState("");

  const nostrkeys = useMemo(
    () =>
      credentials
        .filter(credential => credential.protocolName === "nostr")
        .sort((a, b) => (b.primary ? 1 : 0)) as NostrCredential[],
    [credentials]
  );

  const handleUsedTrustedSites = async (checked: boolean) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    onPrefChanged({ protocolName: "nostr", usedTrustedSites: checked });
  };

  const handleNewSiteChange = e => setNewSite(e.target.value);
  const handleRegisterSite = async (
    e:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();

    if (!SafeProtocols.some(protocol => newSite.startsWith(protocol))) {
      alert(`Currently, only supports ${SafeProtocols.join(",")}.`);
      return;
    }
    // TODO(ssb): improve the match method, such as supporting glob.
    const found = nostrkeys.some(site =>
      site.trustedSites.some(site => site.url === newSite)
    );
    if (found) {
      alert("The url exists already.");
      return;
    }
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    for (const item of nostrkeys) {
      modifyCredentialToStore(
        {
          guid: item.guid,
          trustedSites: item.trustedSites.concat({
            name: "",
            url: newSite,
            permissions: {
              read: true,
              write: true,
              admin: true,
            },
          }),
        },
        newSite.startsWith("moz-extension")
          ? { newExtensionForTrustedSite: newSite }
          : null
      );
    }
  };

  const handleRemoveSite = async removedSite => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    for (const item of nostrkeys) {
      modifyCredentialToStore({
        guid: item.guid,
        trustedSites: item.trustedSites.filter(
          site => site.url !== removedSite.url
        ),
      });
    }
  };

  const getTrustedSites = useCallback(() => {
    const trustedSites = Array.from(
      new Set(
        nostrkeys
          .map(key => key.trustedSites)
          .flat()
          .map(site => JSON.stringify(site))
      )
    ).map(site => JSON.parse(site));
    return (
      <>
        {trustedSites.map(site => (
          <>
            <GridItem>
              <Heading as="h5" size="sm">
                {site.url}
                {site.name && <>&nbsp;&#40;{site.name}&#41;</>}
              </Heading>
            </GridItem>
            <GridItem>
              <Button
                variant="outline"
                colorScheme="blue"
                onClick={() => handleRemoveSite(site)}
              >
                Remove from All keys
              </Button>
            </GridItem>
          </>
        ))}
      </>
    );
  }, [nostrkeys]);

  const handleUsedBuiltinNip07 = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const checked = e.target.checked;
    onPrefChanged({ protocolName: "nostr", usedBuiltinNip07: checked });
  };

  const handleUsedPrimarypasswordToApps = async (checked: boolean) => {
    if (prefs.nostr.usedPrimarypasswordToSettings) {
      const primaryPasswordAuth = await promptForPrimaryPassword(
        "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
      );
      if (!primaryPasswordAuth) {
        setIsOpenDialog(true);
        return;
      }
    }

    onPrefChanged({
      protocolName: "nostr",
      usedPrimarypasswordToApps: checked,
    });
  };
  const handleExpiryTimeForPrimarypasswordToApps = async (
    valueAsString: string,
    valueAsNumber: number
  ) => {
    const primaryPasswordAuth = await promptForPrimaryPassword(
      "about-selfsovereignidentity-access-authlocked-os-auth-dialog-message"
    );
    if (!primaryPasswordAuth) {
      setIsOpenDialog(true);
      return;
    }

    onPrefChanged({
      protocolName: "nostr",
      expiryTimeForPrimarypasswordToApps: valueAsNumber * OneHour,
    });
  };

  const handleUsedAccountChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const checked = e.target.checked;
    onPrefChanged({ protocolName: "nostr", usedAccountChanged: checked });
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
        <Box>
          <Grid gridTemplateColumns={"400px 1fr"} gap={6}>
            <GridItem colSpan={2}>
              <Text fontSize="xs">
                You can still use these features realated to your keys on
                extensions/apps compatible with this browser, even if turning
                off &quot;Use built-in NIP-07&quot;.
              </Text>
            </GridItem>
            <GridItem>
              <label htmlFor="nostr-pref-usedBuiltinNip07">
                Use built-in NIP-07
              </label>
            </GridItem>
            <GridItem>
              <Switch
                id="nostr-pref-usedBuiltinNip07"
                isChecked={prefs.nostr.usedBuiltinNip07}
                onChange={handleUsedBuiltinNip07}
              />
            </GridItem>
            <GridItem>
              <label htmlFor="nostr-pref-usedPrimarypasswordToApps">
                Use primary password to Web apps
              </label>
            </GridItem>
            <GridItem>
              <Switch
                id="nostr-pref-usedPrimarypasswordToApps"
                isChecked={prefs.nostr.usedPrimarypasswordToApps}
                onChange={e =>
                  handleUsedPrimarypasswordToApps(e.target.checked)
                }
              />
            </GridItem>
            {prefs.nostr.usedPrimarypasswordToApps && (
              <>
                <GridItem>
                  <label htmlFor="nostr-pref-expiryTimeForPrimarypasswordToApps">
                    Expiry Hour
                  </label>
                </GridItem>
                <GridItem>
                  <NumberInput
                    id="nostr-pref-expiryTimeForPrimarypasswordToApps"
                    value={
                      prefs.nostr.expiryTimeForPrimarypasswordToApps / OneHour
                    }
                    onChange={handleExpiryTimeForPrimarypasswordToApps}
                    min={0}
                    size="sm"
                    maxW={20}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </GridItem>
              </>
            )}
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
                onChange={e => handleUsedTrustedSites(e.target.checked)}
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
                  onKeyPress={e => {
                    if (e.key === "Enter") {
                      handleRegisterSite(e);
                    }
                  }}
                  maxW="500px"
                />
                <Button
                  variant="outline"
                  colorScheme="blue"
                  onClick={handleRegisterSite}
                >
                  Register to All keys
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
  );
}
