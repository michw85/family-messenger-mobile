package com.mvorontsov.bonds.feature.chats.domain.mapper

import com.mvorontsov.bonds.feature.chats.data.remote.ChatDto
import com.mvorontsov.bonds.feature.chats.domain.model.Chat
import com.mvorontsov.bonds.feature.chats.domain.model.ChatType

/** Маппинг DTO → доменная модель (вызывается из UseCase). */
internal fun ChatDto.toChat(): Chat = Chat(
    id = id,
    name = name,
    type = when (type.uppercase()) {
        "GROUP" -> ChatType.GROUP
        "FAMILY" -> ChatType.FAMILY
        else -> ChatType.DIRECT
    },
)
