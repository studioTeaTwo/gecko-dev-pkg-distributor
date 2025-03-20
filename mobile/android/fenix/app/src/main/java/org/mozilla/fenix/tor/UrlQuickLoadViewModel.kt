package org.mozilla.fenix.tor

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import org.mozilla.fenix.ext.components
import org.mozilla.geckoview.TorConnectStageName

class UrlQuickLoadViewModel(application: Application) : AndroidViewModel(application) {

    private val torAndroidIntegration =
        application.components.core.geckoRuntime.torIntegrationController

    val urlToLoadAfterConnecting: MutableLiveData<String?> by lazy {
        MutableLiveData<String?>(null)
    }

    fun maybeBeginBootstrap() {
        when (torAndroidIntegration.lastKnowStage.value?.name) {
            TorConnectStageName.Offline -> torAndroidIntegration.beginBootstrap()
            TorConnectStageName.Start -> torAndroidIntegration.beginBootstrap()
            else -> {}
        }
    }

}
