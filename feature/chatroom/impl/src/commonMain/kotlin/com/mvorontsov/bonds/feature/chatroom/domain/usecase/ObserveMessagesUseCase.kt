package com.mvorontsov.bonds.feature.chatroom.domain.usecase

import com.mvorontsov.bonds.core.session.SessionStorage
import com.mvorontsov.bonds.feature.chatroom.domain.mapper.toMessage
import com.mvorontsov.bonds.feature.chatroom.domain.model.Message
import com.mvorontsov.bonds.feature.chatroom.domain.repository.ChatRoomRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

internal class ObserveMessagesUseCase(
    private val repository: ChatRoomRepository,
    private val session: SessionStorage,
) {
    operator fun invoke(chatId: String): Flow<Message> {
        val username = session.username.orEmpty()
        return repository.observeMessages(chatId).map { it.toMessage(username) }
    }
}
