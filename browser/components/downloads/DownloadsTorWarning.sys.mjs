/* import-globals-from /browser/base/content/utilityOverlay.js */

const PREF_SHOW_DOWNLOAD_WARNING = "browser.download.showTorWarning";

/**
 * Manages an instance of a tor warning.
 */
export class DownloadsTorWarning {
  /**
   * Observer for showing or hiding the warning.
   *
   * @type {function}
   */
  #torWarningPrefObserver;

  /**
   * Whether the warning is active.
   *
   * @type {boolean}
   */
  #active = false;

  /**
   * The moz-message-bar element that should show the warning.
   *
   * @type {MozMessageBar}
   */
  #warningElement;

  /**
   * The dismiss button for the warning.
   *
   * @type {HTMLButton}
   */
  #dismissButton;

  /**
   * Attach to an instance of the tor warning.
   *
   * @param {MozMessageBar} warningElement - The warning element to initialize
   *   and attach to.
   * @param {boolean} isChrome - Whether the element belongs to the chrome.
   *   Otherwise it belongs to content.
   * @param {function} moveFocus - Callback to move the focus out of the warning
   *   when it is hidden.
   * @param {function} [onLinkClick] - Callback that is called when a link is
   *   about to open.
   */
  constructor(warningElement, isChrome, moveFocus, onLinkClick) {
    const doc = warningElement.ownerDocument;
    this.#warningElement = warningElement;
    warningElement.setAttribute(
      "data-l10n-id",
      "downloads-tor-warning-message-bar"
    );
    warningElement.setAttribute("data-l10n-attrs", "heading, message");

    // Observe changes to the tor warning pref.
    this.#torWarningPrefObserver = () => {
      if (Services.prefs.getBoolPref(PREF_SHOW_DOWNLOAD_WARNING)) {
        warningElement.hidden = false;
      } else {
        const hadFocus = warningElement.contains(doc.activeElement);
        warningElement.hidden = true;
        if (hadFocus) {
          moveFocus();
        }
      }
    };

    const tailsLink = doc.createElement("a");
    tailsLink.setAttribute("slot", "support-link");
    tailsLink.href = "https://tails.net/";
    tailsLink.target = "_blank";
    tailsLink.setAttribute("data-l10n-id", "downloads-tor-warning-tails-link");
    if (isChrome) {
      // Intercept clicks on the tails link.
      tailsLink.addEventListener("click", event => {
        event.preventDefault();
        onLinkClick?.();
        doc.defaultView.openWebLinkIn(tailsLink.href, "tab");
      });
    }

    const dismissButton = doc.createElement("button");
    dismissButton.setAttribute("slot", "actions");
    dismissButton.setAttribute(
      "data-l10n-id",
      "downloads-tor-warning-dismiss-button"
    );
    if (isChrome) {
      dismissButton.classList.add("footer-button");
    }

    dismissButton.addEventListener("click", () => {
      Services.prefs.setBoolPref(PREF_SHOW_DOWNLOAD_WARNING, false);
    });

    warningElement.append(tailsLink);
    warningElement.append(dismissButton);

    this.#dismissButton = dismissButton;
  }

  /**
   * Whether the warning is hidden by the preference.
   *
   * @type {boolean}
   */
  get hidden() {
    return this.#warningElement.hidden;
  }

  /**
   * The dismiss button for the warning.
   *
   * @type {HTMLButton}
   */
  get dismissButton() {
    return this.#dismissButton;
  }

  /**
   * Activate the instance.
   */
  activate() {
    if (this.#active) {
      return;
    }
    this.#active = true;
    Services.prefs.addObserver(
      PREF_SHOW_DOWNLOAD_WARNING,
      this.#torWarningPrefObserver
    );
    // Initialize.
    this.#torWarningPrefObserver();
  }

  /**
   * Deactivate the instance.
   */
  deactivate() {
    if (!this.#active) {
      return;
    }
    this.#active = false;
    Services.prefs.removeObserver(
      PREF_SHOW_DOWNLOAD_WARNING,
      this.#torWarningPrefObserver
    );
  }
}
