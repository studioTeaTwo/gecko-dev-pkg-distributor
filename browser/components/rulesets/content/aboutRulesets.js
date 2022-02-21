"use strict";

/* eslint-env mozilla/remote-page */

const Orders = Object.freeze({
  Name: "name",
  NameDesc: "name-desc",
  LastUpdate: "last-update",
});

const States = Object.freeze({
  Warning: "warning",
  Details: "details",
  Edit: "edit",
  NoRulesets: "noRulesets",
});

function setUpdateDate(ruleset, element) {
  if (!ruleset.enabled) {
    document.l10n.setAttributes(element, "rulesets-update-rule-disabled");
    return;
  }
  if (!ruleset.currentTimestamp) {
    document.l10n.setAttributes(element, "rulesets-update-never");
    return;
  }

  document.l10n.setAttributes(element, "rulesets-update-last", {
    date: ruleset.currentTimestamp * 1000,
  });
}

// UI states

/**
 * This is the initial warning shown when the user opens about:rulesets.
 */
class WarningState {
  elements = {
    enableCheckbox: document.getElementById("warning-enable-checkbox"),
    button: document.getElementById("warning-button"),
  };

  constructor() {
    this.elements.enableCheckbox.addEventListener(
      "change",
      this.onEnableChange.bind(this)
    );

    this.elements.button.addEventListener(
      "click",
      this.onButtonClick.bind(this)
    );
  }

  show() {
    this.elements.button.focus();
  }

  hide() {}

  onEnableChange() {
    RPMSendAsyncMessage(
      "rulesets:set-show-warning",
      this.elements.enableCheckbox.checked
    );
  }

  onButtonClick() {
    gAboutRulesets.selectFirst();
  }
}

/**
 * State shown when the user clicks on a channel to see its details.
 */
class DetailsState {
  elements = {
    title: document.getElementById("ruleset-title"),
    jwkValue: document.getElementById("ruleset-jwk-value"),
    pathPrefixValue: document.getElementById("ruleset-path-prefix-value"),
    scopeValue: document.getElementById("ruleset-scope-value"),
    enableCheckbox: document.getElementById("ruleset-enable-checkbox"),
    updateButton: document.getElementById("ruleset-update-button"),
    updated: document.getElementById("ruleset-updated"),
  };

  constructor() {
    document
      .getElementById("ruleset-edit")
      .addEventListener("click", this.onEdit.bind(this));
    this.elements.enableCheckbox.addEventListener(
      "change",
      this.onEnable.bind(this)
    );
    this.elements.updateButton.addEventListener(
      "click",
      this.onUpdate.bind(this)
    );
  }

  show(ruleset) {
    const elements = this.elements;
    elements.title.textContent = ruleset.name;
    elements.jwkValue.textContent = JSON.stringify(ruleset.jwk);
    elements.pathPrefixValue.setAttribute("href", ruleset.pathPrefix);
    elements.pathPrefixValue.textContent = ruleset.pathPrefix;
    elements.scopeValue.textContent = ruleset.scope;
    elements.enableCheckbox.checked = ruleset.enabled;
    if (ruleset.enabled) {
      elements.updateButton.removeAttribute("disabled");
    } else {
      elements.updateButton.setAttribute("disabled", "disabled");
    }
    setUpdateDate(ruleset, elements.updated);
    this._showing = ruleset;

    gAboutRulesets.list.setItemSelected(ruleset.name);
  }

  hide() {
    this._showing = null;
  }

  onEdit() {
    gAboutRulesets.setState(States.Edit, this._showing);
  }

  async onEnable() {
    await RPMSendAsyncMessage("rulesets:enable-channel", {
      name: this._showing.name,
      enabled: this.elements.enableCheckbox.checked,
    });
  }

  async onUpdate() {
    try {
      await RPMSendQuery("rulesets:update-channel", this._showing.name);
    } catch (err) {
      console.error("Could not update the rulesets", err);
    }
  }
}

/**
 * State to edit a channel.
 */
class EditState {
  elements = {
    form: document.getElementById("edit-ruleset-form"),
    title: document.getElementById("edit-title"),
    jwkTextarea: document.getElementById("edit-jwk-textarea"),
    pathPrefixInput: document.getElementById("edit-path-prefix-input"),
    scopeInput: document.getElementById("edit-scope-input"),
    enableCheckbox: document.getElementById("edit-enable-checkbox"),
  };

  constructor() {
    document
      .getElementById("edit-save")
      .addEventListener("click", this.onSave.bind(this));
    document
      .getElementById("edit-cancel")
      .addEventListener("click", this.onCancel.bind(this));
  }

  show(ruleset) {
    const elements = this.elements;
    elements.form.reset();
    elements.title.textContent = ruleset.name;
    elements.jwkTextarea.value = JSON.stringify(ruleset.jwk);
    elements.pathPrefixInput.value = ruleset.pathPrefix;
    elements.scopeInput.value = ruleset.scope;
    elements.enableCheckbox.checked = ruleset.enabled;
    this._editing = ruleset;
  }

  hide() {
    this.elements.form.reset();
    this._editing = null;
  }

  async onSave(e) {
    e.preventDefault();
    const elements = this.elements;

    let valid = true;
    const name = this._editing.name;

    let jwk;
    try {
      jwk = JSON.parse(elements.jwkTextarea.value);
      await crypto.subtle.importKey(
        "jwk",
        jwk,
        {
          name: "RSA-PSS",
          saltLength: 32,
          hash: { name: "SHA-256" },
        },
        true,
        ["verify"]
      );
      elements.jwkTextarea.setCustomValidity("");
    } catch (err) {
      console.error("Invalid JSON or invalid JWK", err);
      elements.jwkTextarea.setCustomValidity(
        await document.l10n.formatValue("rulesets-details-jwk-input-invalid")
      );
      valid = false;
    }

    const pathPrefix = elements.pathPrefixInput.value.trim();
    try {
      const url = new URL(pathPrefix);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        elements.pathPrefixInput.setCustomValidity(
          await document.l10n.formatValue("rulesets-details-path-input-invalid")
        );
        valid = false;
      } else {
        elements.pathPrefixInput.setCustomValidity("");
      }
    } catch (err) {
      console.error("The path prefix is not a valid URL", err);
      elements.pathPrefixInput.setCustomValidity(
        await document.l10n.formatValue("rulesets-details-path-input-invalid")
      );
      valid = false;
    }

    let scope;
    try {
      scope = new RegExp(elements.scopeInput.value.trim());
      elements.scopeInput.setCustomValidity("");
    } catch (err) {
      elements.scopeInput.setCustomValidity(
        await document.l10n.formatValue("rulesets-details-scope-input-invalid")
      );
      valid = false;
    }

    if (!valid) {
      return;
    }

    const enabled = elements.enableCheckbox.checked;

    const rulesetData = { name, jwk, pathPrefix, scope, enabled };
    const ruleset = await RPMSendQuery("rulesets:set-channel", rulesetData);
    gAboutRulesets.setState(States.Details, ruleset);
    if (enabled) {
      try {
        await RPMSendQuery("rulesets:update-channel", name);
      } catch (err) {
        console.warn("Could not update the ruleset after adding it", err);
      }
    }
  }

  onCancel(e) {
    e.preventDefault();
    if (this._editing === null) {
      gAboutRulesets.selectFirst();
    } else {
      gAboutRulesets.setState(States.Details, this._editing);
    }
  }
}

/**
 * State shown when no rulesets are available.
 * Currently, the only way to reach it is to delete all the channels manually.
 */
class NoRulesetsState {
  show() {}
  hide() {}
}

/**
 * Manages the sidebar with the list of the various channels, and keeps it in
 * sync with the data we receive from the backend.
 */
class RulesetList {
  elements = {
    list: document.getElementById("ruleset-list"),
    emptyContainer: document.getElementById("ruleset-list-empty"),
    itemTemplate: document.getElementById("ruleset-template"),
  };

  nameAttribute = "data-name";

  rulesets = [];

  constructor() {
    RPMAddMessageListener(
      "rulesets:channels-change",
      this.onRulesetsChanged.bind(this)
    );
  }

  getSelectedRuleset() {
    const name = this.elements.list
      .querySelector(".selected")
      ?.getAttribute(this.nameAttribute);
    for (const ruleset of this.rulesets) {
      if (ruleset.name == name) {
        return ruleset;
      }
    }
    return null;
  }

  isEmpty() {
    return !this.rulesets.length;
  }

  async update() {
    this.rulesets = await RPMSendQuery("rulesets:get-channels");
    await this._populateRulesets();
  }

  setItemSelected(name) {
    name = name.replace(/["\\]/g, "\\$&");
    const item = this.elements.list.querySelector(
      `.item[${this.nameAttribute}="${name}"]`
    );
    this._selectItem(item);
  }

  async _populateRulesets() {
    if (this.isEmpty()) {
      this.elements.emptyContainer.classList.remove("hidden");
    } else {
      this.elements.emptyContainer.classList.add("hidden");
    }

    const list = this.elements.list;
    const selName = list
      .querySelector(".item.selected")
      ?.getAttribute(this.nameAttribute);
    const items = list.querySelectorAll(".item");
    for (const item of items) {
      item.remove();
    }

    for (const ruleset of this.rulesets) {
      const item = this._addItem(ruleset);
      if (ruleset.name === selName) {
        this._selectItem(item);
      }
    }
  }

  _addItem(ruleset) {
    const item = this.elements.itemTemplate.cloneNode(true);
    item.removeAttribute("id");
    item.classList.add("item");
    item.querySelector(".name").textContent = ruleset.name;
    const descr = item.querySelector(".description");
    setUpdateDate(ruleset, descr);
    item.classList.toggle("disabled", !ruleset.enabled);
    item.setAttribute(this.nameAttribute, ruleset.name);
    item.addEventListener("click", () => {
      this.onRulesetClick(ruleset);
    });
    this.elements.list.append(item);
    return item;
  }

  _selectItem(item) {
    this.elements.list.querySelector(".selected")?.classList.remove("selected");
    item?.classList.add("selected");
  }

  onRulesetClick(ruleset) {
    gAboutRulesets.setState(States.Details, ruleset);
  }

  onRulesetsChanged(data) {
    this.rulesets = data.data;
    this._populateRulesets();
    const selected = this.getSelectedRuleset();
    if (selected !== null) {
      gAboutRulesets.setState(States.Details, selected);
    }
  }
}

/**
 * The entry point of about:rulesets.
 * It initializes the various states and allows to switch between them.
 */
class AboutRulesets {
  _state = null;

  async init() {
    const args = await RPMSendQuery("rulesets:get-init-args");
    const showWarning = args.showWarning;

    this.list = new RulesetList();
    this._states = {};
    this._states[States.Warning] = new WarningState();
    this._states[States.Details] = new DetailsState();
    this._states[States.Edit] = new EditState();
    this._states[States.NoRulesets] = new NoRulesetsState();

    await this.refreshRulesets();

    if (showWarning) {
      this.setState(States.Warning);
    } else {
      this.selectFirst();
    }
  }

  setState(state, ...args) {
    document.querySelector("body").className = `state-${state}`;
    this._state?.hide();
    this._state = this._states[state];
    this._state.show(...args);
  }

  async refreshRulesets() {
    await this.list.update();
    if (this._state === this._states[States.Details]) {
      const ruleset = this.list.getSelectedRuleset();
      if (ruleset !== null) {
        this.setState(States.Details, ruleset);
      } else {
        this.selectFirst();
      }
    } else if (this.list.isEmpty()) {
      this.setState(States.NoRulesets);
    }
  }

  selectFirst() {
    if (this.list.isEmpty()) {
      this.setState(States.NoRulesets);
    } else {
      this.setState("details", this.list.rulesets[0]);
    }
  }
}

const gAboutRulesets = new AboutRulesets();
gAboutRulesets.init();
