/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.os.Bundle
import androidx.preference.PreferenceFragmentCompat
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.tor.SecurityLevel
import org.mozilla.fenix.tor.SecurityLevelUtil
import org.mozilla.fenix.utils.view.GroupableRadioButton
import org.mozilla.fenix.utils.view.addToRadioGroup
import org.mozilla.fenix.utils.view.uncheckAll

/**
 * Lets the user choose their security level
 */
@Suppress("SpreadOperator")
class TorSecurityLevelFragment : PreferenceFragmentCompat() {
    private val securityLevelRadioGroups = mutableListOf<GroupableRadioButton>()
    private var previousSecurityLevel: SecurityLevel? = null

    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        setPreferencesFromResource(R.xml.tor_security_level_preferences, rootKey)

        val currentLevel: SecurityLevel? = context?.components?.let {
            try {
                SecurityLevelUtil.getSecurityLevelFromInt(
                    it.core.engine.settings.torSecurityLevel
                )
            } catch (e: IllegalStateException) {
                // The default state is 0. If we get an invalid state then
                // default to Standard (4).
                SecurityLevel.STANDARD
            }
        }

        if (currentLevel == null) {
            throw IllegalStateException("context or Components is null.")
        }

        val radioSafer = bindSecurityLevelRadio(SecurityLevel.SAFER)
        val radioSafest = bindSecurityLevelRadio(SecurityLevel.SAFEST)
        val radioStandard = bindSecurityLevelRadio(SecurityLevel.STANDARD)

        securityLevelRadioGroups.addAll(mutableListOf(radioSafer, radioSafest, radioStandard))
        // `*` is Kotlin's "spread" operator, for expanding an Array as a vararg.
        addToRadioGroup(*securityLevelRadioGroups.toTypedArray())

        securityLevelRadioGroups.uncheckAll()
        val securityLevelRadioButton = requirePreference<RadioButtonPreference>(currentLevel.preferenceKey)
        // Cache this for later comparison in the OnPreferenceChangeListener
        previousSecurityLevel = currentLevel
        securityLevelRadioButton.setCheckedWithoutClickListener(true)
    }

    private fun bindSecurityLevelRadio(
        level: SecurityLevel
    ): RadioButtonPreference {
        val radio = requirePreference<RadioButtonPreference>(level.preferenceKey)

        radio.summary = getString(level.contentDescriptionRes)

        radio.apply {
            setOnPreferenceChangeListener<Boolean> { preference, isChecked ->
                if (isChecked && (previousSecurityLevel!! != level)) {
                    preference.context.components.core.engine.settings.torSecurityLevel =
                        level.intRepresentation
                    previousSecurityLevel = level
                }
                true
            }
        }

        return radio
    }
}
