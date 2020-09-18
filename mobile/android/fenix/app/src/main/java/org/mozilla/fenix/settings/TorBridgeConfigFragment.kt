/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.os.Bundle
import androidx.preference.EditTextPreference
import androidx.preference.Preference
import androidx.preference.PreferenceFragmentCompat
import androidx.preference.SwitchPreference
import org.mozilla.fenix.Config
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.tor.TorBridgeTransportConfig
import org.mozilla.fenix.utils.view.addToRadioGroup
import org.mozilla.fenix.utils.view.GroupableRadioButton
import org.mozilla.fenix.utils.view.uncheckAll

/**
 * Displays the toggle for enabling bridges, options for built-in pluggable transports, and an additional
 * preference for configuring a user-provided bridge.
 */
@Suppress("SpreadOperator")
class TorBridgeConfigFragment : PreferenceFragmentCompat() {
    private val builtinBridgeRadioGroups = mutableListOf<GroupableRadioButton>()
    private var previousTransportConfig: TorBridgeTransportConfig? = null

    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        setPreferencesFromResource(R.xml.tor_bridge_config_preferences, rootKey)

        // Initialize radio button group for built-in bridge transport types
        val radioObfs4 = bindBridgeTransportRadio(TorBridgeTransportConfig.BUILTIN_OBFS4)
        val radioMeekAzure = bindBridgeTransportRadio(TorBridgeTransportConfig.BUILTIN_MEEK_AZURE)
        val radioSnowflake = bindBridgeTransportRadio(TorBridgeTransportConfig.BUILTIN_SNOWFLAKE)

        builtinBridgeRadioGroups.addAll(mutableListOf(radioObfs4, radioMeekAzure, radioSnowflake))

        // `*` is Kotlin's "spread" operator, for expanding an Array as a vararg.
        addToRadioGroup(*builtinBridgeRadioGroups.toTypedArray())
    }

    override fun onResume() {
        super.onResume()

        showToolbar(getString(R.string.preferences_tor_network_settings_bridge_config))

        val bridgesEnabled = requireContext().components.torController.bridgesEnabled

        val prefBridgeConfig =
            requirePreference<SwitchPreference>(R.string.pref_key_tor_network_settings_bridge_config_toggle)
        prefBridgeConfig.apply {
            isChecked = bridgesEnabled
            setOnPreferenceChangeListener<Boolean> { preference, enabled ->
                preference.context.components.torController.bridgesEnabled = enabled
                updateCurrentConfiguredBridgePref(preference)
                preference.context.components.torController.restartTor()
                true
            }
        }

        val userProvidedBridges = requirePreference<EditTextPreference>(
            R.string.pref_key_tor_network_settings_bridge_config_user_provided_bridge
        )
        userProvidedBridges.apply {
            setOnPreferenceChangeListener<String> { preference, userProvidedBridge ->
                builtinBridgeRadioGroups.uncheckAll()

                preference.context.components.torController.bridgeTransport = TorBridgeTransportConfig.USER_PROVIDED
                preference.context.components.torController.userProvidedBridges = userProvidedBridge
                updateCurrentConfiguredBridgePref(preference)
                preference.context.components.torController.restartTor()
                true
            }
            val userProvidedBridge: String? = context.components.torController.userProvidedBridges
            if (userProvidedBridge != null) {
                setText(userProvidedBridge)
            }
        }

        val currentBridgeType = prefBridgeConfig.context.components.torController.bridgeTransport
        // Cache the current configured transport type
        previousTransportConfig = currentBridgeType
        builtinBridgeRadioGroups.uncheckAll()
        if (currentBridgeType != TorBridgeTransportConfig.USER_PROVIDED) {
            val bridgeRadioButton = requirePreference<RadioButtonPreference>(currentBridgeType.preferenceKey)
            bridgeRadioButton.setCheckedWithoutClickListener(true)
        }

        updateCurrentConfiguredBridgePref(prefBridgeConfig)
    }

    private fun bindBridgeTransportRadio(
        bridge: TorBridgeTransportConfig
    ): RadioButtonPreference {
        val radio = requirePreference<RadioButtonPreference>(bridge.preferenceKey)

        radio.apply {
            setOnPreferenceChangeListener<Boolean> { preference, isChecked ->
                if (isChecked && (previousTransportConfig!! != bridge)) {
                    preference.context.components.torController.bridgeTransport = bridge
                    previousTransportConfig = bridge
                    updateCurrentConfiguredBridgePref(preference)
                    preference.context.components.torController.restartTor()
                }
                true
            }
        }

        return radio
    }

    private fun setCurrentBridgeLabel(currentBridgePref: Preference?, bridge: String) {
        currentBridgePref?.apply {
            title = getString(
                R
                .string
                .preferences_tor_network_settings_bridge_config_current_bridge,
                bridge
            )
        }
    }

    private fun updateCurrentConfiguredBridgePref(preference: Preference) {
        val currentBridge: Preference? =
            findPreference(
                getString(
                    R.string.pref_key_tor_network_settings_bridge_config_current_bridge
                )
            )

        val enabled = requireContext().components.torController.bridgesEnabled

        if (enabled) {
            val configuredBridge = preference.context.components.torController.bridgeTransport
            var bridges = when (configuredBridge) {
                TorBridgeTransportConfig.USER_PROVIDED ->
                    preference.context.components.torController.userProvidedBridges
                else -> configuredBridge.transportName
            }

            if (bridges == null) {
                bridges = "not known"
            }
            setCurrentBridgeLabel(currentBridge, bridges)
        } else {
            setCurrentBridgeLabel(
                currentBridge,
                getString(R.string.tor_network_settings_bridge_not_configured)
            )
        }
    }
}
