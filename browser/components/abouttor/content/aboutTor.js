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

// YEC 2024 (year end campaign).
// See tor-browser#42072
const YecWidget = {
  _initialized: false,
  _locale: null,

  /**
   * Initialize the widget.
   */
  init() {
    this._initialized = true;

    document.getElementById("yec-2024-close").addEventListener("click", () => {
      dispatchEvent(new CustomEvent("YECHidden", { bubbles: true }));
      this.messageNumber = null;
    });

    // Create mimics of the .yec-2024-heading elements to measure a single line
    // and pass on the measurements to be used in CSS.
    for (const heading of document.querySelectorAll(".yec-2024-heading")) {
      const measureEl = heading.cloneNode(true);
      measureEl.classList.add("yec-2024-heading-measure");
      // Remove classes that would style or hide the mimic.
      measureEl.classList.remove(
        "yec-2024-heading",
        "yec-2024-message-0",
        "yec-2024-message-1",
        "yec-2024-message-2"
      );
      measureEl.setAttribute("aria-hidden", "true");

      const sizeObserver = new ResizeObserver(() => {
        // The parent block rect measures the space that the single line
        // occupies.
        const blockRect = measureEl.getBoundingClientRect();
        // The child span measures the space that the inline element occupies.
        // I.e. the space that would be coloured if we set a `background`. This
        // may be smaller than the parent block, and not center-aligned if the
        // text content contains certain non-ascii characters. E.g. Burmese.
        const inlineRect = measureEl.firstElementChild.getBoundingClientRect();
        heading.style.setProperty(
          "--yec-heading-line-height",
          `${blockRect.height}px`
        );
        heading.style.setProperty(
          "--yec-heading-gap-top",
          `${inlineRect.top - blockRect.top}px`
        );
        heading.style.setProperty(
          "--yec-heading-gap-bottom",
          `${blockRect.bottom - inlineRect.bottom}px`
        );
      });
      sizeObserver.observe(measureEl);
      document.body.append(measureEl);
    }

    this._updateDonateLocale();
  },

  _messageNumber: null,

  /**
   * The version of the YEC message to show, or null if no version should be
   * shown.
   *
   * @type {?integer}
   */
  get messageNumber() {
    return this._messageNumber;
  },

  set messageNumber(number) {
    this._messageNumber = number;
    this._updateShown();
  },

  _updateShown() {
    if (!this._initialized) {
      return;
    }

    if (this.messageNumber === null) {
      document.body.removeAttribute("yec-2024-message-number");
    } else {
      document.body.setAttribute("yec-2024-message-number", this.messageNumber);
    }
  },

  _updateDonateLocale() {
    if (!this._initialized) {
      return;
    }
    const donateLink = document.getElementById("yec-2024-donate-link");
    const base = "https://www.torproject.org/donate";
    donateLink.href = this._locale
      ? `${base}/donate-${this._locale}-yec2024`
      : base;
  },

  /**
   * Set the locale to use for the donation link.
   *
   * @param {string} locale - The new locale, as BCP47.
   */
  setDonateLocale(locale) {
    this._locale = locale;
    this._updateDonateLocale();
  },
};

window.addEventListener("DOMContentLoaded", () => {
  YecWidget.init();
});

window.addEventListener("InitialData", event => {
  const { appLocale, yecMessageNumber } = event.detail;
  YecWidget.messageNumber = yecMessageNumber;
  YecWidget.setDonateLocale(appLocale);
});
