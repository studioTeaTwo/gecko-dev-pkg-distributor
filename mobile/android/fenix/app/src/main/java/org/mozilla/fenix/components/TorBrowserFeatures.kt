/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Copyright (c) 2020, The Tor Project, Inc.

package org.mozilla.fenix.components

import android.os.StrictMode
import android.content.Context
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.IOException
import mozilla.components.concept.engine.webextension.WebExtension
import mozilla.components.concept.engine.webextension.WebExtensionRuntime
import mozilla.components.support.webextensions.WebExtensionSupport
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.tor.TorEvents

object TorBrowserFeatures {
    private val logger = Logger("torbrowser-features")
    private const val NOSCRIPT_ID = "{73a6fe31-595d-460b-a920-fcc0f8843232}"

    private fun installNoScript(
        context: Context,
        runtime: WebExtensionRuntime,
        onSuccess: ((WebExtension) -> Unit),
        onError: ((Throwable) -> Unit)
    ) {
        /**
         * Copy the xpi from assets to cacheDir, we do not care if the file is later deleted.
         */
        val xpiName = "$NOSCRIPT_ID.xpi"
        val addonPath = context.cacheDir.resolve(xpiName)
        val policy = StrictMode.getThreadPolicy()
        try {
            context.assets.open("extensions/$xpiName")
                .use { inStream ->
                    // we don't want penaltyDeath() on disk write
                    StrictMode.setThreadPolicy(StrictMode.ThreadPolicy.LAX)

                    addonPath.outputStream().use { outStream ->
                        inStream.copyTo(outStream)
                    }
                }
        } catch (throwable: IOException) {
            onError(throwable)
            return
        } finally {
            StrictMode.setThreadPolicy(policy)
        }

        /**
         * Install with a file:// URI pointing to the temp location where the addon was copied to.
         */
        runtime.installWebExtension(
            url = addonPath.toURI().toString(),
            onSuccess = { extension ->
                runtime.setAllowedInPrivateBrowsing(
                    extension,
                    true,
                    onSuccess,
                    onError
                )
            },
            onError = { throwable -> onError(throwable) })
    }

    @OptIn(DelicateCoroutinesApi::class) // GlobalScope usage
    private fun uninstallHTTPSEverywhere(
        runtime: WebExtensionRuntime,
        onSuccess: (() -> Unit),
        onError: ((Throwable) -> Unit)
    ) {
        // Wait for WebExtensionSupport on the I/O thread to avoid deadlocks.
        GlobalScope.launch(Dispatchers.IO) {
            WebExtensionSupport.awaitInitialization()
            // Back to the main thread.
            withContext(Dispatchers.Main) {
                val extension =
                    WebExtensionSupport.installedExtensions["https-everywhere-eff@eff.org"]
                        ?: return@withContext onSuccess() // Fine, nothing to uninstall.
                runtime.uninstallWebExtension(
                    extension,
                    onSuccess = onSuccess,
                    onError = { _, throwable -> onError(throwable) }
                )
            }
        }
    }

    fun install(context: Context, runtime: WebExtensionRuntime) {
        val settings = context.settings()
        /**
         * Remove HTTPS Everywhere if we didn't yet.
         */
        if (!settings.httpsEverywhereRemoved) {
            /**
             * Ensure HTTPS-Only is enabled.
             */
            settings.shouldUseHttpsOnly = true
            settings.shouldUseHttpsOnlyInAllTabs = true
            uninstallHTTPSEverywhere(
                runtime,
                onSuccess = {
                    settings.httpsEverywhereRemoved = true
                    logger.debug("HTTPS Everywhere extension was uninstalled successfully")
                },
                onError = { throwable ->
                    logger.error("Could not uninstall HTTPS Everywhere extension", throwable)
                }
            )
        }
        /**
         *  Install NoScript as a user WebExtension if we have not already done so.
         *  AMO signature is checked, but automatic updates still need to be enabled.
         */
        if (!settings.noscriptInstalled) {
            installNoScript(
                context,
                runtime,
                onSuccess = {
                    settings.noscriptInstalled = true
                    logger.debug("NoScript extension was installed successfully")
                },
                onError = { throwable ->
                    logger.error("Could not install NoScript extension", throwable)
                }
            )
        }

        /**
         *  Enable automatic updates for NoScript and, if we've not done it yet, force a
         *  one-time immediate update check, in order to upgrade old profiles and ensure we've got
         *  the latest stable AMO version available on first startup.
         *  We will do it as soon as the Tor is connected, to prevent early addonUpdater activation
         *  causing automatic update checks failures (components.addonUpdater being a lazy prop).
         *  The extension, from then on, should behave as if the user had installed it manually.
         */
        context.components.torController.registerTorListener(object : TorEvents {
            override fun onTorConnected() {
                context.components.torController.unregisterTorListener(this)
                // Enable automatic updates. This must be done on every startup (tor-browser#42353)
                context.components.addonUpdater.registerForFutureUpdates(NOSCRIPT_ID)
                // Force a one-time immediate update check for older installations
                if (settings.noscriptUpdated < 2) {
                    context.components.addonUpdater.update(NOSCRIPT_ID)
                    settings.noscriptUpdated = 2
                }
            }

            @SuppressWarnings("EmptyFunctionBlock")
            override fun onTorConnecting() {
            }

            @SuppressWarnings("EmptyFunctionBlock")
            override fun onTorStopped() {
            }

                @SuppressWarnings("EmptyFunctionBlock")
                override fun onTorStatusUpdate(entry: String?, status: String?) {
                }
            })
        }
    }


}
