/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor.bootstrap

import android.content.Context
import android.content.SharedPreferences
import android.os.StrictMode
import androidx.annotation.VisibleForTesting
import mozilla.components.support.ktx.android.content.PreferencesHolder
import mozilla.components.support.ktx.android.content.booleanPreference
import org.mozilla.fenix.ext.components

class TorQuickStart(val context: Context) : PreferencesHolder {

    override val preferences: SharedPreferences =
        context.components.strictMode.resetAfter(StrictMode.allowThreadDiskReads()) {
            context.getSharedPreferences(
                PREF_NAME_TOR_BOOTSTRAP_KEY,
                Context.MODE_PRIVATE
            )
        }

    private var torQuickStart by booleanPreference(TOR_QUICK_START, default = false)

    fun quickStartTor() =
        context.components.strictMode.resetAfter(StrictMode.allowThreadDiskReads()) { torQuickStart }

    fun enableQuickStartTor() {
        torQuickStart = true
    }
    fun disableQuickStartTor() {
        torQuickStart = false
    }
    fun setQuickStartTor(enabled: Boolean) = if (enabled) {
        enableQuickStartTor()
    } else {
        disableQuickStartTor()
    }

    companion object {
        /**
         * Name of the shared preferences file.
         */
        private const val PREF_NAME_TOR_BOOTSTRAP_KEY = "tor.bootstrap"

        /**
         * Key for [quickStartTor].
         */
        @VisibleForTesting
        internal const val TOR_QUICK_START = "tor.bootstrap.quick_start_enabled"
    }
}
