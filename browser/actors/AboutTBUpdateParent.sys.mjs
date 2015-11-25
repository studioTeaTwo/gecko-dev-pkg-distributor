// Copyright (c) 2020, The Tor Project, Inc.
// See LICENSE for licensing information.
//
// vim: set sw=2 sts=2 ts=8 et syntax=javascript:

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const kRequestUpdateMessageName = "FetchUpdateData";

/**
 * This code provides services to the about:tbupdate page. Whenever
 * about:tbupdate needs to do something chrome-privileged, it sends a
 * message that's handled here. It is modeled after Mozilla's about:home
 * implementation.
 */
export class AboutTBUpdateParent extends JSWindowActorParent {
  async receiveMessage(aMessage) {
    if (aMessage.name == kRequestUpdateMessageName) {
      return this.getReleaseNoteInfo();
    }
    return undefined;
  }

  get moreInfoURL() {
    try {
      return Services.prefs.getCharPref("torbrowser.post_update.url");
    } catch (e) {}

    // Use the default URL as a fallback.
    return Services.urlFormatter.formatURLPref("startup.homepage_override_url");
  }

  // Read the text from the beginning of the changelog file that is located
  // at TorBrowser/Docs/ChangeLog.txt (or,
  // TorBrowser.app/Contents/Resources/TorBrowser/Docs/ on macOS, to support
  // Gatekeeper signing) and return an object that contains the following
  // properties:
  //   version        e.g., Tor Browser 8.5
  //   releaseDate    e.g., March 31 2019
  //   releaseNotes   details of changes (lines 2 - end of ChangeLog.txt)
  // We attempt to parse the first line of ChangeLog.txt to extract the
  // version and releaseDate. If parsing fails, we return the entire first
  // line in version and omit releaseDate.
  async getReleaseNoteInfo() {
    let info = { moreInfoURL: this.moreInfoURL };

    try {
      // "XREExeF".parent is the directory that contains firefox, i.e.,
      // Browser/ or, TorBrowser.app/Contents/MacOS/ on macOS.
      let f = Services.dirsvc.get("XREExeF", Ci.nsIFile).parent;
      if (AppConstants.platform === "macosx") {
        f = f.parent;
        f.append("Resources");
      }
      f.append("TorBrowser");
      f.append("Docs");
      f.append("ChangeLog.txt");

      // NOTE: We load in the entire file, but only use the first few lines
      // before the first blank line.
      const logLines = (await IOUtils.readUTF8(f.path))
        .replace(/\n\r?\n.*/ms, "")
        .split(/\n\r?/);

      // Read the first line to get the version and date.
      // Assume everything after the last "-" is the date.
      const firstLine = logLines.shift();
      const match = firstLine?.match(/(.*)-+(.*)/);
      if (match) {
        info.version = match[1].trim();
        info.releaseDate = match[2].trim();
      } else {
        // No date.
        info.version = firstLine?.trim();
      }

      // We want to read the rest of the release notes as a tree. Each entry
      // will contain the text for that line.
      // We choose a negative index for the top node of this tree to ensure no
      // line will appear less indented.
      const topEntry = { indent: -1, children: undefined };
      let prevEntry = topEntry;

      for (let line of logLines) {
        const indent = line.match(/^ */)[0];
        line = line.trim();
        if (line.startsWith("*")) {
          // Treat as a bullet point.
          let entry = {
            text: line.replace(/^\*\s/, ""),
            indent: indent.length,
          };
          let parentEntry;
          if (entry.indent > prevEntry.indent) {
            // A sub-list of the previous item.
            prevEntry.children = [];
            parentEntry = prevEntry;
          } else {
            // Same list or end of sub-list.
            // Search for the first parent whose indent comes before ours.
            parentEntry = prevEntry.parent;
            while (entry.indent <= parentEntry.indent) {
              parentEntry = parentEntry.parent;
            }
          }
          entry.parent = parentEntry;
          parentEntry.children.push(entry);
          prevEntry = entry;
        } else if (prevEntry === topEntry) {
          // Unexpected, missing bullet point on first line.
          // Place as its own bullet point instead, and set as prevEntry for the
          // next loop.
          prevEntry = { text: line, indent: indent.length, parent: topEntry };
          topEntry.children = [prevEntry];
        } else {
          // Append to the previous bullet point.
          prevEntry.text += ` ${line}`;
        }
      }

      info.releaseNotes = topEntry.children;
    } catch (e) {
      console.error(e);
    }

    return info;
  }
}
