package com.mvorontsov.bonds.feature.chatroom.domain.usecase

import com.mvorontsov.bonds.feature.chatroom.domain.repository.ChatRoomRepository

internal class SendTextMessageUseCase(private val repository: ChatRoomRepository) {
    suspend operator fun invoke(chatId: String, content: String) {
        val trimmed = content.trim()
        if (trimmed.isNotEmpty()) repository.sendText(chatId, trimmed)
    }
}
