package com.mvorontsov.bonds.feature.chats.data.remote

import kotlinx.serialization.Serializable

/** Тело запроса POST /chats. type — "GROUP" или "FAMILY" (личный). */
@Serializable
internal data class CreateChatRequestDto(
    val name: String,
    val type: String,
)
