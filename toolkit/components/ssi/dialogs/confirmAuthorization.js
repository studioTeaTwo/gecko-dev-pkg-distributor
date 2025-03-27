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
 */

/**
 * onload() handler.
 */
function onLoad() {
  const { permission, caption, evidence, submission } = window.arguments[0];

  document.getElementById("caption").textContent = caption;
  document.getElementById("permission").textContent = permission;
  document.getElementById("submission").textContent = submission;

  document.addEventListener("dialogaccept", onDialogAccept);
  document.addEventListener("dialogcancel", onDialogCancel);

  if (evidence) {
    const box = document.getElementById("evidence");
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(evidence, null, 2);
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
}

/**
 * ondialogcancel() handler.
 */
function onDialogCancel() {
  let returnVals = window.arguments[1];
  returnVals.confirmed = false;
}
