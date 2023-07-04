/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor

import android.os.Parcelable
import androidx.annotation.StringRes
import kotlinx.parcelize.Parcelize
import org.mozilla.fenix.R


const val SECURITY_LEVEL_STANDARD = 4
const val SECURITY_LEVEL_SAFER = 2
const val SECURITY_LEVEL_SAFEST = 1

@Parcelize
enum class SecurityLevel(
    @StringRes val preferenceKey: Int,
    @StringRes val contentDescriptionRes: Int,
    val intRepresentation: Int
) : Parcelable {

    STANDARD(
        preferenceKey = R.string.pref_key_tor_security_level_standard_option,
        contentDescriptionRes = R.string.tor_security_level_standard_description,
        intRepresentation = SECURITY_LEVEL_STANDARD
    ),
    SAFER(
        preferenceKey = R.string.pref_key_tor_security_level_safer_option,
        contentDescriptionRes = R.string.tor_security_level_safer_description,
        intRepresentation = SECURITY_LEVEL_SAFER
    ),
    SAFEST(
        preferenceKey = R.string.pref_key_tor_security_level_safest_option,
        contentDescriptionRes = R.string.tor_security_level_safest_description,
        intRepresentation = SECURITY_LEVEL_SAFEST
    );



}

object SecurityLevelUtil {
    fun getSecurityLevelFromInt(level: Int): SecurityLevel {
        return when (level) {
            SECURITY_LEVEL_STANDARD -> SecurityLevel.STANDARD
            SECURITY_LEVEL_SAFER -> SecurityLevel.SAFER
            SECURITY_LEVEL_SAFEST -> SecurityLevel.SAFEST
            else -> throw IllegalStateException("Security Level $level is not valid")
        }
    }
}
