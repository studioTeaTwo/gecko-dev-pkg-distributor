/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sessioncontrol.viewholders.onboarding

import android.view.View
import androidx.recyclerview.widget.RecyclerView
import org.mozilla.fenix.R
import org.mozilla.fenix.databinding.TorOnboardingSecurityLevelBinding
import org.mozilla.fenix.home.sessioncontrol.SessionControlInteractor
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.onboarding.OnboardingRadioButton
import org.mozilla.fenix.tor.SecurityLevel
import org.mozilla.fenix.tor.SecurityLevelUtil
import org.mozilla.fenix.utils.view.addToRadioGroup

class TorOnboardingSecurityLevelViewHolder(
    view: View,
    private val interactor: SessionControlInteractor
) : RecyclerView.ViewHolder(view) {

    private var _binding: TorOnboardingSecurityLevelBinding? = null
    private val binding get() = _binding!!

    private var standardSecurityLevel: OnboardingRadioButton
    private var saferSecurityLevel: OnboardingRadioButton
    private var safestSecurityLevel: OnboardingRadioButton

    init {
        _binding = TorOnboardingSecurityLevelBinding.bind(view)
        binding.headerText.setOnboardingIcon(R.drawable.ic_onboarding_tracking_protection)

        standardSecurityLevel = binding.securityLevelStandardOption
        saferSecurityLevel = binding.securityLevelSaferOption
        safestSecurityLevel = binding.securityLevelSafestOption

        binding.descriptionText.text = view.context.getString(
            R.string.tor_onboarding_security_level_description
        )

        setupRadioGroup(view)

    }

    private fun setupRadioGroup(view: View) {

        addToRadioGroup(standardSecurityLevel, saferSecurityLevel, safestSecurityLevel)

        val securityLevel = try {
            SecurityLevelUtil.getSecurityLevelFromInt(
                view.context.components.core.engine.settings.torSecurityLevel
            )
        } catch (e: IllegalStateException) {
            SecurityLevel.STANDARD
        }

        standardSecurityLevel.isChecked = securityLevel == SecurityLevel.STANDARD
        safestSecurityLevel.isChecked = securityLevel == SecurityLevel.SAFEST
        saferSecurityLevel.isChecked = securityLevel == SecurityLevel.SAFER

        standardSecurityLevel.onClickListener {
            updateSecurityLevel(SecurityLevel.STANDARD, view)
        }

        saferSecurityLevel.onClickListener {
            updateSecurityLevel(SecurityLevel.SAFER, view)
        }

        safestSecurityLevel.onClickListener {
            updateSecurityLevel(SecurityLevel.SAFEST, view)
        }

        updateSecurityLevel(securityLevel, view)
    }

    private fun updateSecurityLevel(newLevel: SecurityLevel, view: View) {
        val resources = view.context.resources
        val securityLevel = when (newLevel) {
            SecurityLevel.STANDARD -> resources.getString(R.string.tor_security_level_standard_option)
            SecurityLevel.SAFER -> resources.getString(R.string.tor_security_level_safer_option)
            SecurityLevel.SAFEST -> resources.getString(R.string.tor_security_level_safest_option)
        }
        binding.currentLevel.text = resources.getString(
            R.string.tor_onboarding_chosen_security_level_label, securityLevel
        )
        view.context.components.let {
            it.core.engine.settings.torSecurityLevel = newLevel.intRepresentation
        }
    }

    companion object {
        const val LAYOUT_ID = R.layout.tor_onboarding_security_level
    }
}
