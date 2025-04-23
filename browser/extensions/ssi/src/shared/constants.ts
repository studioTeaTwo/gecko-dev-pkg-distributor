import { ProtocolName } from "src/custom.type";

// NOTE(ssb): Currently firefox does not support externally_connectable.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable
export const SafeProtocols = ["http", "https", "moz-extension"];

export const ERR_MSG_NOT_ENABLED = (protocolName: ProtocolName) =>
  `window.ssi.${protocolName} is not enabled or no key is registered. The user can confirm and edit it in 'about:selfsovereignindividual'.`;
export const ERR_MSG_NOT_SUPPORTED = `This protocol is not spported. Currently, only supports ${SafeProtocols.join(",")}.`;
