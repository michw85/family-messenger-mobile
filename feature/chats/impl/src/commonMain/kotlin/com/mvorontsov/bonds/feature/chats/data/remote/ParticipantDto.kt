package com.mvorontsov.bonds.feature.chats.data.remote

import kotlinx.serialization.Serializable

/** Участник чата в ответе списка чатов. */
@Serializable
internal data class ParticipantDto(
    val username: String,
)
