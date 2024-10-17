/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SsiHelper: "resource://gre/modules/SsiHelper.sys.mjs",
});

export function nsCredentialInfo() {}

nsCredentialInfo.prototype = {
  classID: Components.ID("{3A2D17A3-D8D4-400A-B988-0C1C54E4AD4D}"),
  QueryInterface: ChromeUtils.generateQI([
    "nsICredentialInfo",
    "nsICredentialMetaInfo",
  ]),

  //
  // nsICredentialInfo interfaces...
  //

  protocolName: null,
  credentialName: null,
  primary: null,
  secret: null,
  identifier: null,
  properties: null,
  unknownFields: null,

  init(
    aProtocolName,
    aCredentialName,
    aPrimary,
    aSecret,
    aIdentifier,
    aProperties
  ) {
    this.protocolName = aProtocolName;
    this.credentialName = aCredentialName;
    this.primary = aPrimary;
    this.secret = aSecret;
    this.identifier = aIdentifier;
    this.properties = aProperties;
  },

  matches(aCredential) {
    return lazy.SsiHelper.doCredentialsMatch(this, aCredential);
  },

  equals(aCredential) {
    if (
      this.protocolName != aCredential.protocolName ||
      this.credentialName != aCredential.credentialName ||
      this.primary != aCredential.primary ||
      this.secret != aCredential.secret ||
      this.identifier != aCredential.identifier ||
      this.properties != aCredential.properties
    ) {
      return false;
    }

    return true;
  },

  clone() {
    let clone = Cc["@mozilla.org/ssi/credentialInfo;1"].createInstance(
      Ci.nsICredentialInfo
    );
    clone.init(
      this.protocolName,
      this.credentialName,
      this.primary,
      this.secret,
      this.identifier,
      this.properties
    );

    // Copy nsICredentialMetaInfo props
    clone.QueryInterface(Ci.nsICredentialMetaInfo);
    clone.guid = this.guid;
    clone.timeCreated = this.timeCreated;
    clone.timeLastUsed = this.timeLastUsed;
    clone.timeSecretChanged = this.timeSecretChanged;
    clone.timesUsed = this.timesUsed;

    // Unknown fields from other clients
    clone.unknownFields = this.unknownFields;

    return clone;
  },

  //
  // nsICredentialMetaInfo interfaces...
  //

  guid: null,
  timeCreated: null,
  timeLastUsed: null,
  timeSecretChanged: null,
  timesUsed: null,
}; // end of nsCredentialInfo implementation
