package org.mozilla.fenix.tor

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import org.mozilla.fenix.ext.components
import org.mozilla.geckoview.TorAndroidIntegration.BootstrapStateChangeListener

class TorBootstrapProgressViewModel(
    application: Application,
) : AndroidViewModel(application), BootstrapStateChangeListener {

    private val torIntegrationAndroid =
        application.components.core.geckoRuntime.torIntegrationController

    val progress: MutableLiveData<Int> by lazy {
        MutableLiveData<Int>(0)
    }

    init {
        torIntegrationAndroid.registerBootstrapStateChangeListener(this)
    }

    override fun onCleared() {
        torIntegrationAndroid.unregisterBootstrapStateChangeListener(this)
        super.onCleared()
    }

    override fun onBootstrapStateChange(state: String?) {}

    override fun onBootstrapProgress(progress: Double, hasWarnings: Boolean) {
        this.progress.value = progress.toInt()
    }

    override fun onBootstrapComplete() {}

    override fun onBootstrapError(
        code: String?,
        message: String?,
        phase: String?,
        reason: String?,
    ) {
    }
}
