package com.mvorontsov.bonds.core.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Декоративные тёплые полупрозрачные «облака» на фоне экрана. */
@Composable
fun FloatingClouds(modifier: Modifier = Modifier) {
    val cloud = BondsTheme.colors.backgroundWarm
    Box(modifier.fillMaxSize()) {
        Cloud(Alignment.TopStart, x = (-30).dp, y = 80.dp, w = 100.dp, h = 60.dp, alpha = 0.15f, color = cloud)
        Cloud(Alignment.TopEnd, x = 20.dp, y = 250.dp, w = 120.dp, h = 70.dp, alpha = 0.10f, color = cloud)
        Cloud(Alignment.BottomStart, x = 20.dp, y = (-150).dp, w = 100.dp, h = 60.dp, alpha = 0.10f, color = cloud)
        Cloud(Alignment.TopEnd, x = (-40).dp, y = 450.dp, w = 80.dp, h = 50.dp, alpha = 0.08f, color = cloud)
        Cloud(Alignment.BottomEnd, x = (-50).dp, y = (-300).dp, w = 90.dp, h = 55.dp, alpha = 0.10f, color = cloud)
    }
}

@Composable
private fun BoxScope.Cloud(
    alignment: Alignment,
    x: Dp,
    y: Dp,
    w: Dp,
    h: Dp,
    alpha: Float,
    color: androidx.compose.ui.graphics.Color,
) {
    Box(
        Modifier
            .align(alignment)
            .offset(x = x, y = y)
            .size(w, h)
            .background(color.copy(alpha = alpha), RoundedCornerShape(percent = 50)),
    )
}
