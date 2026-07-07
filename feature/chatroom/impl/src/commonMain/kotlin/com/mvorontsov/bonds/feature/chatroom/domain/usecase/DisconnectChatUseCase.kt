package com.mvorontsov.bonds.feature.chatroom.domain.usecase

import com.mvorontsov.bonds.feature.chatroom.domain.repository.ChatRoomRepository

internal class DisconnectChatUseCase(private val repository: ChatRoomRepository) {
    operator fun invoke() = repository.dispose()
}
