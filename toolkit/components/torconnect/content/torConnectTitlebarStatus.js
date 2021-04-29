/* eslint-env mozilla/browser-window */

/**
 * A TorConnect status shown in the application title bar.
 */
var gTorConnectTitlebarStatus = {
  /**
   * The status element in the title bar.
   *
   * @type {Element}
   */
  node: null,
  /**
   * The status label.
   *
   * @type {Element}
   */
  label: null,
  /**
   * Whether we are connected, or null if the connection state is not yet known.
   *
   * @type {bool?}
   */
  connected: null,

  /**
   * Initialize the component.
   */
  init() {
    const { TorStrings } = ChromeUtils.importESModule(
      "resource://gre/modules/TorStrings.sys.mjs"
    );

    this._strings = TorStrings.torConnect;

    this.node = document.getElementById("tor-connect-titlebar-status");
    this.label = document.getElementById("tor-connect-titlebar-status-label");
    // The title also acts as an accessible name for the role="status".
    this.node.setAttribute("title", this._strings.titlebarStatusName);

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

    this._torConnectStateChanged();
  },

  /**
   * De-initialize the component.
   */
  uninit() {
    Services.obs.removeObserver(this._stateListener, this._observeTopic);
  },

  /**
   * Callback for when the TorConnect state changes.
   */
  _torConnectStateChanged() {
    let textId;
    let connected = false;
    let potentiallyBlocked = false;
    switch (TorConnect.state) {
      case TorConnectState.Disabled:
        // Hide immediately.
        this.node.hidden = true;
        return;
      case TorConnectState.Bootstrapped:
        textId = "titlebarStatusConnected";
        connected = true;
        break;
      case TorConnectState.Bootstrapping:
      case TorConnectState.AutoBootstrapping:
        textId = "titlebarStatusConnecting";
        break;
      default:
        if (TorConnect.potentiallyBlocked) {
          textId = "titlebarStatusPotentiallyBlocked";
          potentiallyBlocked = true;
        } else {
          textId = "titlebarStatusNotConnected";
        }
        break;
    }
    this.label.textContent = this._strings[textId];
    if (this.connected !== connected) {
      // When we are transitioning from
      //   this.connected = false
      // to
      //   this.connected = true
      // we want to animate the transition from the not connected state to the
      // connected state (provided prefers-reduced-motion is not set).
      //
      // If instead we are transitioning directly from the initial state
      //   this.connected = null
      // to
      //   this.connected = true
      // we want to immediately show the connected state without any transition.
      //
      // In both cases, the status will eventually be hidden.
      //
      // We only expect this latter case when opening a new window after
      // bootstrapping has already completed. See tor-browser#41850.
      this.node.classList.toggle(
        "tor-connect-status-animate-transition",
        connected && this.connected !== null
      );
      this.node.classList.toggle("tor-connect-status-connected", connected);
      this.connected = connected;
      if (connected) {
        this._startHiding();
      } else {
        // We can leave the connected state when we are no longer Bootstrapped
        // because the underlying tor process exited early and needs a
        // restart. In this case we want to re-show the status.
        this._stopHiding();
      }
    }
    this.node.classList.toggle(
      "tor-connect-status-potentially-blocked",
      potentiallyBlocked
    );
  },

  /**
   * Mark the component to be hidden after some delay.
   */
  _startHiding() {
    if (this._hidingTimeout) {
      // Already hiding.
      return;
    }
    this._hidingTimeout = setTimeout(() => {
      this.node.hidden = true;
    }, 5000);
  },

  /**
   * Re-show the component immediately.
   */
  _stopHiding() {
    if (this._hidingTimeout) {
      clearTimeout(this._hidingTimeout);
      this._hidingTimeout = 0;
    }
    this.node.hidden = false;
  },
};
