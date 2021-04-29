/* eslint-env mozilla/browser-window */

/**
 * A "Connect" button shown in the urlbar when not connected to tor and in tabs
 * other than about:torconnect.
 */
var gTorConnectUrlbarButton = {
  /**
   * The urlbar button node.
   *
   * @type {Element}
   */
  button: null,
  /**
   * Whether we are active.
   *
   * @type {boolean}
   */
  _isActive: false,
  /**
   * Whether we are in the "about:torconnect" tab.
   *
   * @type {boolean}
   */
  // We init to "true" so that the button can only appear after the first page
  // load.
  _inAboutTorConnectTab: true,

  /**
   * Initialize the button.
   */
  init() {
    if (this._isActive) {
      return;
    }

    this.button = document.getElementById("tor-connect-urlbar-button");

    if (!TorConnect.enabled) {
      // Don't initialise, just hide.
      this._updateButtonVisibility();
      return;
    }

    this._isActive = true;

    const { TorStrings } = ChromeUtils.importESModule(
      "resource://gre/modules/TorStrings.sys.mjs"
    );

    document.getElementById("tor-connect-urlbar-button-label").value =
      TorStrings.torConnect.torConnectButton;
    this.button.addEventListener("click", event => {
      if (event.button !== 0) {
        return;
      }
      this.connect();
    });
    this.button.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      this.connect();
    });

    this._observeTopic = TorConnectTopics.StageChange;
    this._stateListener = {
      observe: (subject, topic) => {
        if (topic !== this._observeTopic) {
          return;
        }
        this._updateButtonVisibility();
      },
    };
    Services.obs.addObserver(this._stateListener, this._observeTopic);

    this._locationListener = {
      onLocationChange: (webProgress, request, locationURI, flags) => {
        if (
          webProgress.isTopLevel &&
          !(flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT)
        ) {
          this._inAboutTorConnectTab =
            gBrowser.selectedBrowser.currentURI?.spec.startsWith(
              "about:torconnect"
            );
          this._updateButtonVisibility();
        }
      },
    };
    // Notified of new locations for the currently selected browser (tab) *and*
    // switching selected browser.
    gBrowser.addProgressListener(this._locationListener);

    this._updateButtonVisibility();
  },

  /**
   * Deactivate and de-initialize the button.
   */
  uninit() {
    if (!this._isActive) {
      return;
    }
    this._isActive = false;

    Services.obs.removeObserver(this._stateListener, this._observeTopic);
    gBrowser.removeProgressListener(this._locationListener);
    this._updateButtonVisibility();
  },

  /**
   * Begin the tor connection bootstrapping process.
   */
  connect() {
    TorConnectParent.open({ beginBootstrapping: "soft" });
  },

  /**
   * Callback when the TorConnect state, current browser location, or activation
   * state changes.
   */
  _updateButtonVisibility() {
    if (!this.button) {
      return;
    }
    const hadFocus = this.button.contains(document.activeElement);
    const hide =
      !this._isActive ||
      this._inAboutTorConnectTab ||
      TorConnect.stageName === TorConnectStage.Bootstrapped;
    this.button.hidden = hide;
    if (hide && hadFocus) {
      // Lost focus. E.g. if the "Connect" button is focused in another window
      // or tab outside of about:torconnect.
      // Move focus back to the URL bar.
      gURLBar.focus();
    }
    // We style the button as a tor purple button if clicking the button will
    // also start a bootstrap. I.e. whether we meet the conditions in
    // TorConnectParent.open.
    const plainButton =
      !this._isActive ||
      !TorConnect.canBeginNormalBootstrap ||
      TorConnect.potentiallyBlocked;
    this.button.classList.toggle("tor-urlbar-button-plain", plainButton);
    this.button.classList.toggle("tor-button", !plainButton);
  },
};
