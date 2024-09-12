/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home

import android.annotation.SuppressLint
import androidx.annotation.IntRange
import androidx.lifecycle.ViewModel
import org.mozilla.fenix.BuildConfig
import java.text.SimpleDateFormat
import java.util.Date

class HomeScreenViewModel : ViewModel() {
    /**
     * Used to delete a specific session once the home screen is resumed
     */
    var sessionToDelete: String? = null

    @IntRange(0, 2)
    var yecStyleIndex: Int = 0
    var firstYecLoad: Boolean = true
    var yecDismissed: Boolean = false

    fun shouldShowDonationScreen(): Boolean {
        @SuppressLint("SimpleDateFormat")
        val dateFormat = SimpleDateFormat("yyyy-MM-dd")
        val startDate = dateFormat.parse("2024-10-14") // Change to a date in the past to test
        val endDate = dateFormat.parse("2025-1-2")
        val currentDate = Date()

        @Suppress("KotlinConstantConditions")
        return !yecDismissed
                && BuildConfig.BUILD_TYPE == "release" // Comment this line out to test
                && currentDate.after(startDate)
                && currentDate.before(endDate)
    }
}
