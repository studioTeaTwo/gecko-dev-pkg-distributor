/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LifecycleCoroutineScope
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.mozilla.fenix.ext.components

class TorConnectionAssistViewModel(
    application: Application,
) : AndroidViewModel(application), TorEvents {

    private val TAG = "torConnectionAssistVM"
    private val components = getApplication<Application>().components

    private val _torController: TorControllerGV = components.torController

    private val _torConnectScreen = MutableStateFlow(ConnectAssistUiState.Splash)
    internal val torConnectScreen: StateFlow<ConnectAssistUiState> = _torConnectScreen

    private val _quickStartToggle = MutableLiveData<Boolean>() // don't initialize with quickstart off the bat
    fun quickstartToggle(): LiveData<Boolean?> {
        _quickStartToggle.value = _torController.quickstart // quickstart isn't ready until torSettings is ready
        return _quickStartToggle
    }


    private val _shouldOpenHome = MutableLiveData(false)
    fun shouldOpenHome(): LiveData<Boolean> {
        return _shouldOpenHome
    }

    private val _progress = MutableLiveData(0)
    fun progress(): LiveData<Int> {
        return _progress
    }

    init {
        Log.d(TAG, "initiating TorConnectionAssistViewModel")
        _torController.registerTorListener(this)
        handleTorConnectStateToScreen() // should cover the case of when we have an onBootStrapStateChange() event before this is initialized, which lead to being stuck on the splash screen
    }

    private fun handleConnect(
        withDebugLogging: Boolean = false,
        lifecycleScope: LifecycleCoroutineScope? = null,
    ) {
        Log.d(TAG, "handleConnect initiatingTorBootstrap with lifecycleScope = $lifecycleScope")
        _torController.initiateTorBootstrap(
            withDebugLogging = withDebugLogging,
            lifecycleScope = lifecycleScope,
        )
    }

    fun handleQuickstartChecked(checked: Boolean) {
        _torController.quickstart = checked
        _quickStartToggle.value = checked
    }

    fun handleButton1Pressed(
        screen: ConnectAssistUiState,
        lifecycleScope: LifecycleCoroutineScope?,
    ) {
        if (screen.torBootstrapButton1ShouldShowTryingABridge) {
            tryABridge()
        } else {
            handleConnect(lifecycleScope = lifecycleScope)
        }
    }

    fun cancelTorBootstrap() {
        _torController.stopTor()
        _torController.setTorStopped()
    }

    override fun onTorConnecting() {
        Log.d(TAG, "onTorConnecting()")
    }

    override fun onTorConnected() {
        Log.d(TAG, "onTorConnected()")
        _torController.unregisterTorListener(this)
    }

    override fun onTorStatusUpdate(entry: String?, status: String?, progress: Double?) {
        Log.d(TAG, "onTorStatusUpdate($entry, $status, $progress)")
        if (progress != null) {
            _progress.value = progress.toInt()
        }

        handleTorConnectStateToScreen()
    }

    fun handleTorConnectStateToScreen() {
        when (_torController.lastKnownStatus) {
            TorConnectState.Initial -> _torConnectScreen.value = ConnectAssistUiState.Splash
            TorConnectState.Configuring -> handleConfiguring()
            TorConnectState.AutoBootstrapping -> handleBootstrap()
            TorConnectState.Bootstrapping -> handleBootstrap()
            TorConnectState.Bootstrapped -> _shouldOpenHome.value = true
            TorConnectState.Disabled -> _shouldOpenHome.value = true
            TorConnectState.Error -> handleError()
        }
    }

    private fun handleConfiguring() {
        if (_torController.lastKnownError == null) {
            _torConnectScreen.value = ConnectAssistUiState.Configuring
        } else {
            handleError()
        }
    }

    private fun handleBootstrap() {
        when (_torConnectScreen.value) {
            ConnectAssistUiState.InternetError -> {
                _torConnectScreen.value = ConnectAssistUiState.TryingAgain
            }

            ConnectAssistUiState.TryingAgain -> {
                /** stay here */
            }

            ConnectAssistUiState.ConnectionAssist -> {
                _torConnectScreen.value = ConnectAssistUiState.TryingABridge
            }

            ConnectAssistUiState.LocationError -> {
                _torConnectScreen.value = ConnectAssistUiState.TryingABridge
            }

            ConnectAssistUiState.TryingABridge -> {
                /** stay here */
            }

            ConnectAssistUiState.LocationCheck -> {
                _torConnectScreen.value = ConnectAssistUiState.LastTry
            }

            ConnectAssistUiState.LastTry -> {
                /** stay here */
            }

            else -> _torConnectScreen.value =
                ConnectAssistUiState.Connecting.also { connectAssistUiState ->
                    // covers the case of when the bootstrap is already in progress when the UiState "catches up"
                    connectAssistUiState.progress = _progress.value ?: 0
                }
        }
    }

    private fun handleError() {
        _torController.lastKnownError?.apply {
            Log.d(
                TAG,
                "TorError(message = $message, details = $details, phase = $phase, reason = $reason",
            )
            // TODO better error handling
            when (reason) {
//                "noroute" -> handleNoRoute() TODO re-add when working better
                else -> handleUnknownError()
            }
        }
    }

    private fun handleNoRoute() {
        Log.d(TAG, "handleNoRoute(), _torConnectScreen.value = ${_torConnectScreen.value}")
        when (_torConnectScreen.value) {
            ConnectAssistUiState.Connecting -> _torConnectScreen.value = ConnectAssistUiState.ConnectionAssist
            ConnectAssistUiState.ConnectionAssist -> {/** no op, likely a duplicate error */}
            ConnectAssistUiState.TryingABridge -> _torConnectScreen.value = ConnectAssistUiState.LocationCheck
            ConnectAssistUiState.LocationCheck -> {/** no op, likely a duplicate error */}
            ConnectAssistUiState.LastTry -> _torConnectScreen.value = ConnectAssistUiState.FinalError
            ConnectAssistUiState.FinalError -> {/** no op, likely a duplicate error */}
            else -> _torConnectScreen.value = ConnectAssistUiState.InternetError
        }
    }

    private fun handleUnknownError() {
        // TODO should we have a dedicated screen for unknown errors?
        _torConnectScreen.value = ConnectAssistUiState.InternetError
    }

    override fun onTorStopped() {
        Log.d(TAG, "onTorStopped()")
    }

    private fun tryABridge() {
        if (!locationFound()) {
            _torConnectScreen.value = ConnectAssistUiState.LocationError
            return
        }
        if (!_torController.bridgesEnabled) {
            _torController.bridgesEnabled = true
            _torController.bridgeTransport =
                TorBridgeTransportConfig.BUILTIN_SNOWFLAKE // TODO select based on country
        }
        handleConnect(withDebugLogging = true)
    }

    private fun locationFound(): Boolean {
        // TODO try to find location
        return true
    }

    fun handleBackButtonPressed(): Boolean {
        when (torConnectScreen.value) {
            ConnectAssistUiState.Splash -> return false
            ConnectAssistUiState.Configuring -> return false
            ConnectAssistUiState.Connecting -> cancelTorBootstrap()
            ConnectAssistUiState.InternetError -> {
                _torController.lastKnownError = null
                _torConnectScreen.value = ConnectAssistUiState.Configuring
            }

            ConnectAssistUiState.TryingAgain -> {
                cancelTorBootstrap()
            }

            ConnectAssistUiState.ConnectionAssist -> {
                _torController.lastKnownError = null
                _torConnectScreen.value = ConnectAssistUiState.Configuring
            }

            ConnectAssistUiState.TryingABridge -> {
                _torController.stopTor()
                _torConnectScreen.value = ConnectAssistUiState.ConnectionAssist
            }

            ConnectAssistUiState.LocationError -> {
                _torConnectScreen.value = ConnectAssistUiState.ConnectionAssist
            }

            ConnectAssistUiState.LocationCheck -> {
                _torConnectScreen.value = ConnectAssistUiState.LocationError
            }

            ConnectAssistUiState.LastTry -> {
                _torController.stopTor()
                _torConnectScreen.value = ConnectAssistUiState.LocationCheck
            }

            ConnectAssistUiState.FinalError -> {
                _torConnectScreen.value = ConnectAssistUiState.LocationCheck
            }
        }
        return true
    }
}
