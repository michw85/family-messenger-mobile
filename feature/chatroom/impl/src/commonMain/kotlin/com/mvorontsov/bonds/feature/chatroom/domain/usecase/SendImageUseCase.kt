package com.mvorontsov.bonds.feature.chatroom.domain.usecase

import com.mvorontsov.bonds.feature.chatroom.domain.repository.ChatRoomRepository

internal class SendImageUseCase(private val repository: ChatRoomRepository) {
    suspend operator fun invoke(chatId: String, bytes: ByteArray, filename: String = "photo.jpg") =
        repository.sendImage(chatId, bytes, filename)
}
