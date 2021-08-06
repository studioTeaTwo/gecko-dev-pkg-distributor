/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  MoatRPC: "resource://gre/modules/Moat.sys.mjs",
});

export var BridgeDB = {
  _moatRPC: null,
  _challenge: null,
  _image: null,
  _bridges: null,
  /**
   * A collection of controllers to abort any ongoing Moat requests if the
   * dialog is closed.
   *
   * NOTE: We do not expect this set to ever contain more than one instance.
   * However the public API has no assurances to prevent multiple calls.
   *
   * @type {Set<AbortController>}
   */
  _moatAbortControllers: new Set(),

  get currentCaptchaImage() {
    return this._image;
  },

  get currentBridges() {
    return this._bridges;
  },

  async submitCaptchaGuess(solution) {
    if (!this._moatRPC) {
      this._moatRPC = new lazy.MoatRPC();
      await this._moatRPC.init();
    }

    const abortController = new AbortController();
    this._moatAbortControllers.add(abortController);
    try {
      this._bridges = await this._moatRPC.check(
        "obfs4",
        this._challenge,
        solution,
        abortController.signal
      );
    } finally {
      this._moatAbortControllers.delete(abortController);
    }
    return this._bridges;
  },

  async requestNewCaptchaImage() {
    try {
      if (!this._moatRPC) {
        this._moatRPC = new lazy.MoatRPC();
        await this._moatRPC.init();
      }

      const abortController = new AbortController();
      this._moatAbortControllers.add(abortController);
      let response;
      try {
        response = await this._moatRPC.fetch(["obfs4"], abortController.signal);
      } finally {
        this._moatAbortControllers.delete(abortController);
      }
      if (response) {
        // Not cancelled.
        this._challenge = response.challenge;
        this._image =
          "data:image/jpeg;base64," + encodeURIComponent(response.image);
      }
    } catch (err) {
      console.error("Could not request a captcha image", err);
    }
    return this._image;
  },

  close() {
    // Abort any ongoing requests.
    for (const controller of this._moatAbortControllers) {
      controller.abort();
    }
    this._moatAbortControllers.clear();
    this._moatRPC?.uninit();
    this._moatRPC = null;
    this._challenge = null;
    this._image = null;
    this._bridges = null;
  },
};
