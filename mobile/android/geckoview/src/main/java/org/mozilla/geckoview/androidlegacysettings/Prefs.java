package org.mozilla.geckoview.androidlegacysettings;

import android.content.Context;
import android.content.SharedPreferences;
import org.mozilla.gecko.GeckoAppShell;

import java.util.Locale;

// tor-android-service utils/Prefs.java

/* package */ class Prefs {
    private final static String PREF_BRIDGES_ENABLED = "pref_bridges_enabled";
    private final static String PREF_BRIDGES_LIST = "pref_bridges_list";

    private static SharedPreferences prefs;

    // OrbotConstants
    private final static String PREF_TOR_SHARED_PREFS = "org.torproject.android_preferences";


    // tor-android-service utils/TorServiceUtil.java

    private static void setContext() {
        if (prefs == null) {
            prefs = GeckoAppShell.getApplicationContext().getSharedPreferences(PREF_TOR_SHARED_PREFS,
                    Context.MODE_MULTI_PROCESS);
        }
    }

    public static boolean getBoolean(String key, boolean def) {
        setContext();
        return prefs.getBoolean(key, def);
    }

    public static void putBoolean(String key, boolean value) {
        setContext();
        prefs.edit().putBoolean(key, value).apply();
    }

    public static void putString(String key, String value) {
        setContext();
        prefs.edit().putString(key, value).apply();
    }

    public static String getString(String key, String def) {
        setContext();
        return prefs.getString(key, def);
    }

    public static boolean bridgesEnabled() {
        setContext();
        // for Locale.getDefault().getLanguage().equals("fa"), bridges were enabled by default (and
        // it was meek). This was a default set in 2019 code, but it is not a good default anymore,
        // so we removed the check.
        return prefs.getBoolean(PREF_BRIDGES_ENABLED, false);
    }

    public static String getBridgesList() {
        setContext();
        String list = prefs.getString(PREF_BRIDGES_LIST, "");
        // list might be empty if the default PT was used, so check also if bridges are enabled.
        if (list.isEmpty() && prefs.getBoolean(PREF_BRIDGES_ENABLED, false)) {
            // Even though the check on the fa locale is not good to enable bridges by default, we
            // still check it here, because if the list was empty, it was likely that it was the
            // choice for users with this locale.
            return (Locale.getDefault().getLanguage().equals("fa")) ? "meek": "obfs4";
        }
        return list;
    }


}
