import { SafeProtocols } from "../shared/constants";

export async function sendTab(
  tab: browser.tabs.Tab,
  action: string,
  data: FixMe
) {
  if (!supported(tab.url)) {
    // browser origin event is not sent anything
    return;
  }

  browser.tabs
    .sendMessage(tab.id, {
      action,
      args: data,
    })
    .catch();
}

export function supported(tabUrl: string): boolean {
  return SafeProtocols.some(protocol => tabUrl.startsWith(protocol));
}
