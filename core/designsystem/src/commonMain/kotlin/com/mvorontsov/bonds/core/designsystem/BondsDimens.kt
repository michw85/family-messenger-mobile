package com.mvorontsov.bonds.core.designsystem

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Отступы и скругления Bonds (портированы из legacy theme.ts). Доступны как `BondsTheme.dimens`. */
@Immutable
data class BondsDimens(
    val xs: Dp = 4.dp,
    val sm: Dp = 8.dp,
    val md: Dp = 12.dp,
    val lg: Dp = 16.dp,
    val xl: Dp = 20.dp,
    val xxl: Dp = 24.dp,
    val xxxl: Dp = 32.dp,
    val radiusSmall: Dp = 8.dp,
    val radiusMedium: Dp = 16.dp,
    val radiusLarge: Dp = 24.dp,
    val radiusXLarge: Dp = 32.dp,
)

val LocalBondsDimens = staticCompositionLocalOf { BondsDimens() }
