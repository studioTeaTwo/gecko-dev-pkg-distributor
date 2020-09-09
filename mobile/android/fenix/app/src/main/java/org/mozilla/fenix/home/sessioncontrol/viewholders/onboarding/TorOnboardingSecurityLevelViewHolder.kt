/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sessioncontrol.viewholders.onboarding

import android.view.View
import androidx.recyclerview.widget.RecyclerView
import org.mozilla.fenix.R
import org.mozilla.fenix.databinding.TorOnboardingSecurityLevelBinding
import org.mozilla.fenix.home.sessioncontrol.SessionControlInteractor
import org.mozilla.fenix.onboarding.OnboardingRadioButton
import org.mozilla.fenix.utils.view.addToRadioGroup

class TorOnboardingSecurityLevelViewHolder(
    view: View,
    private val interactor: SessionControlInteractor
) : RecyclerView.ViewHolder(view) {

    private var standardSecurityLevel: OnboardingRadioButton
    private var saferSecurityLevel: OnboardingRadioButton
    private var safestSecurityLevel: OnboardingRadioButton

    init {
        val binding = TorOnboardingSecurityLevelBinding.bind(view)
        binding.headerText.setOnboardingIcon(R.drawable.ic_onboarding_tracking_protection)

        standardSecurityLevel = binding.securityLevelStandardOption
        saferSecurityLevel = binding.securityLevelSaferOption
        safestSecurityLevel = binding.securityLevelSafestOption

        binding.descriptionText.text = view.context.getString(
            R.string.tor_onboarding_security_level_description
        )

        setupRadioGroup()
    }

    private fun setupRadioGroup() {

        addToRadioGroup(standardSecurityLevel, saferSecurityLevel, safestSecurityLevel)

        standardSecurityLevel.isChecked = true
        safestSecurityLevel.isChecked = false
        saferSecurityLevel.isChecked = false

        standardSecurityLevel.onClickListener {
            updateSecurityLevel()
        }

        saferSecurityLevel.onClickListener {
            updateSecurityLevel()
        }

        safestSecurityLevel.onClickListener {
            updateSecurityLevel()
        }
    }

    private fun updateSecurityLevel() {
    }

    companion object {
        const val LAYOUT_ID = R.layout.tor_onboarding_security_level
    }
}
