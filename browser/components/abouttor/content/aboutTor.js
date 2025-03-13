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

/**
 * A reusable area for surveys.
 *
 * Initially used for tor-browser#43504.
 */
const SurveyArea = {
  /**
   * The current version of the survey.
   *
   * Should be increased every time we start a new survey campaign.
   *
   * @type {integer}
   */
  _version: 1,

  /**
   * The date to start showing the survey.
   *
   * @type {integer}
   */
  _startDate: Date.UTC(2025, 3, 14, 12), // 2025 April 14th, 12:00.

  /**
   * The date to stop showing the current survey.
   *
   * @type {integer}
   */
  _endDate: Date.UTC(2025, 3, 28), // 2025 April 28th, 00:00.

  /**
   * The survey URL.
   *
   * @type {string}
   */
  _urlBase: "https://survey.torproject.org/index.php/923269",

  /**
   * @typedef {object} SurveyLocaleData
   *
   * Locale-specific data for the survey.
   *
   * @property {string[]} browserLocales - The browser locales this should match
   *   with. The first locale should match the locale of the strings.
   * @property {string} urlCode - The language code to pass to the survey URL.
   * @property {string} dir - The direction of the locale.
   * @property {object} strings - The strings to use for the survey banner.
   */

  /**
   * The data for the selected locale.
   *
   * @type {SurveyLocaleData}
   */
  _localeData: null,

  /**
   * The data for each locale that is supported.
   *
   * The first entry is the default.
   *
   * @type {SurveyLocaleData[]}
   */
  _localeDataSet: [
    {
      browserLocales: ["en-US"],
      dir: "ltr",
      urlCode: "en",
      strings: {
        heading: "We’d love your feedback",
        body: "Help us improve Tor Browser by completing this 10-minute survey.",
        launch: "Launch the survey",
        dismiss: "Dismiss",
        close: "Close",
      },
    },
    {
      browserLocales: ["es-ES"],
      dir: "ltr",
      urlCode: "es",
      strings: {
        heading: "Danos tu opinión",
        body: "Ayúdanos a mejorar el Navegador Tor completando esta encuesta de 10 minutos.",
        launch: "Iniciar la encuesta",
        dismiss: "Descartar",
        close: "Cerrar",
      },
    },
    {
      browserLocales: ["ru"],
      dir: "ltr",
      urlCode: "ru",
      strings: {
        heading: "Мы будем рады вашим отзывам",
        body: "Помогите нам улучшить браузер Tor, пройдя 10-минутный опрос.",
        launch: "Начать опрос",
        dismiss: "Отклонить",
        close: "Закрыть",
      },
    },
    {
      browserLocales: ["fr"],
      dir: "ltr",
      urlCode: "fr",
      strings: {
        heading: "Nous serions ravis d’avoir votre avis !",
        body: "Aidez-nous à améliorer le navigateur Tor en répondant à cette enquête de 10 minutes.",
        launch: "Lancer l'enquête",
        dismiss: "Ignorer",
        close: "Fermer",
      },
    },
    {
      // Also show this pt-BR banner for the pt-PT browser locale.
      browserLocales: ["pt-BR", "pt-PT"],
      dir: "ltr",
      urlCode: "pt-BR",
      strings: {
        heading: "Adoraríamos ouvir sua opinião",
        body: "Ajude-nos a melhorar o Navegador Tor respondendo a esta pesquisa de 10 minutos.",
        launch: "Iniciar a pesquisa",
        dismiss: "Dispensar",
        close: "Fechar",
      },
    },
  ],

  /**
   * Initialize the survey area.
   */
  init() {
    document.getElementById("survey-launch").addEventListener("click", () => {
      if (!this._localeData) {
        return;
      }
      const url = new URL(this._urlBase);
      url.searchParams.append("lang", this._localeData.urlCode);
      open(url.href);
    });
    document.getElementById("survey-close").addEventListener("click", () => {
      this._hide();
    });
    document.getElementById("survey-dismiss").addEventListener("click", () => {
      this._hide();
    });
  },

  /**
   * Permanently hide this survey.
   */
  _hide() {
    document.body.classList.remove("show-survey");
    // Move focus to the search input.
    document.getElementById("search-input").focus();

    dispatchEvent(
      new CustomEvent("SurveyDismissed", {
        // We pass in the current survey version to record the *latest*
        // version that the user has dismissed. This will overwrite any
        // previous versions.
        detail: this._version,
        bubbles: true,
      })
    );
  },

  /**
   * Decide whether to show the survey.
   *
   * @param {integer} dismissVersion - The latest version of survey that the
   *   user has already dismissed.
   * @param {boolean} isStable - Whether this is the stable release of Tor
   *   Browser.
   */
  potentiallyShow(dismissVersion, isStable) {
    const now = Date.now();
    if (
      now < this._startDate ||
      now >= this._endDate ||
      // The user has already dismissed this version of the survey before:
      dismissVersion >= this._version ||
      !isStable
    ) {
      // Don't show the survey.
      return;
    }

    // Determine the survey locale based on the about:tor locale.
    // NOTE: We do not user document.l10n to translate the survey banner.
    // Instead we only translate the banner into a limited set of locales that
    // match the languages that the survey itself supports. This should match
    // the language of the survey when it is opened by the user.
    const pageLocale = document.documentElement.getAttribute("lang");
    for (const localeData of this._localeDataSet) {
      if (localeData.browserLocales.includes(pageLocale)) {
        this._localeData = localeData;
        break;
      }
    }
    if (!this._localeData) {
      // Show the default en-US banner.
      this._localeData = this._localeDataSet[0];
    }

    // Make sure the survey's lang and dir attributes match the chosen locale.
    const surveyEl = document.getElementById("survey");
    surveyEl.setAttribute("lang", this._localeData.browserLocales[0]);
    surveyEl.setAttribute("dir", this._localeData.dir);

    const { heading, body, launch, dismiss, close } = this._localeData.strings;

    document.getElementById("survey-heading").textContent = heading;
    document.getElementById("survey-body").textContent = body;
    document.getElementById("survey-launch").textContent = launch;
    document.getElementById("survey-dismiss").textContent = dismiss;
    document.getElementById("survey-close").setAttribute("title", close);

    document.body.classList.add("show-survey");
  },
};

window.addEventListener("DOMContentLoaded", () => {
  SearchWidget.init();
  MessageArea.init();
  SurveyArea.init();
});

window.addEventListener("InitialData", event => {
  const {
    torConnectEnabled,
    isStable,
    searchOnionize,
    messageData,
    surveyDismissVersion,
  } = event.detail;
  SearchWidget.setOnionizeState(!!searchOnionize);
  MessageArea.setMessageData(messageData, !!isStable, !!torConnectEnabled);
  SurveyArea.potentiallyShow(surveyDismissVersion, isStable);
});
