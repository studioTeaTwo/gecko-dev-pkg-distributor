"use strict";

{
  /**
   * Element to display a single bridge emoji, with a localized name.
   */
  class BridgeEmoji extends HTMLElement {
    static #activeInstances = new Set();
    static #observer(subject, topic) {
      if (topic === "intl:app-locales-changed") {
        BridgeEmoji.#updateEmojiLangCode();
      }
    }

    static #addActiveInstance(inst) {
      if (this.#activeInstances.size === 0) {
        Services.obs.addObserver(this.#observer, "intl:app-locales-changed");
        this.#updateEmojiLangCode();
      }
      this.#activeInstances.add(inst);
    }

    static #removeActiveInstance(inst) {
      this.#activeInstances.delete(inst);
      if (this.#activeInstances.size === 0) {
        Services.obs.removeObserver(this.#observer, "intl:app-locales-changed");
      }
    }

    /**
     * The language code for emoji annotations.
     *
     * null if unset.
     *
     * @type {string?}
     */
    static #emojiLangCode = null;
    /**
     * A promise that resolves to two JSON structures for bridge-emojis.json and
     * annotations.json, respectively.
     *
     * @type {Promise}
     */
    static #emojiPromise = Promise.all([
      fetch(
        "chrome://browser/content/torpreferences/bridgemoji/bridge-emojis.json"
      ).then(response => response.json()),
      fetch(
        "chrome://browser/content/torpreferences/bridgemoji/annotations.json"
      ).then(response => response.json()),
    ]);

    static #unknownStringPromise = null;

    /**
     * Update #emojiLangCode.
     */
    static async #updateEmojiLangCode() {
      let langCode;
      const emojiAnnotations = (await BridgeEmoji.#emojiPromise)[1];
      // Find the first desired locale we have annotations for.
      // Add "en" as a fallback.
      for (const bcp47 of [...Services.locale.appLocalesAsBCP47, "en"]) {
        langCode = bcp47;
        if (langCode in emojiAnnotations) {
          break;
        }
        // Remove everything after the dash, if there is one.
        langCode = bcp47.replace(/-.*/, "");
        if (langCode in emojiAnnotations) {
          break;
        }
      }
      if (langCode !== this.#emojiLangCode) {
        this.#emojiLangCode = langCode;
        this.#unknownStringPromise = document.l10n.formatValue(
          "tor-bridges-emoji-unknown"
        );
        for (const inst of this.#activeInstances) {
          inst.update();
        }
      }
    }

    /**
     * Update the bridge emoji to show their corresponding emoji with an
     * annotation that matches the current locale.
     */
    async update() {
      if (!this.#active) {
        return;
      }

      if (!BridgeEmoji.#emojiLangCode) {
        // No lang code yet, wait until it is updated.
        return;
      }

      const doc = this.ownerDocument;
      const [unknownString, [emojiList, emojiAnnotations]] = await Promise.all([
        BridgeEmoji.#unknownStringPromise,
        BridgeEmoji.#emojiPromise,
      ]);

      const emoji = emojiList[this.#index];
      let emojiName;
      if (!emoji) {
        // Unexpected.
        this.#img.removeAttribute("src");
      } else {
        const cp = emoji.codePointAt(0).toString(16);
        this.#img.setAttribute(
          "src",
          `chrome://browser/content/torpreferences/bridgemoji/svgs/${cp}.svg`
        );
        emojiName = emojiAnnotations[BridgeEmoji.#emojiLangCode][cp];
      }
      if (!emojiName) {
        doc.defaultView.console.error(`No emoji for index ${this.#index}`);
        emojiName = unknownString;
      }
      doc.l10n.setAttributes(this.#img, "tor-bridges-emoji-image", {
        emojiName,
      });
    }

    /**
     * The index for this bridge emoji.
     *
     * @type {integer?}
     */
    #index = null;
    /**
     * Whether we are active (i.e. in the DOM).
     *
     * @type {boolean}
     */
    #active = false;
    /**
     * The image element.
     *
     * @type {HTMLImgElement?}
     */
    #img = null;

    constructor(index) {
      super();
      this.#index = index;
    }

    connectedCallback() {
      if (!this.#img) {
        this.#img = this.ownerDocument.createElement("img");
        this.#img.classList.add("tor-bridges-emoji-icon");
        this.#img.setAttribute("alt", "");
        this.appendChild(this.#img);
      }

      this.#active = true;
      BridgeEmoji.#addActiveInstance(this);
      this.update();
    }

    disconnectedCallback() {
      this.#active = false;
      BridgeEmoji.#removeActiveInstance(this);
    }

    /**
     * Create four bridge emojis for the given address.
     *
     * @param {string} bridgeLine - The bridge address.
     *
     * @returns {BridgeEmoji[4]} - The bridge emoji elements.
     */
    static createForAddress(bridgeLine) {
      // JS uses UTF-16. While most of these emojis are surrogate pairs, a few
      // ones fit one UTF-16 character. So we could not use neither indices,
      // nor substr, nor some function to split the string.
      // FNV-1a implementation that is compatible with other languages
      const prime = 0x01000193;
      const offset = 0x811c9dc5;
      let hash = offset;
      const encoder = new TextEncoder();
      for (const byte of encoder.encode(bridgeLine)) {
        hash = Math.imul(hash ^ byte, prime);
      }

      return [
        ((hash & 0x7f000000) >> 24) | (hash < 0 ? 0x80 : 0),
        (hash & 0x00ff0000) >> 16,
        (hash & 0x0000ff00) >> 8,
        hash & 0x000000ff,
      ].map(index => new BridgeEmoji(index));
    }
  }

  customElements.define("tor-bridge-emoji", BridgeEmoji);
}
