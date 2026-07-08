package com.mvorontsov.bonds.feature.chatroom.ui

import com.mvorontsov.bonds.feature.chatroom.domain.model.Message

internal data class ChatRoomState(
    val messages: List<Message> = emptyList(),
    val input: String = "",
    val isLoading: Boolean = true,
    val isSending: Boolean = false,
)
