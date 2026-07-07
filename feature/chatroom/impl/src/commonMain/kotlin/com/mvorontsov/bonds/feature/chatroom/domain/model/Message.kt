package com.mvorontsov.bonds.feature.chatroom.domain.model

import kotlinx.datetime.Instant

internal data class Message(
    val id: String,
    val senderUsername: String,
    val content: String,
    val type: MessageType,
    val mediaUrl: String?,
    val timestamp: Instant?,
    val isMine: Boolean,
)
