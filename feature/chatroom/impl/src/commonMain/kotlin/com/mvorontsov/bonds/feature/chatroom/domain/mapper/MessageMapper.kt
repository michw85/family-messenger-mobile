package com.mvorontsov.bonds.feature.chatroom.domain.mapper

import com.mvorontsov.bonds.feature.chatroom.data.remote.MessageDto
import com.mvorontsov.bonds.feature.chatroom.domain.model.Message
import com.mvorontsov.bonds.feature.chatroom.domain.model.MessageType
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toInstant

internal fun MessageDto.toMessage(currentUsername: String): Message = Message(
    id = id ?: "${timestamp}_${sender.username}_${content.hashCode()}",
    senderUsername = sender.username,
    content = content,
    type = when (type.uppercase()) {
        "IMAGE" -> MessageType.IMAGE
        "VOICE" -> MessageType.VOICE
        else -> MessageType.TEXT
    },
    mediaUrl = mediaUrl,
    timestamp = parseInstant(timestamp),
    isMine = sender.username == currentUsername,
)

// Сервер шлёт время в UTC (с зоной или без). Возвращаем Instant, формат в локали — в UI.
private fun parseInstant(raw: String?): Instant? {
    if (raw.isNullOrBlank()) return null
    runCatching { return Instant.parse(raw) }
    return runCatching { LocalDateTime.parse(raw).toInstant(TimeZone.UTC) }.getOrNull()
}
