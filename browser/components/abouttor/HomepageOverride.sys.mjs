// FIXME: Eventually drop this entirely. It is only known to be used by Whonix,
// which could set their default home page using "browser.startup.homepage".
// See https://gitlab.torproject.org/tpo/applications/tor-browser/-/issues/13835#note_2928881
export function checkHomepageOverride() {
  // tor-browser#13835: Allow overriding the default homepage by setting a
  // custom environment variable.
  if (Services.env.exists("TOR_DEFAULT_HOMEPAGE")) {
    const prefName = "browser.startup.homepage";
    // if the user has set this value in a previous installation, don't
    // override it
    if (!Services.prefs.prefHasUserValue(prefName)) {
      Services.prefs.setCharPref(
        prefName,
        Services.env.get("TOR_DEFAULT_HOMEPAGE")
      );
    }
  }
}
