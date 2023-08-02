"use strict";

const SearchWidget = {
  _initialized: false,
  _initialOnionize: false,

  /**
   * Initialize the search form elements.
   */
  init() {
    this._initialized = true;

    this.searchForm = document.getElementById("search-form");
    this.onionizeToggle = document.getElementById("onionize-toggle");
    this.onionizeToggle.pressed = this._initialOnionize;
    this._updateOnionize();
    this.onionizeToggle.addEventListener("toggle", () =>
      this._updateOnionize()
    );

    // If the user submits, save the onionize search state for the next about:tor
    // page.
    this.searchForm.addEventListener("submit", () => {
      dispatchEvent(
        new CustomEvent("SubmitSearchOnionize", {
          detail: this.onionizeToggle.pressed,
          bubbles: true,
        })
      );
    });

    // By default, Enter on the onionizeToggle will toggle the button rather
    // than submit the <form>.
    // Moreover, our <form> has no submit button, so can only be submitted by
    // pressing Enter.
    // For keyboard users, Space will also toggle the form. We do not want to
    // require users to have to Tab back to the search input in order to press
    // Enter to submit the form.
    // For mouse users, clicking the toggle button will give it focus, so they
    // would have to Tab back or click the search input in order to submit the
    // form.
    // So we want to intercept the Enter keydown event to submit the form.
    this.onionizeToggle.addEventListener(
      "keydown",
      event => {
        if (event.key !== "Enter") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.searchForm.requestSubmit();
      },
      { capture: true }
    );

    // Focus styling on form.
    const searchInput = document.getElementById("search-input");
    const updateInputFocus = () => {
      this.searchForm.classList.toggle(
        "search-input-focus-visible",
        searchInput.matches(":focus-visible")
      );
    };
    updateInputFocus();
    searchInput.addEventListener("focus", updateInputFocus);
    searchInput.addEventListener("blur", updateInputFocus);
  },

  _updateOnionize() {
    // Change submit URL based on the onionize toggle.
    this.searchForm.action = this.onionizeToggle.pressed
      ? "https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion"
      : "https://duckduckgo.com";
    this.searchForm.classList.toggle(
      "onionized-search",
      this.onionizeToggle.pressed
    );
  },

  /**
   * Set what the "Onionize" toggle state.
   *
   * @param {boolean} state - Whether the "Onionize" toggle should be switched
   *   on.
   */
  setOnionizeState(state) {
    if (!this._initialized) {
      this._initialOnionize = state;
      return;
    }
    this.onionizeToggle.pressed = state;
    this._updateOnionize();
  },
};

const MessageArea = {
  _initialized: false,
  _messageData: null,
  _isStable: null,
  _torConnectEnabled: null,

  /**
   * Initialize the message area and heading once elements are available.
   */
  init() {
    this._initialized = true;
    this._update();
  },

  /**
   * Set the message data and stable release flag.
   *
   * @param {MessageData} messageData - The message data, indicating which
   *   message to show.
   * @param {boolean} isStable - Whether this is the stable release version.
   * @param {boolean} torConnectEnabled - Whether TorConnect is enabled, and
   *   therefore the Tor process was configured with about:torconnect.
   */
  setMessageData(messageData, isStable, torConnectEnabled) {
    this._messageData = messageData;
    this._isStable = isStable;
    this._torConnectEnabled = torConnectEnabled;
    this._update();
  },

  _update() {
    if (!this._initialized) {
      return;
    }

    document
      .querySelector(".home-message.shown-message")
      ?.classList.remove("shown-message");

    if (!this._messageData) {
      return;
    }

    // Set heading.
    document.body.classList.toggle("is-testing", !this._isStable);

    document.body.classList.toggle("show-tor-check", !this._torConnectEnabled);

    const { updateVersion, updateURL, number } = this._messageData;

    if (updateVersion) {
      const updatedElement = document.getElementById("home-message-updated");
      updatedElement.querySelector("a").href = updateURL;
      document.l10n.setAttributes(
        updatedElement.querySelector("span"),
        "tor-browser-home-message-updated",
        { version: updateVersion }
      );
      updatedElement.classList.add("shown-message");
    } else {
      const messageElements = document.querySelectorAll(
        this._isStable
          ? ".home-message-rotating-stable"
          : ".home-message-rotating-testing"
      );
      messageElements[number % messageElements.length].classList.add(
        "shown-message"
      );
    }

    // In the case where we set the update message, we are still waiting for the
    // l10n message to complete. We wait until then before showing the content.
    if (document.hasPendingL10nMutations) {
      window.addEventListener(
        "L10nMutationsFinished",
        () => {
          document.body.classList.add("initialized");
        },
        { once: true }
      );
    } else {
      document.body.classList.add("initialized");
    }
  },
};

window.addEventListener("DOMContentLoaded", () => {
  SearchWidget.init();
  MessageArea.init();
});

window.addEventListener("InitialData", event => {
  const { torConnectEnabled, isStable, searchOnionize, messageData } =
    event.detail;
  SearchWidget.setOnionizeState(!!searchOnionize);
  MessageArea.setMessageData(messageData, !!isStable, !!torConnectEnabled);
});
