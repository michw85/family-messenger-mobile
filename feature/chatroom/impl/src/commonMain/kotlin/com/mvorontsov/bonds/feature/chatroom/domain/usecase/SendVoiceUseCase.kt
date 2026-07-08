package com.mvorontsov.bonds.feature.chatroom.domain.usecase

import com.mvorontsov.bonds.feature.chatroom.domain.repository.ChatRoomRepository

internal class SendVoiceUseCase(private val repository: ChatRoomRepository) {
    suspend operator fun invoke(chatId: String, bytes: ByteArray, filename: String = "voice.m4a") =
        repository.sendVoice(chatId, bytes, filename)
}
