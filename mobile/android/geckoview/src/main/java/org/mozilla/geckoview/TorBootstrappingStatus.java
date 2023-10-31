package org.mozilla.geckoview;

import org.mozilla.gecko.util.GeckoBundle;

// Class to receive BootstrappingStatus object from TorConnect.sys.mjs ~ln698
public class TorBootstrappingStatus {
    public int progress; // percent of bootstrap progress
    public boolean hasWarning; //  Whether this bootstrap has a warning in the tor log

    public TorBootstrappingStatus(GeckoBundle bundle) {
        progress = bundle.getInt("progress");
        hasWarning = bundle.getBoolean("hasWarning");
    }
}
