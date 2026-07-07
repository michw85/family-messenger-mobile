package com.mvorontsov.bonds.feature.chatroom.domain.usecase

import com.mvorontsov.bonds.core.session.SessionStorage
import com.mvorontsov.bonds.feature.chatroom.domain.mapper.toMessage
import com.mvorontsov.bonds.feature.chatroom.domain.model.Message
import com.mvorontsov.bonds.feature.chatroom.domain.repository.ChatRoomRepository

/** История: бэкенд отдаёт от новых к старым — разворачиваем в хронологический порядок. */
internal class GetMessagesUseCase(
    private val repository: ChatRoomRepository,
    private val session: SessionStorage,
) {
    suspend operator fun invoke(chatId: String): List<Message> {
        val username = session.username.orEmpty()
        return repository.history(chatId, page = 0, size = 30)
            .map { it.toMessage(username) }
            .reversed()
    }
}
