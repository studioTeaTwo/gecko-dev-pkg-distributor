/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tor

@SuppressWarnings("LongParameterList", "TooManyFunctions")
class TorBootstrapStatus(
        private val shouldStartTor: Boolean,
        private val torController: TorController,
        private val dispatchModeChanges: (isShouldBootstrap: Boolean) -> Unit
    ) : TorEvents {

        init {
            torController.registerTorListener(this)
        }

        fun isBootstrapping() = (shouldStartTor && !torController.isBootstrapped)


        @SuppressWarnings("EmptyFunctionBlock")
        override fun onTorConnecting() {
        }

        override fun onTorConnected() {
            dispatchModeChanges(isBootstrapping())
        }

        override fun onTorStopped() {
            dispatchModeChanges(isBootstrapping())
        }

        @SuppressWarnings("EmptyFunctionBlock")
        override fun onTorStatusUpdate(entry: String?, status: String?, progress: Double?) {
        }

        fun unregisterTorListener() {
            torController.unregisterTorListener(this)
        }

    fun registerTorListener() {
        torController.registerTorListener(this)
    }

}
