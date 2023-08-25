/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor

import android.app.Application
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.widget.Toast
import androidx.compose.runtime.Stable
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import java.sql.Timestamp

class TorLogsViewModel(application: Application) : AndroidViewModel(application), TorLogs {
    private val torController = application.components.torController
    private val clipboardManager =
        application.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

    private val _torLogs: MutableLiveData<List<TorLog>> = MutableLiveData(
        mutableListOf(TorLog("---------------" + application.getString(R.string.tor_initializing_log) + "---------------")),
    )

    fun torLogs(): LiveData<List<TorLog>> {
        return _torLogs
    }

    private fun addLog(log: TorLog) {
        _torLogs.value = _torLogs.value?.plus(log) ?: return
    }

    init {
        setupClipboardListener()
        torController.registerTorLogListener(this)
        val currentEntries = torController.logEntries.filter { it.second != null }
            .filter { !(it.second!!.startsWith("Circuit") && it.first == "ON") }
            // Keep synchronized with format in onTorStatusUpdate
            .flatMap { listOf(TorLog("[${it.first}] ${it.second}")) }
        for (log in currentEntries) {
            addLog(log)
        }
    }

    override fun onLog(type: String?, message: String?) {
        if (message == null || type == null) return
        if (type == "ON" && type.startsWith("Circuit")) return

        addLog(TorLog("[$type] $message"))
    }

    override fun onCleared() {
        super.onCleared()
        torController.unregisterTorLogListener(this)
    }

    private fun setupClipboardListener() {
        clipboardManager.addPrimaryClipChangedListener {
            // Only show a toast for Android 12 and lower.
            // https://developer.android.com/develop/ui/views/touch-and-input/copy-paste#duplicate-notifications
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S_V2) {
                Toast.makeText(
                    getApplication<Application>().applicationContext,
                    getApplication<Application>().getString(R.string.toast_copy_link_to_clipboard), // "Copied to clipboard" already translated
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }
    }

    fun copyAllLogsToClipboard() {
        clipboardManager.setPrimaryClip(
            ClipData.newPlainText(
                getApplication<Application>().getString(R.string.preferences_tor_logs),
                getAllTorLogs(),
            ),
        )
    }

    private fun getAllTorLogs(): String {
        var ret = ""
        for (log in torLogs().value
            ?: return getApplication<Application>().getString(R.string.default_error_msg)) {
            ret += log.text + '\n'
        }
        return ret
    }
}

@Stable
data class TorLog(
    val text: String,
    val timestamp: Timestamp = Timestamp(System.currentTimeMillis()),
)
