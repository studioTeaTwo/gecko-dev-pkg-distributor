package org.mozilla.geckoview.androidlegacysettings;

import org.mozilla.geckoview.TorSettings;

public class TorLegacyAndroidSettings {

    private static String PREF_USE_MOZ_PREFS = "tor_use_moz_prefs";

    public static boolean unmigrated() {
        return !Prefs.getBoolean(PREF_USE_MOZ_PREFS, false);
    }

    public static void setUnmigrated() {
        Prefs.putBoolean(PREF_USE_MOZ_PREFS, false);
    }

    public static void setMigrated() {
        Prefs.putBoolean(PREF_USE_MOZ_PREFS, true);
    }

    public static TorSettings loadTorSettings() {
        TorSettings settings = new TorSettings();

        // always true, tor is enabled in TB
        settings.enabled = true;

        // firefox-android disconnected quick start a while ago so it's untracked
        settings.quickstart = false;

        settings.bridgesEnabled = Prefs.bridgesEnabled();

        // tor-android-service CustomTorInstaller.java
/*
        BridgesList is an overloaded field, which can cause some confusion.
        The list can be:
          1) a filter like obfs4, meek, or snowflake OR
          2) it can be a custom bridge
        For (1), we just pass back all bridges, the filter will occur
          elsewhere in the library.
        For (2) we return the bridge list as a raw stream.
        If length is greater than 9, then we know this is a custom bridge
     */
        String userDefinedBridgeList = Prefs.getBridgesList();
        boolean userDefinedBridge = userDefinedBridgeList.length() > 9;
        // Terrible hack. Must keep in sync with topl::addBridgesFromResources.
        if (!userDefinedBridge) {
            settings.bridgesSource = TorSettings.BridgeSource.BuiltIn;
            switch (userDefinedBridgeList) {
                case "obfs4":
                case "snowflake":
                    settings.bridgesBuiltinType = TorSettings.BridgeBuiltinType.fromString(userDefinedBridgeList);
                    break;
                case "meek":
                    settings.bridgesBuiltinType = TorSettings.BridgeBuiltinType.MeekAzure;
                    break;
                default:
                    settings.bridgesSource = TorSettings.BridgeSource.Invalid;
                    break;
            }
        } else {
            settings.bridgesSource = TorSettings.BridgeSource.UserProvided; // user provided
            settings.bridgeBridgeStrings = userDefinedBridgeList.split("\r\n");
        }

        // Tor Browser Android doesn't take proxy and firewall settings
        settings.proxyEnabled = false;

        settings.firewallEnabled = false;
        settings.firewallAllowedPorts = new int[0];

        return settings;
    }
}
