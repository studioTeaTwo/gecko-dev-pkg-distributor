/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.children
import androidx.fragment.app.Fragment
import org.mozilla.fenix.databinding.TorNetworkSettingsBetaConnectionFeaturesBinding
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.settings

/**
 * Lets the user customize beta connection features mode.
 */
class TorBetaConnectionFeaturesFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        val binding = TorNetworkSettingsBetaConnectionFeaturesBinding.inflate(inflater)

        binding.enableBetaConnectionFeaturesSwitch.run {
            isChecked = context.settings().useNewBootstrap
            setConnectionAssistUI(binding, isChecked)

            setOnCheckedChangeListener { _, isConnectionAssistEnabled ->
                context.settings().useNewBootstrap = isConnectionAssistEnabled
                setConnectionAssistUI(binding, isConnectionAssistEnabled)
                updateEngineConnectionAssistMode()
            }
        }

        // Since the beta connection features modes are in a RadioGroup we only need one listener to know of all their changes.
        binding.useNewBootstrapWithNativeUiRadioButton.setOnCheckedChangeListener { _, _ ->
            updateEngineConnectionAssistMode()
        }

        return binding.root
    }

    private fun setConnectionAssistUI(
        binding: TorNetworkSettingsBetaConnectionFeaturesBinding,
        isBetaConnectionAssistEnabled: Boolean,
    ) {
        if (!isBetaConnectionAssistEnabled) {
            binding.enableBetaConnectionFeaturesModes.apply {
                clearCheck()
                children.forEach { it.isEnabled = false }
            }
        } else {
            binding.enableBetaConnectionFeaturesModes.children.forEach { it.isEnabled = true }
        }
    }

    private fun updateEngineConnectionAssistMode() {
        requireContext().components.core.engine.settings.useNewBootstrap =
            requireContext().settings().useNewBootstrap
    }

}
