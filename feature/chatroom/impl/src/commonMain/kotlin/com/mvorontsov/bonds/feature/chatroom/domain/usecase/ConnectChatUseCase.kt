package com.mvorontsov.bonds.feature.chatroom.domain.usecase

import com.mvorontsov.bonds.feature.chatroom.domain.repository.ChatRoomRepository

internal class ConnectChatUseCase(private val repository: ChatRoomRepository) {
    suspend operator fun invoke(force: Boolean = false) = repository.connect(force)
}
