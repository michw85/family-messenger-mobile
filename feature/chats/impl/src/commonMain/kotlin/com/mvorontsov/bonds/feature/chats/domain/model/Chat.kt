package com.mvorontsov.bonds.feature.chats.domain.model

/** Доменная модель чата для списка. */
internal data class Chat(
    val id: String,
    val name: String,
    val type: ChatType,
)
