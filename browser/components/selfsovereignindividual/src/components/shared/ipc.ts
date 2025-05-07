/**
 * Communicate with another process, `browser/components/selfsovereignindividual/actors`.
 */

import {
  CredentialName,
  ProtocolName,
  SelfSovereignIndividualPrefs,
} from "../../custom.type";

export function generateSecretOnToolkit(
  protocolName: ProtocolName,
  credentialName: CredentialName | "xpub" | "npub",
  option?
) {
  return window.AboutSelfSovereignIndividualUtils.generate(
    protocolName,
    credentialName,
    option
  );
}

export function promptForPrimaryPassword(messageId) {
  return new Promise(resolve => {
    window.AboutSelfSovereignIndividualUtils.promptForPrimaryPassword(
      resolve,
      messageId
    );
  });
}

export async function authorizePrimaryPassword(
  protocolName: ProtocolName,
  prefs: SelfSovereignIndividualPrefs,
  setIsOpenDialog,
  messageId?: string
) {
  if (prefs[protocolName].usedPrimarypasswordToSettings) {
    const primaryPasswordAuth = await promptForPrimaryPassword(
      messageId ??
        "about-selfsovereignindividual-access-authlocked-os-auth-dialog-message"
    );
    if (!primaryPasswordAuth) {
      if (
        !prefs.base.primaryPasswordEnabled &&
        prefs.base.platform === "linux"
      ) {
        setIsOpenDialog(true);
      }
      return false;
    }
  }

  return true;
}
