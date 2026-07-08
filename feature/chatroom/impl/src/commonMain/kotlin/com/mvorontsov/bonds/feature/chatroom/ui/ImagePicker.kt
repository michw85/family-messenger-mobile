package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.runtime.Composable

/** Пикер изображений (мультивыбор). Запуск — возвращаемая лямбда; в onResult — список JPEG-байтов. */
@Composable
internal expect fun rememberImagePicker(onResult: (List<ByteArray>) -> Unit): () -> Unit
