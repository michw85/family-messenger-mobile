package com.mvorontsov.bonds.feature.chatroom.data.remote

import kotlinx.serialization.Serializable

@Serializable
internal data class MessageSenderDto(
    val id: Long = 0,
    val username: String,
    val avatarUrl: String? = null,
)
