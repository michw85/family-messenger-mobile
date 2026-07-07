package com.mvorontsov.bonds.core.localization

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ProvidedValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalLocale
import androidx.compose.ui.platform.LocalResources
import java.util.Locale

actual object LocalAppLocale {
    private var default: Locale? = null
    private val LocalAppLocaleValue = staticCompositionLocalOf<String?> { null }

    actual val current: String?
        @Composable get() = LocalAppLocaleValue.current

    @Composable
    actual infix fun provides(value: String?): ProvidedValue<*> {
        val configuration = LocalConfiguration.current
        if (default == null) default = LocalLocale.current.platformLocale
        val locale = if (value == null) default!! else Locale(value)
        Locale.setDefault(locale)
        @Suppress("DEPRECATION")
        configuration.setLocale(locale)
        val resources = LocalResources.current
        @Suppress("DEPRECATION")
        resources.updateConfiguration(configuration, resources.displayMetrics)
        return LocalAppLocaleValue.provides(value)
    }
}
