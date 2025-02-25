package org.mozilla.fenix.tor

import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel

class UrlQuickLoadViewModel : ViewModel() {
    val urlToLoadAfterConnecting: MutableLiveData<String?> by lazy {
        MutableLiveData<String?>(null)
    }
}
