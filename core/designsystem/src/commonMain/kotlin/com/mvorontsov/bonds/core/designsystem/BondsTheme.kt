package com.mvorontsov.bonds.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import com.mvorontsov.bonds.core.designsystem.color.BondsColors
import com.mvorontsov.bonds.core.designsystem.color.LocalBondsColors
import com.mvorontsov.bonds.core.designsystem.color.bondsLightColors

/** Корневая тема приложения. */
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
        error = colors.danger,
        outline = colors.border,
    )
    CompositionLocalProvider(
        LocalBondsColors provides colors,
        LocalBondsDimens provides BondsDimens(),
    ) {
        MaterialTheme(colorScheme = colorScheme, content = content)
    }
}

object BondsTheme {
    val colors: BondsColors
        @Composable @ReadOnlyComposable get() = LocalBondsColors.current

    val dimens: BondsDimens
        @Composable @ReadOnlyComposable get() = LocalBondsDimens.current
}
