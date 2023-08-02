// about:tor should cycle its displayed message on each load, this keeps track
// of which message to show globally.

/**
 * @typedef {object} MessageData
 *
 * @property {string} [updateVersion] - The update version to show. If this is
 *   defined, the update message should be shown.
 * @property {string} [updateURL] - The update URL to use when updateVersion is
 *   given.
 * @property {integer} [number] - The number of the message to show, when
 *   updateVersion is not given. This always increases, so the caller should
 *   take its remainder to cycle messages.
 */
export const AboutTorMessage = {
  // NOTE: We always start the count at 0 with every session so that the first
  // message is always shown first.
  _count: 0,

  /**
   * Get details about which message to show on the next about:tor page.
   *
   * @returns {MessageData} Details about the message to show.
   */
  getNext() {
    const shouldNotifyPref = "torbrowser.post_update.shouldNotify";
    if (Services.prefs.getBoolPref(shouldNotifyPref, false)) {
      Services.prefs.clearUserPref(shouldNotifyPref);
      return {
        updateVersion: Services.prefs.getCharPref(
          "browser.startup.homepage_override.torbrowser.version"
        ),
        updateURL:
          Services.prefs.getCharPref("torbrowser.post_update.url", "") ||
          Services.urlFormatter.formatURLPref("startup.homepage_override_url"),
      };
    }
    const number = this._count;
    // Assume the count will not exceed Number.MAX_SAFE_INTEGER.
    this._count++;
    return { number };
  },
};
