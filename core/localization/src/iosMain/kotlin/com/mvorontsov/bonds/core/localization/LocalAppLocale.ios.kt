package com.mvorontsov.bonds.core.localization

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ProvidedValue
import androidx.compose.runtime.staticCompositionLocalOf
import platform.Foundation.NSUserDefaults

actual object LocalAppLocale {
    private const val KEY = "AppleLanguages"
    private val LocalAppLocaleValue = staticCompositionLocalOf<String?> { null }

    actual val current: String?
        @Composable get() = LocalAppLocaleValue.current

    @Composable
    actual infix fun provides(value: String?): ProvidedValue<*> {
        val defaults = NSUserDefaults.standardUserDefaults
        if (value == null) {
            defaults.removeObjectForKey(KEY)
        } else {
            defaults.setObject(listOf(value), KEY)
        }
        return LocalAppLocaleValue.provides(value)
    }
}
