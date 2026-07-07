package com.mvorontsov.bonds.feature.chats.domain.usecase

import com.mvorontsov.bonds.feature.chats.domain.mapper.toChat
import com.mvorontsov.bonds.feature.chats.domain.model.Chat
import com.mvorontsov.bonds.feature.chats.domain.repository.ChatsRepository

/** Список чатов: тянет DTO из репозитория и маппит в доменные модели. */
internal class GetChatsUseCase(
    private val repository: ChatsRepository,
) {
    suspend operator fun invoke(): List<Chat> = repository.getChats().map { it.toChat() }
}
