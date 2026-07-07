package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.feature.chatroom.domain.model.Message
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.roundToInt
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

@Composable
internal fun MessageBubble(message: Message) {
    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens
    val brush = Brush.linearGradient(if (message.isMine) colors.bubbleMine else colors.bubbleTheir)

    val appear = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        appear.animateTo(1f, spring(dampingRatio = 0.6f, stiffness = Spring.StiffnessLow))
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = dimens.sm, vertical = dimens.sm)
            .graphicsLayer {
                scaleX = appear.value
                scaleY = appear.value
                alpha = appear.value
                translationY = (1f - appear.value) * 30f
            },
        horizontalAlignment = if (message.isMine) Alignment.End else Alignment.Start,
    ) {
        if (!message.isMine) {
            Text(
                text = message.senderUsername,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = senderColor(message.senderUsername, colors.senderAccents),
                modifier = Modifier.padding(start = dimens.lg, bottom = 2.dp),
            )
        }
        Box(
            modifier = Modifier
                .widthIn(max = 300.dp)
                .drawBehind {
                    val r = 14.dp.toPx()
                    val path = cloudPath(size, r)
                    translate(left = 2.dp.toPx(), top = 2.5.dp.toPx()) {
                        drawPath(path, color = Color.Black.copy(alpha = 0.06f))
                    }
                    drawPath(path, brush = brush)
                    drawPath(path, color = colors.bubbleBorder, style = Stroke(width = 0.8.dp.toPx()))
                }
                .padding(horizontal = dimens.xxl, vertical = dimens.xl),
        ) {
            Text(
                text = message.content,
                color = colors.bubbleText,
                fontSize = 15.sp,
                lineHeight = 22.sp,
            )
        }
        Tail(isMine = message.isMine, color = colors.backgroundLight, border = colors.bubbleBorder)
        message.timestamp?.let { ts ->
            Text(
                text = formatTime(ts),
                style = MaterialTheme.typography.labelSmall,
                color = colors.textSecondary,
                modifier = Modifier.padding(horizontal = dimens.lg),
            )
        }
    }
}

@Composable
private fun Tail(isMine: Boolean, color: Color, border: Color) {
    val sizes = if (isMine) listOf(9.dp, 6.dp, 3.dp) else listOf(3.dp, 6.dp, 9.dp)
    Row(
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        modifier = Modifier.offset(y = (-4).dp).padding(horizontal = 14.dp),
    ) {
        sizes.forEach { s ->
            Box(
                Modifier
                    .size(s)
                    .clip(CircleShape)
                    .background(color)
                    .border(0.6.dp, border, CircleShape),
            )
        }
    }
}

// Пушистый облачный контур: скруглённый прямоугольник со «шишками» по периметру.
private fun cloudPath(size: Size, bump: Float): Path {
    val w = size.width
    val h = size.height
    val tl = Offset(bump, bump)
    val tr = Offset(w - bump, bump)
    val br = Offset(w - bump, h - bump)
    val bl = Offset(bump, h - bump)
    return Path().apply {
        moveTo(tl.x, tl.y)
        scallop(tl, tr, Offset(0f, -1f), bump)
        scallop(tr, br, Offset(1f, 0f), bump)
        scallop(br, bl, Offset(0f, 1f), bump)
        scallop(bl, tl, Offset(-1f, 0f), bump)
        close()
    }
}

private fun Path.scallop(from: Offset, to: Offset, normal: Offset, bulge: Float) {
    val dx = to.x - from.x
    val dy = to.y - from.y
    val count = max(1, (hypot(dx, dy) / (bulge * 2f)).roundToInt())
    for (i in 1..count) {
        val t0 = (i - 1f) / count
        val t1 = i.toFloat() / count
        val sx = from.x + dx * t0
        val sy = from.y + dy * t0
        val ex = from.x + dx * t1
        val ey = from.y + dy * t1
        val mx = (sx + ex) / 2f + normal.x * bulge
        val my = (sy + ey) / 2f + normal.y * bulge
        quadraticBezierTo(mx, my, ex, ey)
    }
}

private fun senderColor(name: String, palette: List<Color>): Color {
    var hash = 0
    for (ch in name) hash = ch.code + ((hash shl 5) - hash)
    return palette[abs(hash) % palette.size]
}

private fun formatTime(instant: Instant): String {
    val t = instant.toLocalDateTime(TimeZone.currentSystemDefault())
    return "${t.hour.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')}"
}
