/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.os.Bundle
import androidx.navigation.findNavController
import androidx.preference.Preference
import androidx.preference.PreferenceFragmentCompat
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.nav
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.tor.TorBridgeTransportConfig
import org.mozilla.fenix.tor.TorEvents

/**
 * Lets the user configure Tor network connection settings
 */
class TorNetworkSettingsFragment : PreferenceFragmentCompat(), TorEvents {
    override fun onResume() {
        super.onResume()

        val torController = requireContext().components.torController

        torController.registerTorListener(this)

        showToolbar(getString(R.string.preferences_tor_network_settings))

        val yesString = getString(R.string.preferences_tor_network_settings_yes)
        val noString = getString(R.string.preferences_tor_network_settings_no)

        requirePreference<Preference>(R.string.pref_key_tor_network_settings_bridge_config).apply {
            setOnPreferenceClickListener {
                val directions =
                    TorNetworkSettingsFragmentDirections
                        .actionTorNetworkSettingsFragmentToTorBridgeConfigFragment()
                requireView().findNavController().navigate(directions)
                true
            }

            if (torController.bridgesEnabled) {
                if (torController.bridgeTransport == TorBridgeTransportConfig.USER_PROVIDED) {
                    summary =
                        getString(
                            R
                            .string
                            .preferences_tor_network_settings_bridge_config_description_user_provided_enabled
                        )
                } else {
                    summary =
                        getString(
                            R
                            .string
                            .preferences_tor_network_settings_bridge_config_description_builtin_transport_enabled
                        )
                }
            } else {
                summary =
                    getString(
                        R
                        .string
                        .preferences_tor_network_settings_bridge_config_description
                    )
            }
        }

        requirePreference<Preference>(R.string.pref_key_tor_network_settings_bridges_enabled).apply {
            val formatStringRes = R.string.preferences_tor_network_settings_bridges_enabled
            title = if (torController.bridgesEnabled) {
                getString(formatStringRes, yesString)
            } else {
                getString(formatStringRes, noString)
            }
        }

        setStatus()
    }

    private fun setStatus() {
        val torController = requireContext().components.torController
        val yesString = getString(R.string.preferences_tor_network_settings_yes)
        val noString = getString(R.string.preferences_tor_network_settings_no)

        requirePreference<Preference>(R.string.pref_key_tor_network_settings_tor_ready).apply {
            val formatStringRes = R.string.preferences_tor_network_settings_tor_ready
            @SuppressWarnings("ComplexCondition")
            title = if (!torController.isStarting &&
                torController.isConnected &&
                torController.isBootstrapped &&
                !torController.isRestarting) {
                getString(formatStringRes, yesString)
            } else {
                getString(formatStringRes, noString)
            }
        }

        requirePreference<Preference>(R.string.pref_key_tor_network_settings_state).apply {
            val formatStringRes = R.string.preferences_tor_network_settings_state

            title = if (torController.isRestarting) {
                getString(formatStringRes,
                    getString(
                        R
                        .string
                        .preferences_tor_network_settings_restarting
                    )
                )
            } else if (torController.isStarting) {
                getString(formatStringRes,
                    getString(
                        R
                        .string
                        .preferences_tor_network_settings_connecting
                    )
                )
            } else if (torController.isConnected) {
                getString(formatStringRes,
                    getString(
                        R
                        .string
                        .preferences_tor_network_settings_connected
                    )
                )
            } else {
                getString(formatStringRes,
                    getString(
                        R
                        .string
                        .preferences_tor_network_settings_disconnected
                    )
                )
            }
        }
    }

    override fun onStop() {
        super.onStop()
        requireContext().components.torController.unregisterTorListener(this)
    }

    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        setPreferencesFromResource(R.xml.tor_network_settings_preferences, rootKey)
    }

    @SuppressWarnings("EmptyFunctionBlock")
    override fun onTorConnecting() {
    }

    @SuppressWarnings("EmptyFunctionBlock")
    override fun onTorConnected() {
    }

    @SuppressWarnings("EmptyFunctionBlock")
    override fun onTorStopped() {
    }

    override fun onTorStatusUpdate(entry: String?, status: String?) {
        setStatus()
    }
}
