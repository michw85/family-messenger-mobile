package com.mvorontsov.bonds.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.Color

/**
 * Единая тема приложения — все экраны оборачиваются в неё на корне (в `shared/App.kt`).
 * Задаёт Material3 ColorScheme + расширенную палитру [BondsColors] и размеры [BondsDimens].
 */
@Composable
fun BondsTheme(content: @Composable () -> Unit) {
    val colors = bondsLightColors
    val colorScheme = lightColorScheme(
        primary = colors.primary,
        onPrimary = colors.textLight,
        secondary = colors.accent,
        onSecondary = colors.text,
        background = colors.background,
        onBackground = colors.text,
        surface = colors.backgroundLight,
        onSurface = colors.text,
        error = Color(0xFFD32F2F),
        outline = colors.border,
    )
    CompositionLocalProvider(
        LocalBondsColors provides colors,
        LocalBondsDimens provides BondsDimens(),
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            content = content,
        )
    }
}

/** Доступ к расширенной палитре и размерам: `BondsTheme.colors` / `BondsTheme.dimens`. */
object BondsTheme {
    val colors: BondsColors
        @Composable
        @ReadOnlyComposable
        get() = LocalBondsColors.current

    val dimens: BondsDimens
        @Composable
        @ReadOnlyComposable
        get() = LocalBondsDimens.current
}
