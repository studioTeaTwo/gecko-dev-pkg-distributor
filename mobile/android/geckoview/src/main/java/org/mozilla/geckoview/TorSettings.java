package org.mozilla.geckoview;

import android.util.Log;

import org.mozilla.gecko.util.GeckoBundle;

public class TorSettings {

    public enum BridgeSource {
        Invalid(-1),
        BuiltIn(0),
        BridgeDB(1),
        UserProvided(2);

        private int source;

        BridgeSource(final int source) {
            this.source = source;
        }

        public static BridgeSource fromInt(int i) {
            switch (i) {
                case -1: return Invalid;
                case 0: return BuiltIn;
                case 1: return BridgeDB;
                case 2: return UserProvided;
            }
            return Invalid;
        }

        public int toInt() {
            return this.source;
        }
    }

    public enum ProxyType {
        Invalid(-1),
        Socks4(0),
        Socks5(1),
        HTTPS(2);

        private int type;

        ProxyType(final int type) {
            this.type = type;
        }

        public int toInt() {
            return type;
        }

        public static ProxyType fromInt(int i) {
            switch (i) {
                case -1: return Invalid;
                case 0: return Socks4;
                case 1: return Socks5;
                case 2: return HTTPS;
            }
            return Invalid;
        }
    }

    public enum BridgeBuiltinType {
        /* TorSettings.sys.mjs ~ln43:  string: obfs4|meek-azure|snowflake|etc */
        Invalid("invalid"),
        Obfs4("obfs4"),
        MeekAzure("meek-azure"),
        Snowflake("snowflake");


        private String type;

        BridgeBuiltinType(String type) {
            this.type = type;
        }

        public String toString() {
            return type;
        }

        public static BridgeBuiltinType fromString(String s) {
            switch (s) {
                case "obfs4": return Obfs4;
                case "meek-azure": return MeekAzure;
                case "snowflake": return Snowflake;
            }
            return Invalid;
        }

    }

    private boolean loaded = false;

    public boolean enabled = true;

    public boolean quickstart = false;

    // bridges section
    public boolean bridgesEnabled = false;
    public BridgeSource bridgesSource = BridgeSource.Invalid;
    public BridgeBuiltinType bridgesBuiltinType = BridgeBuiltinType.Invalid;
    public String[] bridgeBridgeStrings;

    // proxy section
    public boolean proxyEnabled = false;
    public ProxyType proxyType = ProxyType.Invalid;
    public String proxyAddress = "";
    public int proxyPort = 0;
    public String proxyUsername = "";
    public String proxyPassword = "";

    // firewall section
    public boolean firewallEnabled = false;
    public int[] firewallAllowedPorts;

    public TorSettings() {
    }

    public TorSettings(GeckoBundle bundle) {
        try {
            GeckoBundle qs = bundle.getBundle("quickstart");
            GeckoBundle bridges = bundle.getBundle("bridges");
            GeckoBundle proxy = bundle.getBundle("proxy");
            GeckoBundle firewall = bundle.getBundle("firewall");

            bridgesEnabled = bridges.getBoolean("enabled");
            bridgesSource = BridgeSource.fromInt(bridges.getInt("source"));
            bridgesBuiltinType = BridgeBuiltinType.fromString(bridges.getString("builtin_type"));
            bridgeBridgeStrings = bridges.getStringArray("bridge_strings");

            quickstart = qs.getBoolean("enabled");

            firewallEnabled = firewall.getBoolean("enabled");
            firewallAllowedPorts = firewall.getIntArray("allowed_ports");

            proxyEnabled = proxy.getBoolean("enabled");
            proxyAddress = proxy.getString("address");
            proxyUsername = proxy.getString("username");
            proxyPassword = proxy.getString("password");
            proxyPort = proxy.getInt("port");
            proxyType = ProxyType.fromInt(proxy.getInt("type"));

            loaded = true;
        } catch (Exception e) {
            Log.e("TorSettings", "bundle access error: " + e.toString(), e);
        }
    }

    public GeckoBundle asGeckoBundle() {
        GeckoBundle bundle = new GeckoBundle();

        GeckoBundle qs = new GeckoBundle();
        GeckoBundle bridges = new GeckoBundle();
        GeckoBundle proxy = new GeckoBundle();
        GeckoBundle firewall = new GeckoBundle();

        bridges.putBoolean("enabled", bridgesEnabled);
        bridges.putInt("source", bridgesSource.toInt());
        bridges.putString("builtin_type", bridgesBuiltinType.toString());
        bridges.putStringArray("bridge_strings", bridgeBridgeStrings);

        qs.putBoolean("enabled", quickstart);

        firewall.putBoolean("enabled", firewallEnabled);
        firewall.putIntArray("allowed_ports", firewallAllowedPorts);

        proxy.putBoolean("enabled", proxyEnabled);
        proxy.putString("address", proxyAddress);
        proxy.putString("username", proxyUsername);
        proxy.putString("password", proxyPassword);
        proxy.putInt("port", proxyPort);
        proxy.putInt("type", proxyType.toInt());

        bundle.putBundle("quickstart", qs);
        bundle.putBundle("bridges", bridges);
        bundle.putBundle("proxy", proxy);
        bundle.putBundle("firewall", firewall);

        return bundle;
    }

    public boolean isLoaded() {
        return this.loaded;
    }
}
