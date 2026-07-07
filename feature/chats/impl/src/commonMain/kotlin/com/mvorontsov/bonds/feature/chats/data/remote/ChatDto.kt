package com.mvorontsov.bonds.feature.chats.data.remote

import kotlinx.serialization.Serializable

/** Чат в ответе GET /chats. */
@Serializable
internal data class ChatDto(
    val id: String,
    val name: String,
    val type: String,
    val participants: List<ParticipantDto> = emptyList(),
    val createdAt: String? = null,
)
