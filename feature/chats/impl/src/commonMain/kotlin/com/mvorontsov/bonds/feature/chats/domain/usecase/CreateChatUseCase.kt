package com.mvorontsov.bonds.feature.chats.domain.usecase

import com.mvorontsov.bonds.feature.chats.domain.repository.ChatsRepository

/** Создать чат. Личный чат бэкенд ждёт с типом "FAMILY", групповой — "GROUP". */
internal class CreateChatUseCase(
    private val repository: ChatsRepository,
) {
    suspend operator fun invoke(name: String, isGroup: Boolean) {
        val type = if (isGroup) "GROUP" else "FAMILY"
        repository.createChat(name.trim(), type)
    }
}
