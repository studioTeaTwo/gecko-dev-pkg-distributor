// Copyright (c) 2021, The Tor Project, Inc.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* eslint-env mozilla/remote-page */

// populated in AboutTorConnect.init()
let TorStrings = {};
let TorConnectState = {};
let InternetStatus = {};

const UIStates = Object.freeze({
  ConnectToTor: "ConnectToTor",
  Offline: "Offline",
  ConnectionAssist: "ConnectionAssist",
  CouldNotLocate: "CouldNotLocate",
  LocationConfirm: "LocationConfirm",
  FinalError: "FinalError",
});

const BreadcrumbStatus = Object.freeze({
  Hidden: "hidden",
  Disabled: "disabled",
  Default: "default",
  Active: "active",
  Error: "error",
});

/**
 * The controller for the about:torconnect page.
 */
class AboutTorConnect {
  selectors = Object.freeze({
    textContainer: {
      title: "div.title",
      titleText: "h1.title-text",
      longContentText: "#connectLongContentText",
    },
    progress: {
      description: "p#connectShortDescText",
      meter: "div#progressBar",
    },
    breadcrumbs: {
      container: "#breadcrumbs",
      connectToTor: {
        link: "#connect-to-tor",
        label: "#connect-to-tor .breadcrumb-label",
      },
      connectionAssist: {
        separator: "#connection-assist-separator",
        link: "#connection-assist",
        label: "#connection-assist .breadcrumb-label",
      },
      tryBridge: {
        separator: "#try-bridge-separator",
        link: "#try-bridge",
        label: "#try-bridge .breadcrumb-label",
      },
    },
    viewLog: {
      button: "#viewLogButton",
    },
    quickstart: {
      container: "div#quickstartContainer",
      toggle: "#quickstartToggle",
    },
    buttons: {
      restart: "button#restartButton",
      configure: "button#configureButton",
      cancel: "button#cancelButton",
      connect: "button#connectButton",
      tryBridge: "button#tryBridgeButton",
      locationDropdownLabel: "#locationDropdownLabel",
      locationDropdown: "#locationDropdown",
      locationDropdownSelect: "#locationDropdown select",
    },
  });

  elements = Object.freeze({
    title: document.querySelector(this.selectors.textContainer.title),
    titleText: document.querySelector(this.selectors.textContainer.titleText),
    longContentText: document.querySelector(
      this.selectors.textContainer.longContentText
    ),
    progressDescription: document.querySelector(
      this.selectors.progress.description
    ),
    progressMeter: document.querySelector(this.selectors.progress.meter),
    breadcrumbContainer: document.querySelector(
      this.selectors.breadcrumbs.container
    ),
    connectToTorLink: document.querySelector(
      this.selectors.breadcrumbs.connectToTor.link
    ),
    connectToTorLabel: document.querySelector(
      this.selectors.breadcrumbs.connectToTor.label
    ),
    connectionAssistSeparator: document.querySelector(
      this.selectors.breadcrumbs.connectionAssist.separator
    ),
    connectionAssistLink: document.querySelector(
      this.selectors.breadcrumbs.connectionAssist.link
    ),
    connectionAssistLabel: document.querySelector(
      this.selectors.breadcrumbs.connectionAssist.label
    ),
    tryBridgeSeparator: document.querySelector(
      this.selectors.breadcrumbs.tryBridge.separator
    ),
    tryBridgeLink: document.querySelector(
      this.selectors.breadcrumbs.tryBridge.link
    ),
    tryBridgeLabel: document.querySelector(
      this.selectors.breadcrumbs.tryBridge.label
    ),
    viewLogButton: document.querySelector(this.selectors.viewLog.button),
    quickstartContainer: document.querySelector(
      this.selectors.quickstart.container
    ),
    quickstartToggle: document.querySelector(this.selectors.quickstart.toggle),
    restartButton: document.querySelector(this.selectors.buttons.restart),
    configureButton: document.querySelector(this.selectors.buttons.configure),
    cancelButton: document.querySelector(this.selectors.buttons.cancel),
    connectButton: document.querySelector(this.selectors.buttons.connect),
    locationDropdownLabel: document.querySelector(
      this.selectors.buttons.locationDropdownLabel
    ),
    locationDropdown: document.querySelector(
      this.selectors.buttons.locationDropdown
    ),
    locationDropdownSelect: document.querySelector(
      this.selectors.buttons.locationDropdownSelect
    ),
    tryBridgeButton: document.querySelector(this.selectors.buttons.tryBridge),
  });

  uiState = {
    currentState: UIStates.ConnectToTor,
    allowAutomaticLocation: true,
    selectedLocation: "automatic",
    bootstrapCause: UIStates.ConnectToTor,
  };

  locations = {};

  constructor() {
    this.uiStates = Object.freeze(
      Object.fromEntries([
        [UIStates.ConnectToTor, this.showConnectToTor.bind(this)],
        [UIStates.Offline, this.showOffline.bind(this)],
        [UIStates.ConnectionAssist, this.showConnectionAssistant.bind(this)],
        [UIStates.CouldNotLocate, this.showCouldNotLocate.bind(this)],
        [UIStates.LocationConfirm, this.showLocationConfirmation.bind(this)],
        [UIStates.FinalError, this.showFinalError.bind(this)],
      ])
    );
  }

  beginBootstrap() {
    RPMSendAsyncMessage("torconnect:begin-bootstrap");
  }

  beginAutoBootstrap(countryCode) {
    if (countryCode === "automatic") {
      countryCode = "";
    }
    RPMSendAsyncMessage("torconnect:begin-autobootstrap", countryCode);
  }

  cancelBootstrap() {
    RPMSendAsyncMessage("torconnect:cancel-bootstrap");
  }

  transitionUIState(nextState, connState) {
    if (nextState !== this.uiState.currentState) {
      this.uiState.currentState = nextState;
      this.saveUIState();
    }
    this.uiStates[nextState](connState);
  }

  saveUIState() {
    RPMSendAsyncMessage("torconnect:set-ui-state", this.uiState);
  }

  /*
  Element helper methods
  */

  show(element, primary = false) {
    element.classList.toggle("primary", primary);
    element.removeAttribute("hidden");
  }

  hide(element) {
    element.setAttribute("hidden", "true");
  }

  hideButtons() {
    this.hide(this.elements.quickstartContainer);
    this.hide(this.elements.restartButton);
    this.hide(this.elements.configureButton);
    this.hide(this.elements.cancelButton);
    this.hide(this.elements.connectButton);
    this.hide(this.elements.locationDropdownLabel);
    this.hide(this.elements.locationDropdown);
    this.hide(this.elements.tryBridgeButton);
  }

  populateLocations() {
    const selectCountryRegion = document.createElement("option");
    selectCountryRegion.textContent = TorStrings.torConnect.selectCountryRegion;
    selectCountryRegion.value = "";

    // get all codes and names from TorStrings
    const locationNodes = [];
    for (const [code, name] of Object.entries(this.locations)) {
      let option = document.createElement("option");
      option.value = code;
      option.textContent = name;
      locationNodes.push(option);
    }
    // locale sort by name
    locationNodes.sort((left, right) =>
      left.textContent.localeCompare(right.textContent)
    );
    this.elements.locationDropdownSelect.append(
      selectCountryRegion,
      ...locationNodes
    );
  }

  populateFrequentLocations(locations) {
    this.removeFrequentLocations();
    if (!locations || !locations.length) {
      return;
    }

    const locationNodes = [];
    for (const code of locations) {
      const option = document.createElement("option");
      option.value = code;
      option.className = "frequent-location";
      // codes (partially) come from rdsys service, so make sure we have a
      // string defined for it
      let name = this.locations[code];
      if (!name) {
        name = code;
      }
      option.textContent = name;
      locationNodes.push(option);
    }
    // locale sort by name
    locationNodes.sort((left, right) =>
      left.textContent.localeCompare(right.textContent)
    );

    const frequentGroup = document.createElement("optgroup");
    frequentGroup.setAttribute(
      "label",
      TorStrings.torConnect.frequentLocations
    );
    frequentGroup.className = "frequent-location";
    const locationGroup = document.createElement("optgroup");
    locationGroup.setAttribute("label", TorStrings.torConnect.otherLocations);
    locationGroup.className = "frequent-location";
    // options[0] is either "Select Country or Region" or "Automatic"
    this.elements.locationDropdownSelect.options[0].after(
      frequentGroup,
      ...locationNodes,
      locationGroup
    );
  }

  removeFrequentLocations() {
    const select = this.elements.locationDropdownSelect;
    for (const option of select.querySelectorAll(".frequent-location")) {
      option.remove();
    }
  }

  validateLocation() {
    const selectedIndex = this.elements.locationDropdownSelect.selectedIndex;
    const selectedOption =
      this.elements.locationDropdownSelect.options[selectedIndex];
    if (!selectedOption.value) {
      this.elements.tryBridgeButton.setAttribute("disabled", "disabled");
    } else {
      this.elements.tryBridgeButton.removeAttribute("disabled");
    }
  }

  setTitle(title, className) {
    this.elements.titleText.textContent = title;
    this.elements.title.className = "title";
    if (className) {
      this.elements.title.classList.add(className);
    }
    document.title = title;
  }

  setLongText(...args) {
    this.elements.longContentText.textContent = "";
    this.elements.longContentText.append(...args);
  }

  setProgress(description, visible, percent) {
    this.elements.progressDescription.textContent = description;
    if (visible) {
      this.show(this.elements.progressMeter);
      this.elements.progressMeter.style.setProperty(
        "--progress-percent",
        `${percent}%`
      );
    } else {
      this.hide(this.elements.progressMeter);
    }
  }

  setBreadcrumbsStatus(connectToTor, connectionAssist, tryBridge) {
    this.elements.breadcrumbContainer.classList.remove("hidden");
    const elems = [
      [this.elements.connectToTorLink, connectToTor, null],
      [
        this.elements.connectionAssistLink,
        connectionAssist,
        this.elements.connectionAssistSeparator,
      ],
      [
        this.elements.tryBridgeLink,
        tryBridge,
        this.elements.tryBridgeSeparator,
      ],
    ];
    elems.forEach(([elem, status, separator]) => {
      elem.classList.remove(BreadcrumbStatus.Hidden);
      elem.classList.remove(BreadcrumbStatus.Disabled);
      elem.classList.remove(BreadcrumbStatus.Active);
      elem.classList.remove(BreadcrumbStatus.Error);
      if (status !== "") {
        elem.classList.add(status);
      }
      separator?.classList.toggle("hidden", status === BreadcrumbStatus.Hidden);
    });
  }

  hideBreadcrumbs() {
    this.elements.breadcrumbContainer.classList.add("hidden");
  }

  getLocalizedStatus(status) {
    const aliases = {
      conn_dir: "conn",
      handshake_dir: "onehop_create",
      conn_or: "enough_dirinfo",
      handshake_or: "ap_conn",
    };
    if (status in aliases) {
      status = aliases[status];
    }
    return TorStrings.torConnect.bootstrapStatus[status] ?? status;
  }

  getMaybeLocalizedError(state) {
    if (!state?.ErrorCode) {
      return "";
    }
    switch (state.ErrorCode) {
      case "Offline":
        return TorStrings.torConnect.offline;
      case "BootstrapError": {
        const details = state.ErrorDetails?.cause;
        if (!details?.phase || !details?.reason) {
          return TorStrings.torConnect.torBootstrapFailed;
        }
        let status = this.getLocalizedStatus(details.phase);
        const reason =
          TorStrings.torConnect.bootstrapWarning[details.reason] ??
          details.reason;
        return TorStrings.torConnect.bootstrapFailedDetails
          .replace("%1$S", status)
          .replace("%2$S", reason);
      }
      case "CannotDetermineCountry":
        return TorStrings.torConnect.cannotDetermineCountry;
      case "NoSettingsForCountry":
        return TorStrings.torConnect.noSettingsForCountry;
      case "AllSettingsFailed":
        return TorStrings.torConnect.autoBootstrappingAllFailed;
      case "ExternaError":
        // A standard JS error, or something for which we do probably do not
        // have a translation. Returning the original message is the best we can
        // do.
        return state.ErrorDetails.message;
      default:
        console.warn(
          `Unknown error code: ${state.ErrorCode}`,
          state.ErrorDetails
        );
        return state.ErrorDetails?.message ?? state.ErrorCode;
    }
  }

  /*
  These methods update the UI based on the current TorConnect state
  */

  updateUI(state) {
    // calls update_$state()
    this[`update_${state.State}`](state);
    this.elements.quickstartToggle.pressed = state.QuickStartEnabled;
  }

  /* Per-state updates */

  update_Initial(state) {
    this.showConnectToTor(state);
  }

  update_Configuring(state) {
    if (
      state.StateChanged &&
      (state.PreviousState === TorConnectState.Bootstrapping ||
        state.PreviousState === TorConnectState.AutoBootstrapping)
    ) {
      // The bootstrap has been cancelled
      this.transitionUIState(this.uiState.bootstrapCause, state);
    }
  }

  update_AutoBootstrapping(state) {
    this.showBootstrapping(state);
  }

  update_Bootstrapping(state) {
    this.showBootstrapping(state);
  }

  update_Error(state) {
    if (!state.StateChanged) {
      return;
    }
    if (state.InternetStatus === InternetStatus.Offline) {
      this.transitionUIState(UIStates.Offline, state);
    } else if (state.PreviousState === TorConnectState.Bootstrapping) {
      this.transitionUIState(UIStates.ConnectionAssist, state);
    } else if (state.PreviousState === TorConnectState.AutoBootstrapping) {
      if (this.uiState.bootstrapCause === UIStates.ConnectionAssist) {
        if (this.getLocation() === "automatic") {
          this.uiState.allowAutomaticLocation = false;
          if (!state.DetectedLocation) {
            this.transitionUIState(UIStates.CouldNotLocate, state);
            return;
          }
          // Change the location only here, to avoid overriding any user change/
          // insisting with the detected location
          this.setLocation(state.DetectedLocation);
        }
        this.transitionUIState(UIStates.LocationConfirm, state);
      } else {
        this.transitionUIState(UIStates.FinalError, state);
      }
    } else {
      console.error(
        "We received an error starting from an unexpected state",
        state
      );
    }
  }

  update_Bootstrapped(_state) {
    const showProgressbar = true;

    this.setTitle(TorStrings.torConnect.torConnected, "");
    this.setLongText(TorStrings.settings.torPreferencesDescription);
    this.setProgress("", showProgressbar, 100);
    this.hideButtons();
  }

  update_Disabled(_state) {
    // TODO: we should probably have some UX here if a user goes to about:torconnect when
    // it isn't in use (eg using tor-launcher or system tor)
  }

  showConnectToTor(state) {
    this.setTitle(TorStrings.torConnect.torConnect, "");
    this.setLongText(TorStrings.settings.torPreferencesDescription);
    this.setProgress("", false);
    this.hide(this.elements.viewLogButton);
    this.hideButtons();
    this.show(this.elements.quickstartContainer);
    this.show(this.elements.configureButton);
    this.show(this.elements.connectButton, true);
    if (state?.StateChanged) {
      this.elements.connectButton.focus();
    }
    if (state?.HasEverFailed) {
      this.setBreadcrumbsStatus(
        BreadcrumbStatus.Active,
        BreadcrumbStatus.Default,
        BreadcrumbStatus.Disabled
      );
      this.elements.connectButton.textContent = TorStrings.torConnect.tryAgain;
    }
    this.uiState.bootstrapCause = UIStates.ConnectToTor;
    this.saveUIState();
  }

  showBootstrapping(state) {
    const showProgressbar = true;
    let title = "";
    let description = "";
    const breadcrumbs = [
      BreadcrumbStatus.Disabled,
      BreadcrumbStatus.Disabled,
      BreadcrumbStatus.Disabled,
    ];
    switch (this.uiState.bootstrapCause) {
      case UIStates.ConnectToTor:
        breadcrumbs[0] = BreadcrumbStatus.Active;
        title = state.HasEverFailed
          ? TorStrings.torConnect.tryAgain
          : TorStrings.torConnect.torConnecting;
        description = TorStrings.settings.torPreferencesDescription;
        break;
      case UIStates.ConnectionAssist:
        breadcrumbs[2] = BreadcrumbStatus.Active;
        title = TorStrings.torConnect.tryingBridge;
        description = TorStrings.torConnect.assistDescription;
        break;
      case UIStates.CouldNotLocate:
        breadcrumbs[2] = BreadcrumbStatus.Active;
        title = TorStrings.torConnect.tryingBridgeAgain;
        description = TorStrings.torConnect.errorLocationDescription;
        break;
      case UIStates.LocationConfirm:
        breadcrumbs[2] = BreadcrumbStatus.Active;
        title = TorStrings.torConnect.tryingBridgeAgain;
        description = TorStrings.torConnect.isLocationCorrectDescription;
        break;
    }
    this.setTitle(title, "");
    this.showConfigureConnectionLink(description);
    this.setProgress("", showProgressbar, state.BootstrapProgress);
    if (state.HasEverFailed) {
      this.setBreadcrumbsStatus(...breadcrumbs);
    } else {
      this.hideBreadcrumbs();
    }
    this.hideButtons();
    if (state.ShowViewLog) {
      this.show(this.elements.viewLogButton);
    } else {
      this.hide(this.elements.viewLogButton);
    }
    this.show(this.elements.cancelButton);
    if (state.StateChanged) {
      this.elements.cancelButton.focus();
    }
  }

  showOffline(state) {
    this.setTitle(TorStrings.torConnect.noInternet, "offline");
    this.setLongText(TorStrings.torConnect.noInternetDescription);
    this.setProgress(this.getMaybeLocalizedError(state), false);
    this.setBreadcrumbsStatus(
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Active,
      BreadcrumbStatus.Hidden
    );
    this.show(this.elements.viewLogButton);
    this.hideButtons();
    this.show(this.elements.configureButton);
    this.show(this.elements.connectButton, true);
    this.elements.connectButton.textContent = TorStrings.torConnect.tryAgain;
  }

  showConnectionAssistant(state) {
    this.setTitle(TorStrings.torConnect.couldNotConnect, "assist");
    this.showConfigureConnectionLink(TorStrings.torConnect.assistDescription);
    this.setProgress(this.getMaybeLocalizedError(state), false);
    this.setBreadcrumbsStatus(
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Active,
      BreadcrumbStatus.Disabled
    );
    this.showLocationForm(false, TorStrings.torConnect.tryBridge);
    if (state?.StateChanged) {
      this.elements.tryBridgeButton.focus();
    }
    this.uiState.bootstrapCause = UIStates.ConnectionAssist;
    this.saveUIState();
  }

  showCouldNotLocate(state) {
    this.uiState.allowAutomaticLocation = false;
    this.setTitle(TorStrings.torConnect.errorLocation, "location");
    this.showConfigureConnectionLink(
      TorStrings.torConnect.errorLocationDescription
    );
    this.setProgress(TorStrings.torConnect.cannotDetermineCountry, false);
    this.setBreadcrumbsStatus(
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Active,
      BreadcrumbStatus.Disabled
    );
    this.show(this.elements.viewLogButton);
    this.showLocationForm(true, TorStrings.torConnect.tryBridge);
    if (state.StateChanged) {
      this.elements.tryBridgeButton.focus();
    }
    this.uiState.bootstrapCause = UIStates.CouldNotLocate;
    this.saveUIState();
  }

  showLocationConfirmation(state) {
    this.setTitle(TorStrings.torConnect.isLocationCorrect, "location");
    this.showConfigureConnectionLink(
      TorStrings.torConnect.isLocationCorrectDescription
    );
    this.setProgress(this.getMaybeLocalizedError(state), false);
    this.setBreadcrumbsStatus(
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Active
    );
    this.show(this.elements.viewLogButton);
    this.showLocationForm(true, TorStrings.torConnect.tryAgain);
    if (state.StateChanged) {
      this.elements.tryBridgeButton.focus();
    }
    this.uiState.bootstrapCause = UIStates.LocationConfirm;
    this.saveUIState();
  }

  showFinalError(state) {
    this.setTitle(TorStrings.torConnect.finalError, "final");
    this.setLongText(TorStrings.torConnect.finalErrorDescription);
    this.setProgress(this.getMaybeLocalizedError(state), false);
    this.setBreadcrumbsStatus(
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Active
    );
    this.hideButtons();
    this.show(this.elements.restartButton);
    this.show(this.elements.configureButton, true);
  }

  showConfigureConnectionLink(text) {
    const pieces = text.split("%S");
    const link = document.createElement("a");
    link.textContent = TorStrings.torConnect.configureConnection;
    link.setAttribute("href", "#");
    link.addEventListener("click", e => {
      e.preventDefault();
      RPMSendAsyncMessage("torconnect:open-tor-preferences");
    });
    if (pieces.length > 1) {
      const first = pieces.shift();
      this.setLongText(first, link, ...pieces);
    } else {
      this.setLongText(text);
    }
  }

  showLocationForm(isError, buttonLabel) {
    this.hideButtons();
    RPMSendQuery("torconnect:get-country-codes").then(codes => {
      if (codes && codes.length) {
        this.populateFrequentLocations(codes);
        this.setLocation();
      }
    });
    let firstOpt = this.elements.locationDropdownSelect.options[0];
    if (this.uiState.allowAutomaticLocation) {
      firstOpt.value = "automatic";
      firstOpt.textContent = TorStrings.torConnect.automatic;
    } else {
      firstOpt.value = "";
      firstOpt.textContent = TorStrings.torConnect.selectCountryRegion;
    }
    this.setLocation();
    this.validateLocation();
    this.show(this.elements.locationDropdownLabel);
    this.show(this.elements.locationDropdown);
    this.elements.locationDropdownLabel.classList.toggle("error", isError);
    this.show(this.elements.tryBridgeButton, true);
    if (buttonLabel !== undefined) {
      this.elements.tryBridgeButton.textContent = buttonLabel;
    }
  }

  getLocation() {
    const selectedIndex = this.elements.locationDropdownSelect.selectedIndex;
    return this.elements.locationDropdownSelect.options[selectedIndex].value;
  }

  setLocation(code) {
    if (!code) {
      code = this.uiState.selectedLocation;
    } else {
      this.uiState.selectedLocation = code;
    }
    if (this.getLocation() === code) {
      return;
    }
    const options = this.elements.locationDropdownSelect.options;
    // We need to do this way, because we have repeated values that break
    // the .value way to select (which would however require the label,
    // rather than the code)...
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === code) {
        this.elements.locationDropdownSelect.selectedIndex = i;
        break;
      }
    }
    this.validateLocation();
  }

  initElements(direction) {
    const isAndroid = navigator.userAgent.includes("Android");
    document.body.classList.toggle("android", isAndroid);

    document.documentElement.setAttribute("dir", direction);

    this.elements.connectToTorLink.addEventListener("click", () => {
      if (this.uiState.currentState === UIStates.ConnectToTor) {
        return;
      }
      this.transitionUIState(UIStates.ConnectToTor, null);
      RPMSendAsyncMessage("torconnect:broadcast-user-action", {
        uiState: UIStates.ConnectToTor,
      });
    });
    this.elements.connectToTorLabel.textContent =
      TorStrings.torConnect.torConnect;
    this.elements.connectionAssistLink.addEventListener("click", () => {
      if (
        this.elements.connectionAssistLink.classList.contains(
          BreadcrumbStatus.Active
        ) ||
        this.elements.connectionAssistLink.classList.contains(
          BreadcrumbStatus.Disabled
        )
      ) {
        return;
      }
      this.transitionUIState(UIStates.ConnectionAssist, null);
      RPMSendAsyncMessage("torconnect:broadcast-user-action", {
        uiState: UIStates.ConnectionAssist,
      });
    });
    this.elements.connectionAssistLabel.textContent =
      TorStrings.torConnect.breadcrumbAssist;
    this.elements.tryBridgeLabel.textContent =
      TorStrings.torConnect.breadcrumbTryBridge;

    this.hide(this.elements.viewLogButton);
    this.elements.viewLogButton.textContent = TorStrings.torConnect.viewLog;
    this.elements.viewLogButton.addEventListener("click", () => {
      RPMSendAsyncMessage("torconnect:view-tor-logs");
    });

    this.elements.quickstartToggle.addEventListener("toggle", () => {
      const quickstart = this.elements.quickstartToggle.pressed;
      RPMSendAsyncMessage("torconnect:set-quickstart", quickstart);
    });
    this.elements.quickstartToggle.setAttribute(
      "label",
      TorStrings.settings.quickstartCheckbox
    );

    this.elements.restartButton.textContent =
      TorStrings.torConnect.restartTorBrowser;
    this.elements.restartButton.addEventListener("click", () => {
      RPMSendAsyncMessage("torconnect:restart");
    });

    this.elements.configureButton.textContent =
      TorStrings.torConnect.torConfigure;
    this.elements.configureButton.addEventListener("click", () => {
      RPMSendAsyncMessage("torconnect:open-tor-preferences");
    });

    this.elements.cancelButton.textContent = TorStrings.torConnect.cancel;
    this.elements.cancelButton.addEventListener("click", () => {
      this.cancelBootstrap();
    });

    this.elements.connectButton.textContent =
      TorStrings.torConnect.torConnectButton;
    this.elements.connectButton.addEventListener("click", () => {
      this.beginBootstrap();
    });

    this.populateLocations();
    this.elements.locationDropdownSelect.addEventListener("change", () => {
      this.uiState.selectedLocation = this.getLocation();
      this.saveUIState();
      this.validateLocation();
      RPMSendAsyncMessage("torconnect:broadcast-user-action", {
        location: this.uiState.selectedLocation,
      });
    });

    this.elements.locationDropdownLabel.textContent =
      TorStrings.torConnect.unblockInternetIn;

    this.elements.tryBridgeButton.textContent = TorStrings.torConnect.tryBridge;
    this.elements.tryBridgeButton.addEventListener("click", () => {
      const value = this.getLocation();
      if (value === "automatic") {
        this.beginAutoBootstrap();
      } else {
        this.beginAutoBootstrap(value);
      }
    });

    // Prevent repeat triggering on keydown when the Enter key is held down.
    //
    // Without this, holding down Enter will continue to trigger the button's
    // click event until the user stops holding. This means that a user can
    // accidentally re-trigger a button several times. And if focus moves to a
    // new button it can also get triggered, despite not receiving the initial
    // keydown event.
    //
    // E.g. If the user presses down Enter on the "Connect" button it will
    // trigger and focus will move to the "Cancel" button. This should prevent
    // the user accidentally triggering the "Cancel" button if they hold down
    // Enter for a little bit too long.
    for (const button of document.body.querySelectorAll("button")) {
      button.addEventListener("keydown", event => {
        // If the keydown is a repeating Enter event, ignore it.
        // NOTE: If firefox uses wayland display (rather than xwayland), the
        // "repeat" event is always "false" so this will not work.
        // See bugzilla bug 1784438. Also see bugzilla bug 1594003.
        // Currently tor browser uses xwayland by default on linux.
        if (event.key === "Enter" && event.repeat) {
          event.preventDefault();
        }
      });
    }
  }

  initObservers() {
    // TorConnectParent feeds us state blobs to we use to update our UI
    RPMAddMessageListener("torconnect:state-change", ({ data }) => {
      this.updateUI(data);
    });
    RPMAddMessageListener("torconnect:user-action", ({ data }) => {
      if (data.location) {
        this.uiState.selectedLocation = data.location;
        this.setLocation();
      }
      if (data.uiState !== undefined) {
        this.transitionUIState(data.uiState, data.connState);
      }
    });
  }

  initKeyboardShortcuts() {
    document.onkeydown = evt => {
      // unfortunately it looks like we still haven't standardized keycodes to
      // integers, so we must resort to a string compare here :(
      // see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code for relevant documentation
      if (evt.code === "Escape") {
        this.cancelBootstrap();
      }
    };
  }

  async init() {
    let args = await RPMSendQuery("torconnect:get-init-args");

    // various constants
    TorStrings = Object.freeze(args.TorStrings);
    TorConnectState = Object.freeze(args.TorConnectState);
    InternetStatus = Object.freeze(args.InternetStatus);
    this.locations = args.CountryNames;

    this.initElements(args.Direction);
    this.initObservers();
    this.initKeyboardShortcuts();

    if (Object.keys(args.State.UIState).length) {
      this.uiState = args.State.UIState;
    } else {
      args.State.UIState = this.uiState;
      this.saveUIState();
    }
    this.uiStates[this.uiState.currentState](args.State);
    // populate UI based on current state
    this.updateUI(args.State);
  }
}

const aboutTorConnect = new AboutTorConnect();
aboutTorConnect.init();
