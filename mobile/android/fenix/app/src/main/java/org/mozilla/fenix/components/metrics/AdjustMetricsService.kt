/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.util.Log
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.lib.crash.CrashReporter
import org.mozilla.fenix.BuildConfig
import org.mozilla.fenix.Config
import org.mozilla.fenix.GleanMetrics.FirstSession
import org.mozilla.fenix.ext.settings

class AdjustMetricsService(
    private val application: Application,
    private val storage: MetricsStorage,
    private val crashReporter: CrashReporter,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) : MetricsService {
    override val type = MetricServiceType.Marketing

    override fun start() {
        /* noop */
    }

    override fun stop() {
        /* noop */
    }

    @Suppress("TooGenericExceptionCaught")
    override fun track(event: Event) {
        /* noop */
    }

    override fun shouldTrack(event: Event): Boolean =
        event is Event.GrowthData

    companion object {
        private const val LOGTAG = "AdjustMetricsService"
    }

    private class AdjustLifecycleCallbacks : Application.ActivityLifecycleCallbacks {
        override fun onActivityResumed(activity: Activity) {
            /* noop */
        }

        override fun onActivityPaused(activity: Activity) {
            /* noop */
        }

        override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) { /* noop */ }

        override fun onActivityStarted(activity: Activity) { /* noop */ }

        override fun onActivityStopped(activity: Activity) { /* noop */ }

        override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) { /* noop */ }

        override fun onActivityDestroyed(activity: Activity) { /* noop */ }
    }
}
