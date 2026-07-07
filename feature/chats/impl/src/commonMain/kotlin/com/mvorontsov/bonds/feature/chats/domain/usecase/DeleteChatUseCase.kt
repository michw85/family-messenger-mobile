package com.mvorontsov.bonds.feature.chats.domain.usecase

import com.mvorontsov.bonds.feature.chats.domain.repository.ChatsRepository

/** Удалить чат (бэкенд разрешает только создателю). */
internal class DeleteChatUseCase(
    private val repository: ChatsRepository,
) {
    suspend operator fun invoke(chatId: String) = repository.deleteChat(chatId)
}
