export function promptForPrimaryPassword(messageId) {
  return new Promise((resolve) => {
    window.AboutSelfsovereignidentityUtils.promptForPrimaryPassword(
      resolve,
      messageId
    )
  })
}
