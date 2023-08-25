package org.mozilla.fenix.tor


import android.content.Context
import android.util.Log
import androidx.lifecycle.LifecycleCoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import mozilla.components.browser.engine.gecko.GeckoEngine
import org.mozilla.fenix.ext.components
import org.mozilla.geckoview.TorAndroidIntegration
import org.mozilla.geckoview.TorAndroidIntegration.BootstrapStateChangeListener
import org.mozilla.geckoview.TorAndroidIntegration.TorLogListener
import org.mozilla.geckoview.TorConnectStage
import org.mozilla.geckoview.TorSettings
import org.mozilla.geckoview.TorSettings.BridgeBuiltinType
import org.mozilla.geckoview.TorSettings.BridgeSource

// Enum matching TorConnectState from TorConnect.sys.mjs that we get from onBootstrapStateChange
internal enum class TorConnectState(val state: String) {
    Initial("Initial"),
    Configuring("Configuring"),
    AutoBootstrapping("AutoBootstrapping"),
    Bootstrapping("Bootstrapping"),
    Error("Error"),
    Bootstrapped("Bootstrapped"),
    Disabled("Disabled");

    fun isStarting() = this == Bootstrapping || this == AutoBootstrapping
    fun isError() = this == Error

    fun isStarted() = this == Bootstrapped

    fun isOff() = this == Initial || this == Configuring || this == Disabled || this == Error


    // Convert to TorStatus that firefox-android uses based on tor-android-service
    fun toTorStatus(): TorStatus {
        return when (this) {
            Initial -> TorStatus.OFF
            Configuring -> TorStatus.OFF
            AutoBootstrapping -> TorStatus.STARTING
            Bootstrapping -> TorStatus.STARTING
            Error -> TorStatus.UNKNOWN
            Bootstrapped -> TorStatus.ON
            Disabled -> TorStatus.OFF
        }
    }
}

class TorControllerGV(
    private val context: Context,
) : TorController, TorEvents, BootstrapStateChangeListener, TorLogListener {

    private val TAG = "TorControllerGV"

    private var torListeners = mutableListOf<TorEvents>()
    private var torLogListeners = mutableListOf<TorLogs>()

    private val _lastKnownStatus = MutableStateFlow(TorConnectState.Initial)
    internal val lastKnownStatus: StateFlow<TorConnectState> = _lastKnownStatus

    internal var lastKnownError: TorError? = null
    private var wasTorBootstrapped = false
    private var isTorRestarting = false

    private var isTorBootstrapped = false
        get() = ((_lastKnownStatus.value.isStarted()) && wasTorBootstrapped)

    private val entries = mutableListOf<TorLog>()
    override val logEntries get() = entries
    override val isStarting get() = _lastKnownStatus.value.isStarting()
    override val isRestarting get() = isTorRestarting
    override val isBootstrapped get() = isTorBootstrapped
    override val isConnected get() = (_lastKnownStatus.value.isStarted() && !isTorRestarting)

    private fun getTorIntegration(): TorAndroidIntegration {
        return (context.components.core.engine as GeckoEngine).getTorIntegrationController()
    }

    private fun getTorSettings(): TorSettings? {
        return getTorIntegration().getSettings()
    }


    // On a fresh install bridgeEnagled can be set to true without a valid bridgeSource
    // having been selected. After first use this will not happen because last selected bridge
    // will be remembered and reused.
    // However, on first use, submitting this to TorSettings is an invalid state.
    // TorSettings.sys.mjs's #cleanupSettings will remove a lone bridgeEnabled with no source
    // selected. Therefore we check and don't call setSettings if bridgeSource isn't selected
    // (when trying to enable). Disabeling is always valid.
    private var _bridgesEnabled: Boolean? = null
    override var bridgesEnabled: Boolean
        get() {
            return _bridgesEnabled ?: getTorSettings()?.bridgesEnabled ?: false
        }
        set(value) {
            _bridgesEnabled = value
            getTorSettings()?.let {
                if (!value || it.bridgesSource != BridgeSource.Invalid) {
                    it.bridgesEnabled = value
                    getTorIntegration().setSettings(it)
                }
            }
        }


    override var bridgeTransport: TorBridgeTransportConfig
        get() {
            return when (getTorSettings()?.bridgesSource) {
                BridgeSource.BuiltIn -> {
                    when (getTorSettings()?.bridgesBuiltinType) {
                        BridgeBuiltinType.Obfs4 -> TorBridgeTransportConfig.BUILTIN_OBFS4
                        BridgeBuiltinType.MeekAzure -> TorBridgeTransportConfig.BUILTIN_MEEK_AZURE
                        BridgeBuiltinType.Snowflake -> TorBridgeTransportConfig.BUILTIN_SNOWFLAKE
                        else -> TorBridgeTransportConfig.USER_PROVIDED
                    }

                }

                BridgeSource.UserProvided -> TorBridgeTransportConfig.USER_PROVIDED
                else -> TorBridgeTransportConfig.USER_PROVIDED
            }
        }
        set(value) {
            getTorSettings()?.let {
                it.bridgesEnabled = true
                if (value == TorBridgeTransportConfig.USER_PROVIDED) {
                    // NOOP: all settings will be set in call to set userProvidedBridges and submited
                    // at the same time to clear TorSettings.sys.mjs #cleanupSettings
                    return
                } else {
                    it.bridgesSource = BridgeSource.BuiltIn
                    val bbt: BridgeBuiltinType = when (value) {
                        TorBridgeTransportConfig.BUILTIN_OBFS4 -> BridgeBuiltinType.Obfs4
                        TorBridgeTransportConfig.BUILTIN_MEEK_AZURE -> BridgeBuiltinType.MeekAzure
                        TorBridgeTransportConfig.BUILTIN_SNOWFLAKE -> BridgeBuiltinType.Snowflake
                        else -> BridgeBuiltinType.Invalid
                    }
                    it.bridgesBuiltinType = bbt
                }
                getTorIntegration().setSettings(it)
            }
        }


    // Currently the UI takes a user provided string and sets this in one step so there is where we
    // actually set it.bridgesSource = BridgeSource.UserProvided, not above,
    // as TorSettings.sys.mjs #cleanupSettings could reject BridgeSource.UserProvided
    // with no bridge strings
    override var userProvidedBridges: String?
        get() {
            return getTorSettings()?.let {
                if (it.bridgesSource == BridgeSource.UserProvided) {
                    return getTorSettings()?.bridgeBridgeStrings?.joinToString("\n")
                }
                return ""
            }
        }
        set(value) {
            getTorSettings()?.let {
                Log.i(TAG, "setUserProvidedBridges: '$value'")
                // Hack: we don't have validation so lets do something quick and dirty (each line has a length)
                val  userProvidedLines: Array<String> = value?.split("\n")?.filter { it.length > 4 }?.toTypedArray() ?: arrayOf<String>()
                it.bridgesSource = BridgeSource.UserProvided
                it.bridgeBridgeStrings = userProvidedLines
                getTorIntegration().setSettings(it)
            }
        }

    override fun start() {
        getTorIntegration().registerBootstrapStateChangeListener(this)
        getTorIntegration().registerLogListener(this)
    }

    override fun stop() {
        getTorIntegration().unregisterBootstrapStateChangeListener(this)
        getTorIntegration().unregisterLogListener(this)
    }

    // TorEvents
    override fun onTorConnecting() {
        synchronized(torListeners) {
            torListeners.toList().forEach { it.onTorConnecting() }
        }
    }

    // TorEvents
    override fun onTorConnected() {
        synchronized(torListeners) {
            torListeners.toList().forEach { it.onTorConnected() }
        }
    }

    // TorEvents
    override fun onTorStatusUpdate(entry: String?, status: String?, progress: Double?) {
        synchronized(torListeners) {
            torListeners.toList().forEach { it.onTorStatusUpdate(entry, status, progress) }
        }
    }

    // TorEvents
    override fun onTorStopped() {
        synchronized(torListeners) {
            torListeners.toList().forEach { it.onTorStopped() }
        }
    }

    override fun onLog(type: String?, message: String?, timestamp: String?) {
        synchronized(torLogListeners) {
            entries.add(TorLog(type ?: "null", message ?: "null", timestamp ?: "null"))
            torLogListeners.toList().forEach { it.onLog(type ?: "null", message ?: "null", timestamp) }
        }
    }

    override fun registerTorListener(l: TorEvents) {
        synchronized(torListeners) {
            if (torListeners.contains(l)) {
                return
            }
            torListeners.add(l)
        }
    }

    override fun unregisterTorListener(l: TorEvents) {
        synchronized(torListeners) {
            if (!torListeners.contains(l)) {
                return
            }
            torListeners.remove(l)
        }
    }

    override fun registerTorLogListener(l: TorLogs) {
        synchronized(torLogListeners) {
            if (torLogListeners.contains(l)) {
                return
            }
            torLogListeners.add(l)
        }
    }
    override fun unregisterTorLogListener(l: TorLogs) {
        synchronized(torLogListeners) {
            if (!torLogListeners.contains(l)) {
                return
            }
            torLogListeners.remove(l)
        }
    }

    override fun initiateTorBootstrap(
        lifecycleScope: LifecycleCoroutineScope?,
        withDebugLogging: Boolean,
    ) {
        getTorIntegration().beginBootstrap()
    }

    override fun stopTor() {
        getTorIntegration().cancelBootstrap()
    }

    override fun setTorStopped() {
        _lastKnownStatus.value = TorConnectState.Configuring
        onTorStatusUpdate(null, lastKnownStatus.toString(), 0.0)
        onTorStopped()
    }

    override fun restartTor() {
        if (!_lastKnownStatus.value.isStarted() && wasTorBootstrapped) {
            // If we aren't started, but we were previously bootstrapped,
            // then we handle a "restart" request as a "start" restart
            initiateTorBootstrap()
        } else {
            // |isTorRestarting| tracks the state of restart. When we receive an |OFF| state
            // from TorService in persistentBroadcastReceiver::onReceive we restart the Tor
            // service.
            isTorRestarting = true
            stopTor()
        }
    }

    override fun getLastErrorState() : TorError? {
        return lastKnownError
    }

    // TorEventsBootstrapStateChangeListener -> (lastKnowStatus, TorEvents)
    // Handle events from GeckoView TorAndroidIntegration and map to TorEvents based events
    // and state for firefox-android (designed for tor-android-service)
    //   fun onTorConnecting()
    //   fun onTorConnected()
    //   fun onTorStatusUpdate(entry: String?, status: String?, progress: Double?)
    //   fun onTorStopped()

    // TorEventsBootstrapStateChangeListener
    override fun onBootstrapStateChange(newStateVal: String?) {
        Log.d(TAG, "onBootstrapStateChange(newStateVal = $newStateVal)")
        val newState: TorConnectState = TorConnectState.valueOf(newStateVal ?: "Error")

        if (newState.isError() && wasTorBootstrapped) {
            stopTor()
        }

        if (newState.isStarted()) {
            wasTorBootstrapped = true
            onTorConnected()
        }

        if (wasTorBootstrapped && newState == TorConnectState.Configuring) {
            wasTorBootstrapped = false
            if (isTorRestarting) {
                initiateTorBootstrap()
            } else {
                setTorStopped()
            }
        }

        if (_lastKnownStatus.value.isOff() && newState.isStarting()) {
            isTorRestarting = false
        }

        _lastKnownStatus.value = newState
        onTorStatusUpdate(null, newStateVal, null)
    }

    override fun onBootstrapStageChange(stage: TorConnectStage) = Unit

    // TorEventsBootstrapStateChangeListener
    override fun onBootstrapProgress(progress: Double, hasWarnings: Boolean) {
        Log.d(TAG, "onBootstrapProgress(progress = $progress, hasWarnings = $hasWarnings)")
        onTorStatusUpdate("", _lastKnownStatus.value.toTorStatus().status, progress)
    }

    // TorEventsBootstrapStateChangeListener
    override fun onBootstrapComplete() = Unit

    // TorEventsBootstrapStateChangeListener
    override fun onBootstrapError(code: String?, message: String?, phase: String?, reason: String?) {
        lastKnownError = TorError(code ?: "", message ?: "", phase ?: "", reason ?: "")
    }
}
