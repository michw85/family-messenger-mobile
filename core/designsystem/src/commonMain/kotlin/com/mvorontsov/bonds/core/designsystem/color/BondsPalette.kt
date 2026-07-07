package com.mvorontsov.bonds.core.designsystem.color

import androidx.compose.ui.graphics.Color

/** Единственный источник сырых цветов Bonds. Экраны используют роли из [BondsColors]. */
internal object BondsPalette {
    val Indigo = Color(0xFF2C3E7A)
    val IndigoLight = Color(0xFF4A6FA5)
    val IndigoDark = Color(0xFF1A2530)

    val Gold = Color(0xFFD4AF37)
    val GoldLight = Color(0xFFF0E0B8)

    val Cream = Color(0xFFFDF8F0)
    val White = Color(0xFFFFFFFF)
    val Beige = Color(0xFFF5E6CA)
    val BeigeDeep = Color(0xFFE8D5B8)

    val Green = Color(0xFF44B054)

    val TextPrimary = Color(0xFF1A2530)
    val TextSecondary = Color(0xFF6B7A8A)
    val TextMuted = Color(0xFF95A5A6)

    val Online = Color(0xFF4CAF50)
    val BorderIndigo = Color(0x142C3E7A)
    val Danger = Color(0xFFD32F2F)

    // Chat
    val CloudText = Color(0xFF2C3E50)
    val CloudBorder = Color(0xFFE8E8E8)
    val HeaderScrim = Color(0xD9FFF8F0)
    val InputScrim = Color(0xF5FFF8F0)
    val IconButtonBg = Color(0xFFF5F0EA)
    val SenderAccents = listOf(
        Color(0xFF6C5CE7), Color(0xFF00CEC9), Color(0xFFFF7675), Color(0xFF74B9FF), Color(0xFFA29BFE),
        Color(0xFFFD79A8), Color(0xFF55EFC4), Color(0xFF0984E3), Color(0xFFD63031), Color(0xFF00B894),
    )
}
