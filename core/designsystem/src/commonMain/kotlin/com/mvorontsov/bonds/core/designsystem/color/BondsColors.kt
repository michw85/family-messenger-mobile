package com.mvorontsov.bonds.core.designsystem.color

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/** Семантические цвета Bonds (`BondsTheme.colors`). */
@Immutable
data class BondsColors(
    val primary: Color,
    val primaryLight: Color,
    val primaryDark: Color,
    val accent: Color,
    val accentLight: Color,
    val background: Color,
    val backgroundLight: Color,
    val backgroundWarm: Color,
    val gradient: List<Color>,
    val myMessage: Color,
    val theirMessage: Color,
    val text: Color,
    val textLight: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val online: Color,
    val border: Color,
    val danger: Color,
    val bubbleText: Color,
    val bubbleBorder: Color,
    val headerScrim: Color,
    val inputScrim: Color,
    val iconButtonBg: Color,
    val senderAccents: List<Color>,
    val bubbleMine: List<Color>,
    val bubbleTheir: List<Color>,
)

val bondsLightColors: BondsColors = with(BondsPalette) {
    BondsColors(
        primary = Indigo,
        primaryLight = IndigoLight,
        primaryDark = IndigoDark,
        accent = Gold,
        accentLight = GoldLight,
        background = Cream,
        backgroundLight = White,
        backgroundWarm = Beige,
        gradient = listOf(Cream, Beige, BeigeDeep),
        myMessage = Indigo,
        theirMessage = Green,
        text = TextPrimary,
        textLight = White,
        textSecondary = TextSecondary,
        textMuted = TextMuted,
        online = Online,
        border = BorderIndigo,
        danger = Danger,
        bubbleText = CloudText,
        bubbleBorder = CloudBorder,
        headerScrim = HeaderScrim,
        inputScrim = InputScrim,
        iconButtonBg = IconButtonBg,
        senderAccents = SenderAccents,
        bubbleMine = listOf(Beige, BeigeDeep),
        bubbleTheir = listOf(White, Beige),
    )
}

val LocalBondsColors = staticCompositionLocalOf { bondsLightColors }
