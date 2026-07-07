package com.mvorontsov.bonds.feature.chats.data.repository

import com.mvorontsov.bonds.feature.chats.data.remote.ChatDto
import com.mvorontsov.bonds.feature.chats.data.remote.ChatsRemoteDataSource
import com.mvorontsov.bonds.feature.chats.domain.repository.ChatsRepository

internal class ChatsRepositoryImpl(
    private val remote: ChatsRemoteDataSource,
) : ChatsRepository {

    override suspend fun getChats(): List<ChatDto> = remote.fetchChats()

    override suspend fun createChat(name: String, type: String): ChatDto =
        remote.createChat(name, type)

    override suspend fun deleteChat(chatId: String) = remote.deleteChat(chatId)
}
