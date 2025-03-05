package org.mozilla.geckoview;

import java.security.InvalidParameterException;

public enum TorConnectStageName {
    // These names should match entries from TorConnectStage in TorConnect.sys.mjs at ~ln163.
    Disabled("Disabled"),
    Loading("Loading"),
    Start("Start"),
    Bootstrapping("Bootstrapping"),
    Offline("Offline"),
    ChooseRegion("ChooseRegion"),
    RegionNotFound("RegionNotFound"),
    ConfirmRegion("ConfirmRegion"),
    FinalError("FinalError"),
    Bootstrapped("Bootstrapped");

    private String valueText;

    TorConnectStageName(String valueText) {
        this.valueText = valueText;
    }

    public Boolean isBootstrapped() {
        return this == Bootstrapped;
    }

    public String getString() {
        return this.valueText;
    }

    public static TorConnectStageName fromString(String text) {
        for (TorConnectStageName tcs : TorConnectStageName.values()) {
            if (tcs.valueText.equalsIgnoreCase(text)) {
                return tcs;
            }
        }
        if (BuildConfig.BUILD_TYPE == "debug") {
            throw new InvalidParameterException("Unknown TorConnectStageName " + text);
        }
        return null;
    }
}
