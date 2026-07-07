package com.mvorontsov.bonds.feature.chatroom.data.remote

import kotlinx.serialization.Serializable

@Serializable
internal data class MessageDto(
    val id: String? = null,
    val sender: MessageSenderDto,
    val content: String = "",
    val type: String = "TEXT",
    val mediaUrl: String? = null,
    val timestamp: String? = null,
)
