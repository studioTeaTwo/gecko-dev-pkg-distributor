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
import mozilla.components.browser.state.ext.getUrl
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.gecko.util.GeckoBundle
import org.mozilla.geckoview.TorAndroidIntegration.BootstrapStateChangeListener
import org.mozilla.geckoview.TorConnectStage
import org.mozilla.geckoview.TorConnectStageName

class TorConnectionAssistViewModel(
    application: Application,
) : AndroidViewModel(application), BootstrapStateChangeListener {

    private val TAG = "torConnectionAssistVM"
    private val components = application.components
    private val torAndroidIntegration =
        components.core.geckoRuntime.torIntegrationController

    init {
        torAndroidIntegration.registerBootstrapStateChangeListener(this)
        loadDummyPage()
    }

    private fun loadDummyPage() {
        // Load local url (it just needs to begin with "about:" to get past filter) to initialize the browser,
        // Domain fronting needs Services.io.getProtocolHandler("http")... to actually work, and it
        // does not till the browser/engine is initialized, and this is so far the easiest way to do that.
        // Load early here so that it is ready when needed if we get to the step where DF is invoked
        // Then later remove it in onCleared so it doesn't show for the user
        components.useCases.tabsUseCases.addTab.invoke("about:")
    }

    private fun clearDummyPage() {
        // Remove loaded URL so it doesn't show up
        components.useCases.tabsUseCases.removeTab.invoke(components.core.store.state.tabs.find {it.getUrl() == "about:"}?.id ?: "")
    }

    fun fetchCountryNamesGet() {
        torAndroidIntegration.countryNamesGet { countryNames : GeckoBundle? ->
            if (countryNames != null) {
                val codes: Array<String> = countryNames.keys()
                val regions = mutableMapOf<String, String>()
                for (code in codes) {
                    regions[code] = countryNames.getString(code)
                }
                countryCodeNameMap.value = regions
            }
        }
    }

    override fun onCleared() {
        torAndroidIntegration.unregisterBootstrapStateChangeListener(this)
        clearDummyPage()
        super.onCleared()
    }

    private val torConnectStage: MutableStateFlow<TorConnectStage?> by lazy {
        MutableStateFlow(torAndroidIntegration.lastKnowStage.value)
    }

    private val _torConnectScreen = MutableStateFlow(ConnectAssistUiState.Loading)
    internal val torConnectScreen: StateFlow<ConnectAssistUiState> = _torConnectScreen

    val countryCodeNameMap: MutableStateFlow<Map<String, String>?> by lazy {
        MutableStateFlow(null)
    }

    val selectedCountryCode: MutableStateFlow<String> by lazy {
        MutableStateFlow("automatic")
    }

    fun selectDefaultRegion() {
        selectedCountryCode.value = torConnectStage.value?.defaultRegion ?: "automatic"
    }

    fun setCountryCodeToSelectedItem(position: Int) {
        selectedCountryCode.value =
            countryCodeNameMap.value?.keys?.toList()
                ?.getOrNull(position - 1) ?: "automatic"
        // position - 1 since we have the default/first value of automatic
        Log.d(TAG, "selectedCountryCode = ${selectedCountryCode.value}")
    }

    val shouldOpenHome: MutableLiveData<Boolean> by lazy {
        MutableLiveData(false)
    }

    fun handleConnect() {
        val screen = _torConnectScreen.value
        if (screen.torBootstrapButton1ShouldTryABridge && !button1ShouldBeDisabled(screen)) {
            Log.d(TAG, "beginAutoBootstrap with countryCode: ${selectedCountryCode.value}")
            torAndroidIntegration.beginAutoBootstrap(selectedCountryCode.value)
        } else {
            torAndroidIntegration.beginBootstrap()
        }
    }

    fun cancelTorBootstrap() {
        torAndroidIntegration.cancelBootstrap()
    }

    suspend fun collectTorConnectStage() {
        torConnectStage.collect {
            Log.d(TAG, "torConnectStageName: ${it?.name}")
            when (it?.name) {
                TorConnectStageName.Disabled       -> shouldOpenHome.value = true // TODO use TorConnect.enabled instead to determine this
                TorConnectStageName.Loading        -> _torConnectScreen.value = ConnectAssistUiState.Loading
                TorConnectStageName.Start          -> _torConnectScreen.value = ConnectAssistUiState.Start
                TorConnectStageName.Bootstrapping  -> _torConnectScreen.value = handleBootstrapTrigger(it.bootstrapTrigger)
                TorConnectStageName.Offline        -> _torConnectScreen.value = ConnectAssistUiState.Offline
                TorConnectStageName.ChooseRegion   -> _torConnectScreen.value = ConnectAssistUiState.ChooseRegion
                TorConnectStageName.RegionNotFound -> _torConnectScreen.value = ConnectAssistUiState.RegionNotFound
                TorConnectStageName.ConfirmRegion  -> _torConnectScreen.value = ConnectAssistUiState.ConfirmRegion
                TorConnectStageName.FinalError     -> _torConnectScreen.value = ConnectAssistUiState.FinalError
                TorConnectStageName.Bootstrapped   -> shouldOpenHome.value = true
                null                               -> {}
            }
        }
    }

    private fun handleBootstrapTrigger(bootstrapTrigger: TorConnectStageName) : ConnectAssistUiState {
        Log.d(TAG, "bootstrapTrigger: $bootstrapTrigger")
        return when (bootstrapTrigger) {
            TorConnectStageName.Start          -> ConnectAssistUiState.Bootstrapping
            TorConnectStageName.Offline        -> ConnectAssistUiState.TryingAgain
            TorConnectStageName.ChooseRegion   -> ConnectAssistUiState.TryingABridge
            TorConnectStageName.RegionNotFound -> ConnectAssistUiState.TryingABridgeRegionNotFound
            TorConnectStageName.ConfirmRegion  -> ConnectAssistUiState.TryingABridgeConfirmRegion
            else                               -> {
                Log.e(TAG, "Unexpected bootstrapTrigger of $bootstrapTrigger")
                ConnectAssistUiState.TryingAgain
            }
        }
    }

    fun handleBackButtonPressed(homeActivity: HomeActivity) {
        when (torConnectScreen.value) {
            ConnectAssistUiState.Loading -> homeActivity.shutDown()
            ConnectAssistUiState.Start   -> homeActivity.shutDown()
            else                         -> torAndroidIntegration.startAgain()
        }
    }

    override fun onBootstrapStateChange(state: String?) {}

    override fun onBootstrapStageChange(stage: TorConnectStage?) {
        torConnectStage.value = stage
    }

    override fun onBootstrapProgress(progress: Double, hasWarnings: Boolean) {}

    override fun onBootstrapComplete() {}

    override fun onBootstrapError(
        code: String?,
        message: String?,
        phase: String?,
        reason: String?,
    ) {}

    fun button1ShouldBeDisabled(screen: ConnectAssistUiState): Boolean {
        return selectedCountryCode.value == "automatic" && screen.countryDropDownDefaultItem == R.string.connection_assist_select_country_or_region
    }
}
