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

    private val torIntegrationAndroid =
        (getApplication<Application>().components.core.engine as GeckoEngine).getTorIntegrationController()

    /**
     * NOTE: Whilst the initial value for _quickstart is fetched from
     * TorIntegrationAndroid.quickstartGet (which is surfaced from TorConnect.quickstart), and we
     * pass on any changes in value up to TorConnect.quickstart (via quickstartSet()), we do not
     * listen for any changes to the TorConnect.quickstart value via "QuickstartChange" because we
     * do not expect anything outside of TorConnectViewModel to change its value, so we expect its
     * value to remain in sync with our local value.
     */
    init {
        torIntegrationAndroid.quickstartGet {
            _quickstart.value = it
        }
    }

    private val _quickstart = MutableLiveData<Boolean>()
    fun quickstart(): LiveData<Boolean> {
        return _quickstart
    }

    fun quickstartSet(value: Boolean) {
        torIntegrationAndroid.quickstartSet(value)
        _quickstart.value = value
    }

}
