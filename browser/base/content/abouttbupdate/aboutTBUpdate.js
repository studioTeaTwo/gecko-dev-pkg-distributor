// Copyright (c) 2020, The Tor Project, Inc.
// See LICENSE for licensing information.
//
// vim: set sw=2 sts=2 ts=8 et syntax=javascript:

/* eslint-env mozilla/remote-page */

/**
 * An object representing a bullet point in the release notes.
 *
 * typedef {Object} ReleaseBullet
 * @property {string} text - The text for this bullet point.
 * @property {?Array<ReleaseBullet>} children - A sub-list of bullet points.
 */

/**
 * Fill an element with the given list of release bullet points.
 *
 * @param {Element} container - The element to fill with bullet points.
 * @param {Array<ReleaseBullet>} bulletPoints - The list of bullet points.
 * @param {string} [childTag="h3"] - The element tag name to use for direct
 *   children. Initially, the children are h3 sub-headings.
 */
function fillReleaseNotes(container, bulletPoints, childTag = "h3") {
  for (const { text, children } of bulletPoints) {
    const childEl = document.createElement(childTag);
    // Keep dashes like "[tor-browser]" on the same line by nowrapping the word.
    for (const [index, part] of text.split(/(\S+-\S+)/).entries()) {
      if (!part) {
        continue;
      }
      const span = document.createElement("span");
      span.textContent = part;
      span.classList.toggle("no-line-break", index % 2);
      childEl.appendChild(span);
    }
    container.appendChild(childEl);
    if (children) {
      if (childTag == "h3" && text.toLowerCase() === "build system") {
        // Special case: treat the "Build System" heading's children as
        // sub-headings.
        childEl.classList.add("build-system-heading");
        fillReleaseNotes(container, children, "h4");
      } else {
        const listEl = document.createElement("ul");
        fillReleaseNotes(listEl, children, "li");
        if (childTag == "li") {
          // Insert within the "li" element.
          childEl.appendChild(listEl);
        } else {
          container.appendChild(listEl);
        }
      }
    }
  }
}

/**
 * Set the content for the specified container, or hide it if we have no
 * content.
 *
 * @template C
 * @param {string} containerId - The id for the container.
 * @param {?C} content - The content for this container, or a falsey value if
 *   the container has no content.
 * @param {function(contentEl: Elemenet, content: C)} [fillContent] - A function
 *   to fill the ".content" contentEl with the given 'content'. If unspecified,
 *   the 'content' will become the contentEl's textContent.
 */
function setContent(containerId, content, fillContent) {
  const container = document.getElementById(containerId);
  if (!content) {
    container.hidden = true;
    return;
  }
  const contentEl = container.querySelector(".content");
  // Release notes are only in English.
  contentEl.setAttribute("lang", "en-US");
  contentEl.setAttribute("dir", "ltr");
  contentEl.classList.add("en-US-content");
  if (fillContent) {
    fillContent(contentEl, content);
  } else {
    contentEl.textContent = content;
  }
}

/**
 * Callback when we receive the update details.
 *
 * @param {Object} aData - The update details.
 * @param {?string} aData.version - The update version.
 * @param {?string} aData.releaseDate - The release date.
 * @param {?string} aData.moreInfoURL - A URL for more info.
 * @param {?Array<ReleaseBullet>} aData.releaseNotes - Release notes as bullet
 *   points.
 */
function onUpdate(aData) {
  setContent("version-row", aData.version);
  setContent("releasedate-row", aData.releaseDate);
  setContent("releasenotes", aData.releaseNotes, fillReleaseNotes);

  if (aData.moreInfoURL) {
    document.getElementById("infolink").setAttribute("href", aData.moreInfoURL);
  } else {
    document.getElementById("fullinfo").hidden = true;
  }
}

RPMSendQuery("FetchUpdateData").then(onUpdate);
