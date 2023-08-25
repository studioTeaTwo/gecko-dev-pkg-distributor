/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor

import android.os.Parcelable
import androidx.annotation.StringRes
import kotlinx.parcelize.Parcelize
import org.mozilla.fenix.R

@Parcelize
enum class TorBridgeTransportConfig(
    @StringRes val preferenceKey: Int,
    val transportName: String
) : Parcelable {

    BUILTIN_OBFS4(
        preferenceKey = R.string.pref_key_tor_network_settings_bridge_config_builtin_bridge_obfs4,
        transportName = "obfs4"
    ),
    BUILTIN_MEEK_AZURE(
        preferenceKey = R.string.pref_key_tor_network_settings_bridge_config_builtin_bridge_meek_azure,
        transportName = "meek"
    ),
    BUILTIN_SNOWFLAKE(
        preferenceKey = R.string.pref_key_tor_network_settings_bridge_config_builtin_bridge_snowflake,
        transportName = "snowflake"
    ),
    USER_PROVIDED(
        preferenceKey = R.string.pref_key_tor_network_settings_bridge_config_user_provided_bridge,
        transportName = "user_provided"
    )
}

object TorBridgeTransportConfigUtil {
    fun getStringToBridgeTransport(bridge: String): TorBridgeTransportConfig {
        return when (bridge) {
            TorBridgeTransportConfig.BUILTIN_OBFS4.transportName ->
                TorBridgeTransportConfig.BUILTIN_OBFS4
            TorBridgeTransportConfig.BUILTIN_MEEK_AZURE.transportName ->
                TorBridgeTransportConfig.BUILTIN_MEEK_AZURE
            TorBridgeTransportConfig.BUILTIN_SNOWFLAKE.transportName ->
                TorBridgeTransportConfig.BUILTIN_SNOWFLAKE
            else -> TorBridgeTransportConfig.USER_PROVIDED
        }
    }
}
