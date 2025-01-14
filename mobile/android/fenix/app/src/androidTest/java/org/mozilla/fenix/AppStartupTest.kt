package org.mozilla.fenix

import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit


@RunWith(AndroidJUnit4::class)
class LaunchTest {

    @get:Rule
    var rule: ActivityScenarioRule<HomeActivity> = ActivityScenarioRule(HomeActivity::class.java)

    @Test
    fun appLaunchesWithoutCrash() {
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        device.waitForIdle()

        // Simulate a 30-second delay
        val latch = CountDownLatch(1)
        Thread {
            try {
                Thread.sleep(30_000)
                latch.countDown()
            } catch (e: InterruptedException) {
                e.printStackTrace()
            }
        }.start()

        latch.await(30, TimeUnit.SECONDS)

        // If we got here, the app did not crash. Test passed.
    }
}
