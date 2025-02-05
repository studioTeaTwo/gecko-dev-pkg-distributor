export function promptForPrimaryPassword(messageId) {
  return new Promise(resolve => {
    window.AboutSelfSovereignIndividualUtils.promptForPrimaryPassword(
      resolve,
      messageId
    );
  });
}
