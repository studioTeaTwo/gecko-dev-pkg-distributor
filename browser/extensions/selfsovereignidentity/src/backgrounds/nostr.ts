import { state } from "./state"

async function init() {
  console.log("experimental-api start...")

  const credentials = await (
    browser as FixMe
  ).addonsSelfsovereignidentity.searchCredentialsAsync(
    "nostr",
    "nsec",
    true,
    ""
  )
  console.log("background init!", credentials)

  state.nostr = credentials[0].identifier || ""
}

init()
