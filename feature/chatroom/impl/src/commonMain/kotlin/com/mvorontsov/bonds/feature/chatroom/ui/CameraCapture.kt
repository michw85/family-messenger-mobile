package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.runtime.Composable

/** Съёмка фото камерой. Запуск — возвращаемая лямбда; в onResult — JPEG-байты или null. */
@Composable
internal expect fun rememberCameraCapture(onResult: (ByteArray?) -> Unit): () -> Unit
