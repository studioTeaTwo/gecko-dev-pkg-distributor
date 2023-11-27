/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor

import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.TextPaint
import android.text.method.LinkMovementMethod
import android.text.style.ClickableSpan
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.content.res.AppCompatResources
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import kotlinx.coroutines.launch
import mozilla.components.support.base.feature.UserInteractionHandler
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.R
import org.mozilla.fenix.databinding.FragmentTorConnectionAssistBinding
import org.mozilla.fenix.ext.hideToolbar

class TorConnectionAssistFragment : Fragment(), UserInteractionHandler {

    private val TAG = "TorConnectionAssistFrag"
    private val viewModel: TorConnectionAssistViewModel by viewModels()
    private var _binding: FragmentTorConnectionAssistBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentTorConnectionAssistBinding.inflate(
            inflater, container, false,
        )

        viewLifecycleOwner.lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.torConnectScreen.collect { screen ->
                    Log.d(TAG, "torConnectScreen is $screen")
                    showScreen(screen)
                }
            }
        }

        return binding.root
    }

    override fun onResume() {
        super.onResume()
        hideToolbar()
        viewModel.handleTorConnectStateToScreen() // Covers the case where the app is backgrounded when the bootstrap finishes
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        viewModel.progress().observe(
            viewLifecycleOwner,
        ) { progress ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                binding.torBootstrapProgressBar.setProgress(progress, true)
            } else {
                binding.torBootstrapProgressBar.progress = progress
            }
        }

        viewModel.quickstartToggle().observe(
            viewLifecycleOwner,
        ) {
            binding.quickstartSwitch.isChecked = it == true
        }

        viewModel.shouldOpenHome().observe(
            viewLifecycleOwner,
        ) {
            Log.d(TAG, "shouldOpenHome() = $it")
            if (it) {
                openHome()
            }
        }

    }

    private fun showScreen(screen: ConnectAssistUiState) {
        setProgressBar(screen)
        setSettingsButton(screen)
        setBackButton(screen)
        setTorConnectImage(screen)
        setTitle(screen)
        setQuickStart(screen)
        setCountryDropDown(screen)
        setButton1(screen)
        setButton2(screen)
        setSplashLogo(screen)
    }

    private fun setProgressBar(screen: ConnectAssistUiState) {
        binding.torBootstrapProgressBar.visibility =
            if (screen.progressBarVisible) View.VISIBLE else View.GONE
        binding.torBootstrapProgressBar.progress = screen.progress
        binding.torBootstrapProgressBar.progressTintList =
            screen.progressTintColorResource?.let {
                AppCompatResources.getColorStateList(
                    requireContext(),
                    it,
                )
            }
    }

    private fun setSettingsButton(screen: ConnectAssistUiState) {
        binding.settingsButton.visibility = if (screen.settingsButtonVisible) View.VISIBLE else View.GONE
        binding.settingsButton.setOnClickListener {
            openSettings()
        }
    }

    private fun setBackButton(screen: ConnectAssistUiState) {
        binding.backButton.visibility = if (screen.backButtonVisible) View.VISIBLE else View.INVISIBLE
        binding.backButton.setOnClickListener {
            viewModel.handleBackButtonPressed()
        }
    }

    private fun setTorConnectImage(screen: ConnectAssistUiState) {
        binding.torConnectImage.visibility = if (screen.torConnectImageVisible) View.VISIBLE else View.GONE
        binding.torConnectImage.setImageResource(screen.torConnectImageResource)
    }

    private fun setTitle(screen: ConnectAssistUiState) {
        binding.titleLargeTextView.visibility =
            if (screen.titleLargeTextViewVisible) View.VISIBLE else View.GONE
        binding.titleLargeTextView.text = getString(screen.titleLargeTextViewTextStringResource)
        binding.titleDescription.visibility =
            if (screen.titleDescriptionVisible) View.VISIBLE else View.GONE
        if (screen.learnMoreStringResource != null && screen.internetErrorDescription != null) {
            val learnMore: String = getString(screen.learnMoreStringResource)
            val internetErrorDescription: String =
                if (screen.internetErrorDescription1 == null) {
                    getString(
                        screen.internetErrorDescription,
                        learnMore,
                    )
                } else if (screen.internetErrorDescription2 == null) {
                    getString(
                        screen.internetErrorDescription,
                        getString(screen.internetErrorDescription1),
                        learnMore,
                    )
                } else {
                    getString(
                        screen.internetErrorDescription,
                        getString(screen.internetErrorDescription1),
                        getString(screen.internetErrorDescription2),
                        learnMore,
                    )
                }
            handleDescriptionWithClickable(internetErrorDescription, learnMore)
        } else if (screen.titleDescriptionTextStringResource != null) {
            binding.titleDescription.text = getString(screen.titleDescriptionTextStringResource)
        }
    }

    private fun setQuickStart(screen: ConnectAssistUiState) {
        binding.quickstartSwitch.visibility =
            if (screen.quickstartSwitchVisible) View.VISIBLE else View.GONE
        binding.quickstartSwitch.isChecked = viewModel.quickstartToggle().value == true
        binding.quickstartSwitch.setOnCheckedChangeListener { _, isChecked ->
            viewModel.handleQuickstartChecked(isChecked)
        }
    }

    private fun setCountryDropDown(screen: ConnectAssistUiState) {
        binding.unblockTheInternetInCountryDescription.visibility =
            if (screen.unblockTheInternetInCountryDescriptionVisible) View.VISIBLE else View.GONE
        binding.countryDropDown.visibility = if (screen.countryDropDownVisible) View.VISIBLE else View.GONE
    }

    private fun setButton1(screen: ConnectAssistUiState) {
        binding.torBootstrapButton1.visibility =
            if (screen.torBootstrapButton1Visible) View.VISIBLE else View.GONE
        binding.torBootstrapButton1.text = getString(screen.torBootstrapButton1TextStringResource)
        binding.torBootstrapButton1.setOnClickListener {
            viewModel.handleButton1Pressed(
                screen,
                lifecycleScope,
            )
        }
    }

    private fun setButton2(screen: ConnectAssistUiState) {
        binding.torBootstrapButton2.visibility =
            if (screen.torBootstrapButton2Visible) View.VISIBLE else View.GONE
        if (screen.torBootstrapButton2ShouldRestartApp) {
            binding.torBootstrapButton2.text =
                screen.torBootstrapButton2TextStringResource?.let {
                    getString(
                        it,
                        getString(R.string.app_name),
                    )
                }
        } else {
            binding.torBootstrapButton2.text =
                screen.torBootstrapButton2TextStringResource?.let {
                    getString(
                        it,
                    )
                }
        }
        binding.torBootstrapButton2.setOnClickListener {
            viewModel.cancelTorBootstrap()
            if (screen.torBootstrapButton2ShouldOpenSettings) {
                openTorConnectionSettings()
            } else if (screen.torBootstrapButton2ShouldRestartApp) {
                restartApplication()
            } else {
                showScreen(ConnectAssistUiState.Configuring)
            }
        }
    }

    private fun setSplashLogo(screen: ConnectAssistUiState) {
        binding.wordmarkLogo.visibility = if (screen.wordmarkLogoVisible) View.VISIBLE else View.GONE
    }

    /**
     * from https://stackoverflow.com/questions/10696986/how-to-set-the-part-of-the-text-view-is-clickable
     */
    private fun handleDescriptionWithClickable(errorDescription: String, learnMore: String) {
        val errorDescriptionSpannableString = SpannableString(errorDescription)
        val clickableSpan: ClickableSpan = object : ClickableSpan() {
            override fun onClick(textView: View) {
                showLearnMore()
            }

            override fun updateDrawState(drawState: TextPaint) {
                super.updateDrawState(drawState)
                drawState.isUnderlineText = true
            }
        }
        errorDescriptionSpannableString.setSpan(
            clickableSpan,
            errorDescription.length - learnMore.length,
            errorDescription.length,
            Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
        )
        binding.titleDescription.text = errorDescriptionSpannableString
        binding.titleDescription.movementMethod = LinkMovementMethod.getInstance()
        binding.titleDescription.highlightColor = Color.TRANSPARENT
    }

    private fun showLearnMore() {
        Log.d(TAG, "showLearnMore() tapped")
        //TODO("Not yet implemented")
    }

    private fun openHome() {
        Log.d(TAG, "openHome()")
        findNavController().navigate(TorConnectionAssistFragmentDirections.actionStartupHome())
    }

    private fun openSettings(preferenceToScrollTo: String? = null) {
        findNavController().navigate(
            TorConnectionAssistFragmentDirections.actionTorConnectionAssistFragmentToSettingsFragment(
                preferenceToScrollTo,
            ),
        )
    }

    private fun openTorConnectionSettings() {
        findNavController().navigate(
            TorConnectionAssistFragmentDirections.actionTorConnectionAssistFragmentToSettingsFragment(
                requireContext().getString(R.string.pref_key_connection)
            ),
        )
    }

    private fun restartApplication() {
        startActivity(
            Intent(requireContext(), HomeActivity::class.java).addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK,
            ),
        )
        Runtime.getRuntime().exit(0)
    }

    override fun onBackPressed(): Boolean {
        return viewModel.handleBackButtonPressed()
    }

}
