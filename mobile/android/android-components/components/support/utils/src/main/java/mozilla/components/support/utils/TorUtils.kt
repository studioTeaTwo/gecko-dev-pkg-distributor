/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import mozilla.components.support.utils.PendingIntentUtils

object TorUtils {
    const val TORBROWSER_START_ACTIVITY_PROMPT = "torbrowser_start_activity_prompt"

    // Delegates showing prompt and possibly starting the activity to the main app activity.
    // Highly dependant on Fenix/Tor Browser for Android.
    // One downside of this implementation is that it does not throw exceptions like the
    // direct context.startActivity, so the UI will behave as if the startActivity call was
    // done successfully, which may not always be the case.
    fun startActivityPrompt(context: Context, intent: Intent) {
        val intentContainer = Intent()
        intentContainer.setPackage(context.applicationContext.packageName)
        intentContainer.putExtra(TORBROWSER_START_ACTIVITY_PROMPT, PendingIntent.getActivity(context, 0, intent, PendingIntentUtils.defaultFlags))
        intentContainer.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intentContainer)
    }
}
