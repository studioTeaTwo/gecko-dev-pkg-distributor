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
    this._isActive = true;

    const { TorStrings } = ChromeUtils.importESModule(
      "resource://gre/modules/TorStrings.sys.mjs"
    );

    this.button = document.getElementById("tor-connect-urlbar-button");
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

    this._observeTopic = TorConnectTopics.StateChange;
    this._stateListener = {
      observe: (subject, topic) => {
        if (topic !== this._observeTopic) {
          return;
        }
        this._torConnectStateChanged();
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

    this._torConnectStateChanged();
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
    TorConnect.openTorConnect({ beginBootstrap: true });
  },

  /**
   * Callback for when the TorConnect state changes.
   */
  _torConnectStateChanged() {
    if (TorConnect.state === TorConnectState.Disabled) {
      // NOTE: We do not uninit early when we reach the
      // TorConnectState.Bootstrapped state because we can still leave the
      // Bootstrapped state if the tor process exists early and needs a restart.
      this.uninit();
      return;
    }
    this._updateButtonVisibility();
  },

  /**
   * Callback when the TorConnect state, current browser location, or activation
   * state changes.
   */
  _updateButtonVisibility() {
    if (!this.button) {
      return;
    }
    // NOTE: We do not manage focus when hiding the button. We only expect to
    // move from "not hidden" to "hidden" when:
    // + switching tabs to "about:torconnect", or
    // + starting bootstrapping.
    //
    // When switching tabs, the normal tab switching logic will eventually move
    // focus to the new tab or url bar, so whilst the focus may be lost
    // temporarily when we hide the button, it will be re-established quickly on
    // tab switch.
    //
    // And we don't expect bootstrapping to start whilst outside of the
    // "about:torconnect", and the automatic bootstrapping should only trigger
    // at the initial start.
    this.button.hidden =
      !this._isActive ||
      this._inAboutTorConnectTab ||
      !TorConnect.enabled ||
      !TorConnect.canBeginBootstrap;
    this.button.classList.toggle(
      "tor-urlbar-button-plain",
      TorConnect.potentiallyBlocked
    );
  },
};
