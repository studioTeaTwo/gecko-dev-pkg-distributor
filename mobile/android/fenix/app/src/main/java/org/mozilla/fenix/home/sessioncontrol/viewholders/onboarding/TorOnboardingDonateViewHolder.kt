/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sessioncontrol.viewholders.onboarding

import android.view.View
import androidx.recyclerview.widget.RecyclerView
import org.mozilla.fenix.R
import org.mozilla.fenix.databinding.TorOnboardingDonateBinding
import org.mozilla.fenix.home.sessioncontrol.SessionControlInteractor

class TorOnboardingDonateViewHolder(
    view: View,
    private val interactor: SessionControlInteractor
) : RecyclerView.ViewHolder(view) {

    init {
        val binding = TorOnboardingDonateBinding.bind(view)
        binding.donateNowButton.setOnClickListener {
            interactor.onDonateClicked()
        }
    }

    companion object {
        const val LAYOUT_ID = R.layout.tor_onboarding_donate
    }
}
