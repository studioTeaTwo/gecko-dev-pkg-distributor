/* global RPMRemoveMessageListener:false, RPMAddMessageListener:false, RPMSendAsyncMessage:false */

// eslint-disable-next-line no-var
var ssiPanelMessaging = {
  removeMessageListener(messageId, callback) {
    // RPMRemoveMessageListener(messageId, callback);
  },

  addMessageListener(messageId, callback = () => {}) {
    // RPMAddMessageListener(messageId, callback);
  },

  sendMessage(messageId, payload = {}, callback) {
    if (callback) {
      // If we expect something back, we use RPMSendAsyncMessage and not RPMSendQuery.
      // Even though RPMSendQuery returns something, our frame could be closed at any moment,
      // and we don't want to close a RPMSendQuery promise loop unexpectedly.
      // So instead we setup a response event.
      const responseMessageId = `${messageId}_response`;
      // eslint-disable-next-line no-var
      var responseListener = responsePayload => {
        callback(responsePayload);
        this.removeMessageListener(responseMessageId, responseListener);
      };

      this.addMessageListener(responseMessageId, responseListener);
    }

    // Send message
    // RPMSendAsyncMessage(messageId, payload);
  },

  // Click helper to reduce bugs caused by oversight
  // from different implementations of similar code.
  clickHelper(element, { source = "", position }) {
    element?.addEventListener(`click`, event => {
      event.preventDefault();

      this.sendMessage("SSI_openTabWithUrl", {
        url: event.currentTarget.getAttribute(`href`),
        source,
        position,
      });
    });
  },

  log() {
    // RPMSendAsyncMessage("SSI_log", arguments);
  },
};

export default ssiPanelMessaging;
