/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.DisableSelection
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.FloatingActionButton
import androidx.compose.material.Icon
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Observer
import mozilla.components.ui.colors.PhotonColors
import org.mozilla.fenix.R

class TorLogsComposeFragment : Fragment() {
    private val viewModel: TorLogsViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        return ComposeView(requireContext()).apply {
            setContent {
                Scaffold(
                    floatingActionButton = { CopyLogsButton() },
                    content = { TorLogs(paddingValues = it) },
                )
            }
        }
    }

    @Composable
    private fun TorLogs(paddingValues: PaddingValues) {
        val torLogsState = remember { mutableStateOf<List<TorLog>>(emptyList()) }
        val lifecycleOwner = LocalLifecycleOwner.current
        val scrollState = rememberScrollState()

        DisposableEffect(viewModel.torLogs(), lifecycleOwner) {
            val observer = Observer<List<TorLog>> { logs ->
                torLogsState.value = logs
            }
            viewModel.torLogs().observe(lifecycleOwner, observer)
            onDispose {
                viewModel.torLogs().removeObserver(observer)
            }
        }

        val torLogs = torLogsState.value

        LaunchedEffect(torLogs) {
            scrollState.animateScrollTo(scrollState.maxValue)
        }

        SelectionContainer {
            Column(
                // Column instead of LazyColumn so that you can select all the logs, and not just one "screen" at a time
                // The logs won't be too big so loading them all instead of just whats visible shouldn't be a big deal
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
                    .padding(paddingValues)
                    .background(PhotonColors.Ink50), // Standard background color
            ) {
                for (log in torLogs) {
                    LogRow(log = log)
                }
            }
        }
    }

    @Composable
    @Stable
    private fun LogRow(log: TorLog, modifier: Modifier = Modifier) {
        Column(
            modifier
                .fillMaxWidth()
                .padding(
                    start = 16.dp,
                    end = 16.dp,
                    bottom = 16.dp,
                ),
        ) {
            DisableSelection {
                Text(
                    text = log.timestamp.toString(),
                    color = PhotonColors.LightGrey40,
                    modifier = modifier
                        .padding(bottom = 4.dp),
                )
            }
            Text(
                text = log.text,
                color = PhotonColors.LightGrey05,
            )
        }
    }

    @Composable
    private fun CopyLogsButton() {
        FloatingActionButton(
            onClick = { viewModel.copyAllLogsToClipboard() },
            content = {
                Icon(
                    painter = painterResource(id = R.drawable.ic_copy),
                    contentDescription = getString(R.string.share_copy_link_to_clipboard),
                )
            },
            backgroundColor = PhotonColors.Violet50, // Same color as connect button
            contentColor = PhotonColors.LightGrey05,
        )
    }
}
