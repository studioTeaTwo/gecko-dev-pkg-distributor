/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* import-globals-from pippki.js */
"use strict";

/**
 * @param {object[]} window.arguments.0
 *           Info to build dialog
 * @param {ReturnValues} window.arguments.1
 *           Object holding the return values of calling the dialog.
 */

/**
 * @typedef ReturnValues
 * @type {object}
 * @property {boolean} confirmed
 *           Set to true if the user confirmed, false otherwise.
 * @property {string} settingValue
 *           Setting value for whether to trust
 */

/**
 * onload() handler.
 */
function onLoad() {
  const { permission, description, previousSelectionOnConfirm } =
    window.arguments[0];

  document.getElementById("caption").textContent = description.caption;
  document.getElementById("permission").textContent = permission.text;
  document.getElementById("submission").textContent = description.submission;

  if (previousSelectionOnConfirm) {
    document.getElementById("settingValue").selectedItem =
      document.getElementById(previousSelectionOnConfirm);
  }

  if (permission.method !== "generate" && !permission.enforce) {
    document.getElementById(
      "methodTrust"
    ).label = `Trust just this method - "${permission.method}"`;
    const OneHour = 60 * 60 * 1000;
    document.getElementById("password").label = `Ask again after ${
      permission.expirationTime / OneHour
    } hours for ALL requests`;
    document.getElementById(
      "everytime"
    ).label = `Ask everytime (expiration 0) - "${permission.method}"`;
    // document.getElementById(
    //   "confirmOnly"
    // ).label = `Skip password, only confirmation dialog - "${permission.method}"`;
    // document.getElementById(
    //   "passwordOnly"
    // ).label = `Skip confirmation, only password dialog - "${permission.method}"`;
  } else {
    document.getElementById("settingValue").remove();
  }

  document.addEventListener("dialogaccept", onDialogAccept);
  document.addEventListener("dialogcancel", onDialogCancel);

  if (description.evidence) {
    const box = document.getElementById("evidence");
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(description.evidence, null, 2);
    box.appendChild(pre);
  } else {
    document.getElementById("evidence").remove();
  }
}

/**
 * ondialogaccept() handler.
 */
function onDialogAccept() {
  let returnVals = window.arguments[1];
  returnVals.confirmed = true;
  const settingValue = document.getElementById("settingValue");
  returnVals.settingValue = settingValue
    ? settingValue.selectedItem.id
    : "noop"; // In case `permission.method` is "generate" or `permission.enforce` is true.
}

/**
 * ondialogcancel() handler.
 */
function onDialogCancel() {
  let returnVals = window.arguments[1];
  returnVals.confirmed = false;
  returnVals.settingValue = "noop";
}
