package com.mvorontsov.bonds.core.designsystem

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Расширенная палитра Bonds (то, чего нет в Material3 ColorScheme): градиент фона,
 * цвета пузырей сообщений, оттенки текста. Доступна как `BondsTheme.colors`.
 *
 * Идея: тёплый дом, уют, доверие, связь — глубокий индиго + мягкое золото + кремовый фон.
 */
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
)

/** Светлая палитра Bonds (портирована из legacy theme.ts). */
val bondsLightColors: BondsColors = BondsColors(
    primary = Color(0xFF2C3E7A),
    primaryLight = Color(0xFF4A6FA5),
    primaryDark = Color(0xFF1A2530),
    accent = Color(0xFFD4AF37),
    accentLight = Color(0xFFF0E0B8),
    background = Color(0xFFFDF8F0),
    backgroundLight = Color(0xFFFFFFFF),
    backgroundWarm = Color(0xFFF5E6CA),
    gradient = listOf(Color(0xFFFDF8F0), Color(0xFFF5E6CA), Color(0xFFE8D5B8)),
    myMessage = Color(0xFF2C3E7A),
    theirMessage = Color(0xFF44B054),
    text = Color(0xFF1A2530),
    textLight = Color(0xFFFFFFFF),
    textSecondary = Color(0xFF6B7A8A),
    textMuted = Color(0xFF95A5A6),
    online = Color(0xFF4CAF50),
    border = Color(0x142C3E7A),
)

val LocalBondsColors = staticCompositionLocalOf { bondsLightColors }
