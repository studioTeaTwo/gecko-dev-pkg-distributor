#include 001-base-profile.js

pref("app.update.notifyDuringDownload", true);
pref("app.update.url.manual", "https://www.torproject.org/download/languages/");
pref("app.update.url.details", "https://www.torproject.org/download/");
pref("app.update.badgeWaitTime", 0);
pref("app.releaseNotesURL", "about:blank");
// disables the 'What's New?' link in the about dialog, otherwise we need to
// duplicate logic for generating the url to the blog post that is already more
// easily found in about:tor
pref("app.releaseNotesURL.aboutDialog", "about:blank");
// point to our feedback url rather than Mozilla's
pref("app.feedback.baseURL", "https://support.torproject.org/%LOCALE%/misc/bug-or-feedback/");

pref("browser.shell.checkDefaultBrowser", false);

// Proxy and proxy security
pref("network.proxy.socks", "127.0.0.1");
pref("network.proxy.socks_port", 9150);
pref("network.proxy.socks_remote_dns", true);
pref("network.proxy.no_proxies_on", ""); // For fingerprinting and local service vulns (#10419)
pref("network.proxy.allow_hijacking_localhost", true); // Allow proxies for localhost (#31065)
pref("network.proxy.type", 1);
// localhost is already blocked by setting `network.proxy.allow_hijacking_localhost` to
// true, allowing users to explicitly block ports makes them fingerprintable; for details, see
// Bug 41317: Tor Browser leaks banned ports in network.security.ports.banned
pref("network.security.ports.banned", "", locked);
pref("network.dns.disabled", true); // This should cover the #5741 patch for DNS leaks
pref("network.http.max-persistent-connections-per-proxy", 256);
// Disable DNS over HTTPS. Set to explicitly off MODE_TRROFF = 5.
// See tor-browser#41906.
pref("network.trr.mode", 5, locked);

// Treat .onions as secure
pref("dom.securecontext.allowlist_onions", true);

// Disable HTTPS-Only mode for .onion domains (tor-browser#19850)
pref("dom.security.https_only_mode.upgrade_onion", false);

// Bug 40423/41137: Disable http/3
// We should re-enable it as soon as Tor gets UDP support
pref("network.http.http3.enable", false);

// 0 = do not use a second connection, see all.js and #7656
pref("network.http.connection-retry-timeout", 0);

// Tor Browser used to be compatible with non-Tor proxies. This feature is not
// available anymore, but this legacy preference can be still used to disable
// first-party domain circuit isolation.
// In general, it should not be used. This use-case is still supported only for
// sites that break with this isolation (and even in that case, its use should
// be reduced to the strictly required time).
pref("extensions.torbutton.use_nontor_proxy", false);

// tor-browser#43170: Disable user-agent spoofing in HTTP header
pref("privacy.resistFingerprinting.spoofOsInUserAgentHeader", false);

// Browser home page:
pref("browser.startup.homepage", "about:tor");

// tor-browser#40701: Add new download warning
pref("browser.download.showTorWarning", true);

// This pref specifies an ad-hoc "version" for various pref update hacks we need to do
pref("extensions.torbutton.pref_fixup_version", 0);

// Formerly tor-launcher defaults

pref("extensions.torlauncher.start_tor", true);
pref("extensions.torlauncher.prompt_at_startup", true);

pref("extensions.torlauncher.max_tor_log_entries", 1000);

// By default, Tor Launcher configures a TCP listener for the Tor
// control port, as defined by control_host and control_port.
// Set control_port_use_ipc to true to use an IPC object (e.g., a Unix
// domain socket) instead. You may also modify control_ipc_path to
// override the default IPC object location. If a relative path is used,
// it is handled like torrc_path (see below).
pref("extensions.torlauncher.control_host", "127.0.0.1");
pref("extensions.torlauncher.control_port", 9151);
pref("extensions.torlauncher.control_port_use_ipc", false);
pref("extensions.torlauncher.control_ipc_path", "");

// By default, Tor Launcher configures a TCP listener for the Tor
// SOCKS port. The host is taken from the network.proxy.socks pref and
// the port is taken from the network.proxy.socks_port pref.
// Set socks_port_use_ipc to true to use an IPC object (e.g., a Unix
// domain socket) instead. You may also modify socks_ipc_path to
// override the default IPC object location. If a relative path is used,
// it is handled like torrc_path (see below).
// Modify socks_port_flags to use a different set of SocksPort flags (but be
// careful).
pref("extensions.torlauncher.socks_port_use_ipc", false);
pref("extensions.torlauncher.socks_ipc_path", "");
pref("extensions.torlauncher.socks_port_flags", "ExtendedErrors IPv6Traffic PreferIPv6 KeepAliveIsolateSOCKSAuth");

// The tor_path is relative to the application directory. On Linux and
// Windows this is the Browser/ directory that contains the firefox
// executables, and on Mac OS it is the TorBrowser.app directory.
pref("extensions.torlauncher.tor_path", "");

// The torrc_path and tordatadir_path are relative to the data directory,
// which is TorBrowser-Data/ if it exists as a sibling of the application
// directory. If TorBrowser-Data/ does not exist, these paths are relative
// to the TorBrowser/ directory within the application directory.
pref("extensions.torlauncher.torrc_path", "");
pref("extensions.torlauncher.tordatadir_path", "");

// BridgeDB-related preferences (used for Moat).
pref("extensions.torlauncher.bridgedb_front", "www.phpmyadmin.net");
pref("extensions.torlauncher.bridgedb_reflector", "https://1723079976.rsc.cdn77.org");
pref("extensions.torlauncher.moat_service", "https://bridges.torproject.org/moat");

// Log levels
pref("browser.tor_provider.log_level", "Warn");
pref("browser.tor_provider.cp_log_level", "Warn");
pref("lox.log_level", "Warn");
pref("torbrowser.bootstrap.log_level", "Info");
pref("browser.torsettings.log_level", "Warn");
pref("browser.tordomainisolator.loglevel", "Warn");
pref("browser.torcircuitpanel.loglevel", "Log");
