package com.mvorontsov.bonds.core.localization

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ProvidedValue

/**
 * Переопределение языка приложения в рантайме (значение — тег языка или `null`
 * для системного). actual-реализация применяет локаль так, чтобы Compose
 * Resources выбрал нужный `strings.xml`. Использовать в корне App:
 *
 * ```
 * CompositionLocalProvider(LocalAppLocale provides language) {
 *     key(language) { /* контент */ }
 * }
 * ```
 */
expect object LocalAppLocale {
    val current: String?
        @Composable get

    @Composable
    infix fun provides(value: String?): ProvidedValue<*>
}
