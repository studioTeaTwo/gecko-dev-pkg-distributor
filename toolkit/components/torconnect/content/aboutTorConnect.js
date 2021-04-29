// Copyright (c) 2021, The Tor Project, Inc.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* eslint-env mozilla/remote-page */

// populated in AboutTorConnect.init()
let TorStrings = {};

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
      locationDropdown: "form#locationDropdown",
      locationDropdownSelect: "form#locationDropdown select",
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

  selectedLocation;
  shownStage = null;

  locations = {};

  beginBootstrapping() {
    RPMSendAsyncMessage("torconnect:begin-bootstrapping", {});
  }

  beginAutoBootstrapping(regionCode) {
    RPMSendAsyncMessage("torconnect:begin-bootstrapping", {
      regionCode,
    });
  }

  cancelBootstrapping() {
    RPMSendAsyncMessage("torconnect:cancel-bootstrapping");
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

  getMaybeLocalizedError(error) {
    switch (error.code) {
      case "Offline":
        return TorStrings.torConnect.offline;
      case "BootstrapError": {
        if (!error.phase || !error.reason) {
          return TorStrings.torConnect.torBootstrapFailed;
        }
        let status = this.getLocalizedStatus(error.phase);
        const reason =
          TorStrings.torConnect.bootstrapWarning[error.reason] ?? error.reason;
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
        return error.message;
      default:
        console.warn(`Unknown error code: ${error.code}`, error);
        return error.message || error.code;
    }
  }

  /*
  These methods update the UI based on the current TorConnect state
  */

  updateStage(stage) {
    if (stage.name === this.shownStage) {
      return;
    }

    this.shownStage = stage.name;
    this.selectedLocation = stage.defaultRegion;

    let showProgress = false;
    let showLog = false;
    switch (stage.name) {
      case "Disabled":
        console.error("Should not be open when TorConnect is disabled");
        break;
      case "Loading":
      case "Start":
        // Loading is not currnetly handled, treat the same as "Start", but UI
        // will be unresponsive.
        this.showStart(stage.tryAgain, stage.potentiallyBlocked);
        break;
      case "Bootstrapping":
        showProgress = true;
        this.showBootstrapping(stage.bootstrapTrigger, stage.tryAgain);
        break;
      case "Offline":
        showLog = true;
        this.showOffline();
        break;
      case "ChooseRegion":
        showLog = true;
        this.showChooseRegion(stage.error);
        break;
      case "RegionNotFound":
        showLog = true;
        this.showRegionNotFound();
        break;
      case "ConfirmRegion":
        showLog = true;
        this.showConfirmRegion(stage.error);
        break;
      case "FinalError":
        showLog = true;
        this.showFinalError(stage.error);
        break;
      case "Bootstrapped":
        showProgress = true;
        this.showBootstrapped();
        break;
      default:
        console.error(`Unknown stage ${stage.name}`);
        break;
    }

    if (showProgress) {
      this.show(this.elements.progressMeter);
    } else {
      this.hide(this.elements.progressMeter);
    }

    this.updateBootstrappingStatus(stage.bootstrappingStatus);

    if (showLog) {
      this.show(this.elements.viewLogButton);
    } else {
      this.hide(this.elements.viewLogButton);
    }
  }

  updateBootstrappingStatus(data) {
    this.elements.progressMeter.style.setProperty(
      "--progress-percent",
      `${data.progress}%`
    );
    if (this.shownStage === "Bootstrapping" && data.hasWarning) {
      // When bootstrapping starts, we hide the log button, but we re-show it if
      // we get a warning.
      this.show(this.elements.viewLogButton);
    }
  }

  updateQuickstart(enabled) {
    this.elements.quickstartToggle.pressed = enabled;
  }

  showBootstrapped() {
    this.setTitle(TorStrings.torConnect.torConnected, "");
    this.setLongText(TorStrings.settings.torPreferencesDescription);
    this.elements.progressDescription.textContent = "";
    this.hideButtons();
  }

  showStart(tryAgain, potentiallyBlocked) {
    this.setTitle(TorStrings.torConnect.torConnect, "");
    this.setLongText(TorStrings.settings.torPreferencesDescription);
    this.elements.progressDescription.textContent = "";
    this.hideButtons();
    this.show(this.elements.quickstartContainer);
    this.show(this.elements.configureButton);
    this.show(this.elements.connectButton, true);
    this.elements.connectButton.focus();
    if (tryAgain) {
      this.elements.connectButton.textContent = TorStrings.torConnect.tryAgain;
    }
    if (potentiallyBlocked) {
      this.setBreadcrumbsStatus(
        BreadcrumbStatus.Active,
        BreadcrumbStatus.Default,
        BreadcrumbStatus.Disabled
      );
    }
  }

  showBootstrapping(trigger, tryAgain) {
    let title = "";
    let description = "";
    const breadcrumbs = [
      BreadcrumbStatus.Disabled,
      BreadcrumbStatus.Disabled,
      BreadcrumbStatus.Disabled,
    ];
    switch (trigger) {
      case "Start":
      case "Offline":
        breadcrumbs[0] = BreadcrumbStatus.Active;
        title = tryAgain
          ? TorStrings.torConnect.tryAgain
          : TorStrings.torConnect.torConnecting;
        description = TorStrings.settings.torPreferencesDescription;
        break;
      case "ChooseRegion":
        breadcrumbs[2] = BreadcrumbStatus.Active;
        title = TorStrings.torConnect.tryingBridge;
        description = TorStrings.torConnect.assistDescription;
        break;
      case "RegionNotFound":
        breadcrumbs[2] = BreadcrumbStatus.Active;
        title = TorStrings.torConnect.tryingBridgeAgain;
        description = TorStrings.torConnect.errorLocationDescription;
        break;
      case "ConfirmRegion":
        breadcrumbs[2] = BreadcrumbStatus.Active;
        title = TorStrings.torConnect.tryingBridgeAgain;
        description = TorStrings.torConnect.isLocationCorrectDescription;
        break;
      default:
        console.warn("Unrecognized bootstrap trigger", trigger);
        break;
    }
    this.setTitle(title, "");
    this.showConfigureConnectionLink(description);
    this.elements.progressDescription.textContent = "";
    if (tryAgain) {
      this.setBreadcrumbsStatus(...breadcrumbs);
    } else {
      this.hideBreadcrumbs();
    }
    this.hideButtons();
    this.show(this.elements.cancelButton);
    this.elements.cancelButton.focus();
  }

  showOffline() {
    this.setTitle(TorStrings.torConnect.noInternet, "offline");
    this.setLongText(TorStrings.torConnect.noInternetDescription);
    this.elements.progressDescription.textContent =
      TorStrings.torConnect.offline;
    this.setBreadcrumbsStatus(
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Active,
      BreadcrumbStatus.Hidden
    );
    this.hideButtons();
    this.show(this.elements.configureButton);
    this.show(this.elements.connectButton, true);
    this.elements.connectButton.textContent = TorStrings.torConnect.tryAgain;
  }

  showChooseRegion(error) {
    this.setTitle(TorStrings.torConnect.couldNotConnect, "assist");
    this.showConfigureConnectionLink(TorStrings.torConnect.assistDescription);
    this.elements.progressDescription.textContent =
      this.getMaybeLocalizedError(error);
    this.setBreadcrumbsStatus(
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Active,
      BreadcrumbStatus.Disabled
    );
    this.showLocationForm(true, TorStrings.torConnect.tryBridge);
    this.elements.tryBridgeButton.focus();
  }

  showRegionNotFound() {
    this.setTitle(TorStrings.torConnect.errorLocation, "location");
    this.showConfigureConnectionLink(
      TorStrings.torConnect.errorLocationDescription
    );
    this.elements.progressDescription.textContent =
      TorStrings.torConnect.cannotDetermineCountry;
    this.setBreadcrumbsStatus(
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Active,
      BreadcrumbStatus.Disabled
    );
    this.showLocationForm(false, TorStrings.torConnect.tryBridge);
    this.elements.tryBridgeButton.focus();
  }

  showConfirmRegion(error) {
    this.setTitle(TorStrings.torConnect.isLocationCorrect, "location");
    this.showConfigureConnectionLink(
      TorStrings.torConnect.isLocationCorrectDescription
    );
    this.elements.progressDescription.textContent =
      this.getMaybeLocalizedError(error);
    this.setBreadcrumbsStatus(
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Default,
      BreadcrumbStatus.Active
    );
    this.showLocationForm(false, TorStrings.torConnect.tryAgain);
    this.elements.tryBridgeButton.focus();
  }

  showFinalError(error) {
    this.setTitle(TorStrings.torConnect.finalError, "final");
    this.setLongText(TorStrings.torConnect.finalErrorDescription);
    this.elements.progressDescription.textContent =
      this.getMaybeLocalizedError(error);
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

  showLocationForm(isChoose, buttonLabel) {
    this.hideButtons();
    RPMSendQuery("torconnect:get-country-codes").then(codes => {
      if (codes && codes.length) {
        this.populateFrequentLocations(codes);
        this.setLocation();
      }
    });
    let firstOpt = this.elements.locationDropdownSelect.options[0];
    if (isChoose) {
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
    this.elements.locationDropdownLabel.classList.toggle("error", !isChoose);
    this.show(this.elements.tryBridgeButton, true);
    if (buttonLabel !== undefined) {
      this.elements.tryBridgeButton.textContent = buttonLabel;
    }
  }

  getLocation() {
    const selectedIndex = this.elements.locationDropdownSelect.selectedIndex;
    return this.elements.locationDropdownSelect.options[selectedIndex].value;
  }

  setLocation() {
    const code = this.selectedLocation;
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
    document.documentElement.setAttribute("dir", direction);

    this.elements.connectToTorLink.addEventListener("click", () => {
      RPMSendAsyncMessage("torconnect:start-again");
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
      RPMSendAsyncMessage("torconnect:choose-region");
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
      this.cancelBootstrapping();
    });

    this.elements.connectButton.textContent =
      TorStrings.torConnect.torConnectButton;
    this.elements.connectButton.addEventListener("click", () => {
      this.beginBootstrapping();
    });

    this.populateLocations();
    this.elements.locationDropdownSelect.addEventListener("change", () => {
      this.validateLocation();
    });

    this.elements.locationDropdownLabel.textContent =
      TorStrings.torConnect.unblockInternetIn;

    this.elements.tryBridgeButton.textContent = TorStrings.torConnect.tryBridge;
    this.elements.tryBridgeButton.addEventListener("click", () => {
      const value = this.getLocation();
      if (value) {
        this.beginAutoBootstrapping(value);
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
    RPMAddMessageListener("torconnect:stage-change", ({ data }) => {
      this.updateStage(data);
    });
    RPMAddMessageListener("torconnect:bootstrap-progress", ({ data }) => {
      this.updateBootstrappingStatus(data);
    });
    RPMAddMessageListener("torconnect:quickstart-change", ({ data }) => {
      this.updateQuickstart(data);
    });
  }

  initKeyboardShortcuts() {
    document.onkeydown = evt => {
      // unfortunately it looks like we still haven't standardized keycodes to
      // integers, so we must resort to a string compare here :(
      // see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code for relevant documentation
      if (evt.code === "Escape") {
        this.cancelBootstrapping();
      }
    };
  }

  async init() {
    let args = await RPMSendQuery("torconnect:get-init-args");

    // various constants
    TorStrings = Object.freeze(args.TorStrings);
    this.locations = args.CountryNames;

    this.initElements(args.Direction);
    this.initObservers();
    this.initKeyboardShortcuts();

    this.updateStage(args.stage);
    this.updateQuickstart(args.quickstartEnabled);
  }
}

const aboutTorConnect = new AboutTorConnect();
aboutTorConnect.init();
