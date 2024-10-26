import { state } from "./state"

// The message listener to listen to experimental-apis calls
// After, those calls get passed on to the content scripts.
const callback = async (newGuid: string) => {
  const credentials =
    await browser.addonsSelfsovereignidentity.searchCredentialsAsync(
      "nostr",
      "nsec",
      true,
      newGuid
    )
  console.log("primary changed!", newGuid, credentials)

  state.nostr = credentials[0].identifier || ""

  // Send the message to the contents
  browser.tabs.query({ status: "complete", discarded: false }).then((tabs) => {
    for (const tab of tabs) {
      console.log("send to tab: ", tab)
      if (tab.url.startsWith("http")) {
        browser.tabs
          .sendMessage(tab.id, {
            action: "nostr/accountChanged",
            args: { npub: state.nostr },
          })
          .catch()
      }
    }
  })
}
browser.addonsSelfsovereignidentity.onPrimaryChange.addListener(
  callback,
  "nostr"
)

async function init() {
  console.log("experimental-api start...")

  const credentials =
    await browser.addonsSelfsovereignidentity.searchCredentialsAsync(
      "nostr",
      "nsec",
      true,
      ""
    )
  console.log("background init!", credentials)

  state.nostr = credentials[0].identifier || ""
}

init()
