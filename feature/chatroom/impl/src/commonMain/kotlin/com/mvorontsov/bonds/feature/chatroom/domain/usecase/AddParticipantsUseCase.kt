package com.mvorontsov.bonds.feature.chatroom.domain.usecase

import com.mvorontsov.bonds.feature.chatroom.domain.repository.ParticipantsRepository

internal class AddParticipantsUseCase(private val repository: ParticipantsRepository) {
    suspend operator fun invoke(chatId: String, userIds: List<Long>) =
        repository.addParticipants(chatId, userIds)
}
