/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor

import androidx.lifecycle.LifecycleCoroutineScope

interface TorEvents {
    fun onTorConnecting()
    fun onTorConnected()
    fun onTorStatusUpdate(entry: String?, status: String?, progress: Double? = 0.0)
    fun onTorStopped()
}
class TorError(
    var message: String,
    var details: String,
    var phase: String,
    var reason: String,
) { }

interface TorLogs {
    fun onLog(type: String?, message: String?)
}

internal enum class TorStatus(val status: String) {
    OFF("OFF"),
    STARTING("STARTING"),
    ON("ON"),
    STOPPING("STOPPING"),
    UNKNOWN("UNKNOWN");
}

interface TorController: TorEvents {
    val logEntries: MutableList<Pair<String?, String?>>
    val isStarting: Boolean
    val isRestarting: Boolean
    val isBootstrapped: Boolean
    val isConnected: Boolean
    var bridgesEnabled: Boolean
    var bridgeTransport: TorBridgeTransportConfig
    var userProvidedBridges: String?

    fun start()
    fun stop()

    override fun onTorConnecting()
    override fun onTorConnected()
    override fun onTorStatusUpdate(entry: String?, status: String?, progress: Double?)
    override fun onTorStopped()

    fun getLastErrorState() : TorError?

    fun registerTorListener(l: TorEvents)
    fun unregisterTorListener(l: TorEvents)

    fun registerTorLogListener(l: TorLogs)
    fun unregisterTorLogListener(l: TorLogs)

    fun initiateTorBootstrap(lifecycleScope: LifecycleCoroutineScope? = null, withDebugLogging: Boolean = false)
    fun stopTor()
    fun setTorStopped()
    fun restartTor()
}
