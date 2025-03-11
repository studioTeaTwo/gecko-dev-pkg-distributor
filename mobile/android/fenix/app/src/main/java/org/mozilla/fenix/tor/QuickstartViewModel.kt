package org.mozilla.fenix.tor

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import mozilla.components.browser.engine.gecko.GeckoEngine
import org.mozilla.fenix.ext.components

class QuickstartViewModel(
    application: Application,
) : AndroidViewModel(application) {

    private val components = getApplication<Application>().components
    private val torAndroidIntegration =
        (components.core.engine as GeckoEngine).getTorIntegrationController()

    /**
     * NOTE: Whilst the initial value for _quickstart is fetched from
     * TorAndroidIntegration.quickstartGet (which is surfaced from TorConnect.quickstart), and we
     * pass on any changes in value up to TorConnect.quickstart (via quickstartSet()), we do not
     * listen for any changes to the TorConnect.quickstart value via "QuickstartChange" because we
     * do not expect anything outside of TorConnectViewModel to change its value, so we expect its
     * value to remain in sync with our local value.
     */
    init {
        torAndroidIntegration.quickstartGet {
            _quickstart.value = it
            components.settings.quickStart = it
        }
    }

    private val _quickstart = MutableLiveData(components.settings.quickStart)
    fun quickstart(): LiveData<Boolean> {
        return _quickstart
    }

    fun quickstartSet(value: Boolean) {
        torAndroidIntegration.quickstartSet(value)
        _quickstart.value = value
        components.settings.quickStart = value
    }

}
