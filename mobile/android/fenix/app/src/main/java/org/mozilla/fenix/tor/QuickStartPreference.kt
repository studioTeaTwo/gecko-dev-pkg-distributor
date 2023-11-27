package org.mozilla.fenix.tor

import android.content.Context
import android.util.AttributeSet
import androidx.preference.PreferenceViewHolder
import androidx.preference.SwitchPreference
import com.google.android.material.switchmaterial.SwitchMaterial
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components

class QuickStartPreference @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : SwitchPreference(context, attrs) {

    private var switchView: SwitchMaterial? = null

    init {
        widgetLayoutResource = R.layout.preference_quick_start
    }

    override fun onBindViewHolder(holder: PreferenceViewHolder) {
        super.onBindViewHolder(holder)
        switchView = holder.findViewById(R.id.switch_widget) as SwitchMaterial

        updateSwitch()
    }

    fun updateSwitch() {
        switchView?.isChecked = context.components.torController.quickstart
    }
}
