/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.ext.components

class TorConnectionAssistViewModel(
    application: Application,
) : AndroidViewModel(application) {

    private val TAG = "torConnectionAssistVM"
    private val torIntegrationAndroid =
        application.components.core.geckoRuntime.torIntegrationController
    private val _torController: TorControllerGV = application.components.torController

    private val _torConnectScreen = MutableStateFlow(ConnectAssistUiState.Splash)
    internal val torConnectScreen: StateFlow<ConnectAssistUiState> = _torConnectScreen

    val shouldOpenHome: MutableLiveData<Boolean> by lazy {
        MutableLiveData(false)
    }

    fun handleConnect() {
        if (_torConnectScreen.value.torBootstrapButton1ShouldShowTryingABridge) {
            tryABridge()
        } else {
            if (_torController.lastKnownStatus.value.isOff()) {
                torIntegrationAndroid.beginBootstrap()
            }
        }
    }

    fun cancelTorBootstrap() {
        torIntegrationAndroid.cancelBootstrap()
        _torController.setTorStopped()
    }

    suspend fun collectLastKnownStatus() {
        _torController.lastKnownStatus.collect {
            when (it) {
                TorConnectState.Initial -> _torConnectScreen.value = ConnectAssistUiState.Splash
                TorConnectState.Configuring -> handleConfiguring()
                TorConnectState.AutoBootstrapping -> handleBootstrap()
                TorConnectState.Bootstrapping -> handleBootstrap()
                TorConnectState.Bootstrapped -> shouldOpenHome.value = true
                TorConnectState.Disabled -> shouldOpenHome.value = true
                TorConnectState.Error -> handleError()
            }
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
                ConnectAssistUiState.Connecting
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
        torIntegrationAndroid.beginBootstrap()
    }

    private fun locationFound(): Boolean {
        // TODO try to find location
        return true
    }

    fun handleBackButtonPressed(homeActivity: HomeActivity) {
        when (torConnectScreen.value) {
            ConnectAssistUiState.Splash -> homeActivity.shutDown()
            ConnectAssistUiState.Configuring -> homeActivity.shutDown()
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
    }
}
