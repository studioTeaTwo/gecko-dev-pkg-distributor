package org.mozilla.fenix.tor

import androidx.compose.runtime.Stable

@Stable
data class TorLog(
    val type: String,
    val text: String,
    val timestamp: String,
)
