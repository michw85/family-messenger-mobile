package com.mvorontsov.bonds.feature.chats.domain.repository

import com.mvorontsov.bonds.feature.chats.data.remote.ChatDto

/** Репозиторий чатов. Оперирует DTO; маппинг в доменную модель — в UseCase. */
internal interface ChatsRepository {
    suspend fun getChats(): List<ChatDto>
    suspend fun createChat(name: String, type: String): ChatDto
    suspend fun deleteChat(chatId: String)
}
