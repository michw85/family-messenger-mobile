package com.mvorontsov.bonds.feature.chatroom.data.remote

import kotlinx.serialization.Serializable

/** Тело исходящего STOMP-сообщения в /app/chat.send/{roomId}. */
@Serializable
internal data class SendMessageDto(
    val content: String,
    val type: String,
    val mediaUrl: String? = null,
)
