/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file contains branding-specific prefs.

// Set a generic, default URL that will be opened in a tab after an update.
// Typically, this will not be used; instead, the <update> element within
// each update manifest should contain attributes similar to:
//   actions="showURL"
//   openURL="https://blog.torproject.org/tor-browser-55a2-released"
pref("startup.homepage_override_url", "https://blog.torproject.org/category/applications");
pref("app.update.url.details", "https://www.torproject.org/download/");
pref("app.update.url.manual", "https://www.torproject.org/download/");
pref("app.releaseNotesURL", "https://blog.torproject.org/new-release-tor-browser-%BB_VERSION_FOR_URLS%/");
pref("app.releaseNotesURL.aboutDialog", "https://blog.torproject.org/new-release-tor-browser-%BB_VERSION_FOR_URLS%/");

// Interval: Time between checks for a new version (in seconds)
pref("app.update.interval", 43200); // 12 hours
// Give the user x seconds to react before showing the big UI. default=192 hours
pref("app.update.promptWaitTime", 691200);
// The number of days a binary is permitted to be old
// without checking for an update.  This assumes that
// app.update.checkInstallTime is true.
pref("app.update.checkInstallTime.days", 63);
// Number of usages of the web console.
// If this is less than 5, then pasting code into the web console is disabled
pref("devtools.selfxss.count", 0);
