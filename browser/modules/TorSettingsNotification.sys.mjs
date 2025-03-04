const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
  TorSettings: "resource://gre/modules/TorSettings.sys.mjs",
  TorSettingsTopics: "resource://gre/modules/TorSettings.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "NotificationStrings", function () {
  return new Localization(["toolkit/global/tor-browser.ftl"]);
});

/**
 * Shows a notification whenever we get an ApplyError.
 */
export const TorSettingsNotification = {
  /**
   * Whether we have already been initialised.
   *
   * @type {boolean}
   */
  _initialized: false,

  /**
   * Called when the UI is ready to show a notification.
   */
  ready() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;
    Services.obs.addObserver(this, lazy.TorSettingsTopics.ApplyError);

    // Show the notification for each group of settings if they have an error
    // that was triggered prior to `ready` being called.
    this.showNotification("bridges");
    this.showNotification("proxy");
    this.showNotification("firewall");
  },

  observe(subject, topic) {
    if (topic === lazy.TorSettingsTopics.ApplyError) {
      this.showNotification(subject.wrappedJSObject.group);
    }
  },

  /**
   * A promise for the `showNotification` method to ensure we only show one
   * notification at a time.
   *
   * @type {?Promise}
   */
  _notificationPromise: null,

  /**
   * Show a notification for the given group of settings if `TorSettings` has an
   * error for them.
   *
   * @param {string} group - The settings group to show the notification for.
   */
  async showNotification(group) {
    const prevNotificationPromise = this._notificationPromise;
    let notificationComplete;
    ({ promise: this._notificationPromise, resolve: notificationComplete } =
      Promise.withResolvers());
    // Only want to show one notification at a time, so queue behind the
    // previous one.
    await prevNotificationPromise;

    // NOTE: We only show the notification for a single `group` at a time, even
    // when TorSettings has errors for multiple groups. This keeps the strings
    // simple and means we can show different buttons depending on `canUndo` for
    // each group individually.
    // If we do have multiple errors the notification for each group will simply
    // queue behind each other.
    try {
      // Grab the latest error value, which may have changed since
      // showNotification was first called.
      const error = lazy.TorSettings.getApplyError(group);
      if (!error) {
        // No current error for this group.
        return;
      }

      const { canUndo } = error;

      let titleId;
      let introId;
      switch (group) {
        case "bridges":
          titleId = "tor-settings-failed-notification-title-bridges";
          introId = "tor-settings-failed-notification-cause-bridges";
          break;
        case "proxy":
          titleId = "tor-settings-failed-notification-title-proxy";
          introId = "tor-settings-failed-notification-cause-proxy";
          break;
        case "firewall":
          titleId = "tor-settings-failed-notification-title-firewall";
          introId = "tor-settings-failed-notification-cause-firewall";
          break;
      }

      const [
        titleText,
        introText,
        bodyText,
        primaryButtonText,
        secondaryButtonText,
      ] = await lazy.NotificationStrings.formatValues([
        { id: titleId },
        { id: introId },
        {
          id: canUndo
            ? "tor-settings-failed-notification-body-undo"
            : "tor-settings-failed-notification-body-default",
        },
        {
          id: canUndo
            ? "tor-settings-failed-notification-button-undo"
            : "tor-settings-failed-notification-button-clear",
        },
        { id: "tor-settings-failed-notification-button-fix-myself" },
      ]);

      const propBag = await Services.prompt.asyncConfirmEx(
        lazy.BrowserWindowTracker.getTopWindow()?.browsingContext ?? null,
        Services.prompt.MODAL_TYPE_INTERNAL_WINDOW,
        titleText,
        // Concatenate the intro text and the body text. Really these should be
        // separate paragraph elements, but the prompt service does not support
        // this. We split them with a double newline, which will hopefully avoid
        // the usual problems with concatenating localised strings.
        `${introText}\n\n${bodyText}`,
        Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0 +
          Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1,
        primaryButtonText,
        secondaryButtonText,
        null,
        null,
        null,
        {}
      );

      const buttonNum = propBag.get("buttonNumClicked");

      if (buttonNum === 0) {
        if (canUndo) {
          // Wait for these methods in case they resolve the error for a pending
          // showNotification call.
          await lazy.TorSettings.undoFailedSettings(group);
        } else {
          await lazy.TorSettings.clearFailedSettings(group);
        }
      } else if (buttonNum === 1) {
        let win = lazy.BrowserWindowTracker.getTopWindow();
        if (!win) {
          win = await lazy.BrowserWindowTracker.promiseOpenWindow();
        }
        // Open the preferences or switch to its tab and highlight the Tor log.
        win.openPreferences("connection-viewlogs");
      }
    } finally {
      notificationComplete();
    }
  },
};
