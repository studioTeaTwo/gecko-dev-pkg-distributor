"use strict";

const { BridgeDB } = ChromeUtils.importESModule(
  "resource://gre/modules/BridgeDB.sys.mjs"
);

const { TorConnect, TorConnectTopics } = ChromeUtils.importESModule(
  "resource://gre/modules/TorConnect.sys.mjs"
);

const log = console.createInstance({
  maxLogLevel: "Warn",
  prefix: "requestBridgeDialog",
});

const gRequestBridgeDialog = {
  selectors: {
    dialogHeader: "h3#torPreferences-requestBridge-header",
    captchaImage: "image#torPreferences-requestBridge-captchaImage",
    captchaEntryTextbox: "input#torPreferences-requestBridge-captchaTextbox",
    refreshCaptchaButton:
      "button#torPreferences-requestBridge-refreshCaptchaButton",
    incorrectCaptchaHbox:
      "hbox#torPreferences-requestBridge-incorrectCaptchaHbox",
  },

  init() {
    this._result = window.arguments[0];

    const selectors = this.selectors;

    this._dialog = document.getElementById(
      "torPreferences-requestBridge-dialog"
    );

    // Add styling for tor-button to the dialog shadow root.
    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href =
      "chrome://browser/content/torpreferences/torPreferences.css";
    this._dialog.shadowRoot.append(styleLink);

    // user may have opened a Request Bridge dialog in another tab, so update the
    // CAPTCHA image or close out the dialog if we have a bridge list
    this._dialog.addEventListener("focusin", () => {
      const uri = BridgeDB.currentCaptchaImage;
      const bridges = BridgeDB.currentBridges;

      // new captcha image
      if (uri) {
        this._setcaptchaImage(uri);
      } else if (bridges) {
        this._dialog.cancelDialog();
      }
    });

    this._submitButton = this._dialog.getButton("accept");
    this._submitButton.disabled = true;
    this._dialog.addEventListener("dialogaccept", e => {
      e.preventDefault();
      this.onSubmitCaptcha();
    });

    this._dialogHeader = this._dialog.querySelector(selectors.dialogHeader);

    this._captchaImage = this._dialog.querySelector(selectors.captchaImage);

    // request captcha from bridge db
    BridgeDB.requestNewCaptchaImage().then(uri => {
      this._setcaptchaImage(uri);
    });

    this._captchaEntryTextbox = this._dialog.querySelector(
      selectors.captchaEntryTextbox
    );
    this._captchaEntryTextbox.disabled = true;
    // disable submit if entry textbox is empty
    this._captchaEntryTextbox.oninput = () => {
      this._submitButton.disabled = this._captchaEntryTextbox.value == "";
    };

    this._captchaRefreshButton = this._dialog.querySelector(
      selectors.refreshCaptchaButton
    );
    this._captchaRefreshButton.disabled = true;
    this._captchaRefreshButton.addEventListener("command", () => {
      this.onRefreshCaptcha();
    });

    this._incorrectCaptchaHbox = this._dialog.querySelector(
      selectors.incorrectCaptchaHbox
    );

    Services.obs.addObserver(this, TorConnectTopics.StateChange);
    this.onAcceptStateChange();
  },

  uninit() {
    BridgeDB.close();
    // Unregister our observer topics.
    Services.obs.removeObserver(this, TorConnectTopics.StateChange);
  },

  onAcceptStateChange() {
    const connect = TorConnect.canBeginBootstrap;
    this._result.connect = connect;
    this._submitButton.setAttribute(
      "data-l10n-id",
      connect ? "bridge-dialog-button-connect" : "bridge-dialog-button-submit"
    );
    this._submitButton.classList.toggle("tor-button", connect);
  },

  observe(subject, topic) {
    switch (topic) {
      case TorConnectTopics.StateChange:
        this.onAcceptStateChange();
        break;
    }
  },

  _setcaptchaImage(uri) {
    if (uri != this._captchaImage.src) {
      this._captchaImage.src = uri;
      this._dialogHeader.setAttribute(
        "data-l10n-id",
        "request-bridge-dialog-top-solve"
      );
      this._setUIDisabled(false);
      this._captchaEntryTextbox.focus();
      this._captchaEntryTextbox.select();
    }
  },

  _setUIDisabled(disabled) {
    this._submitButton.disabled = this._captchaGuessIsEmpty() || disabled;
    this._captchaEntryTextbox.disabled = disabled;
    this._captchaRefreshButton.disabled = disabled;
  },

  _captchaGuessIsEmpty() {
    return this._captchaEntryTextbox.value == "";
  },

  /*
    Event Handlers
  */
  onSubmitCaptcha() {
    let captchaText = this._captchaEntryTextbox.value.trim();
    // noop if the field is empty
    if (captchaText == "") {
      return;
    }

    // freeze ui while we make request
    this._setUIDisabled(true);
    this._incorrectCaptchaHbox.style.visibility = "hidden";

    BridgeDB.submitCaptchaGuess(captchaText)
      .then(aBridges => {
        if (aBridges && aBridges.length) {
          this._result.accepted = true;
          this._result.bridges = aBridges;
          this._submitButton.disabled = false;
          // This was successful, but use cancelDialog() to close, since
          // we intercept the `dialogaccept` event.
          this._dialog.cancelDialog();
        } else {
          this._setUIDisabled(false);
          this._incorrectCaptchaHbox.style.visibility = "visible";
        }
      })
      .catch(aError => {
        // TODO: handle other errors properly here when we do the bridge settings re-design
        this._setUIDisabled(false);
        this._incorrectCaptchaHbox.style.visibility = "visible";
        log.error(aError);
      });
  },

  onRefreshCaptcha() {
    this._setUIDisabled(true);
    this._captchaImage.src = "";
    this._dialogHeader.setAttribute(
      "data-l10n-id",
      "request-bridge-dialog-top-wait"
    );
    this._captchaEntryTextbox.value = "";
    this._incorrectCaptchaHbox.style.visibility = "hidden";

    BridgeDB.requestNewCaptchaImage().then(uri => {
      this._setcaptchaImage(uri);
    });
  },
};

window.addEventListener(
  "DOMContentLoaded",
  () => {
    gRequestBridgeDialog.init();
    window.addEventListener(
      "unload",
      () => {
        gRequestBridgeDialog.uninit();
      },
      { once: true }
    );
  },
  { once: true }
);
