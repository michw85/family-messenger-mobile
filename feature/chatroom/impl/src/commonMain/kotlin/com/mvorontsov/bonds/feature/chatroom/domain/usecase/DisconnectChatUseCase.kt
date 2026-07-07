package com.mvorontsov.bonds.feature.chatroom.domain.usecase

import com.mvorontsov.bonds.feature.chatroom.domain.repository.ChatRoomRepository

internal class DisconnectChatUseCase(private val repository: ChatRoomRepository) {
    suspend operator fun invoke() = repository.disconnect()
}
