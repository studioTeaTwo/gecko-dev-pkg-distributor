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

    const response = await this._moatRPC.check(
      "obfs4",
      this._challenge,
      solution,
      false
    );
    this._bridges = response?.bridges;
    return this._bridges;
  },

  async requestNewCaptchaImage() {
    try {
      if (!this._moatRPC) {
        this._moatRPC = new lazy.MoatRPC();
        await this._moatRPC.init();
      }

      const response = await this._moatRPC.fetch(["obfs4"]);
      this._challenge = response.challenge;
      this._image =
        "data:image/jpeg;base64," + encodeURIComponent(response.image);
    } catch (err) {
      console.error("Could not request a captcha image", err);
    }
    return this._image;
  },

  close() {
    this._moatRPC?.uninit();
    this._moatRPC = null;
    this._challenge = null;
    this._image = null;
    this._bridges = null;
  },
};
