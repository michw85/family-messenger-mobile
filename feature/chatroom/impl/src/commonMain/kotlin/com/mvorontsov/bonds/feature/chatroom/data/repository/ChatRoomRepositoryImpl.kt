package com.mvorontsov.bonds.feature.chatroom.data.repository

import com.mvorontsov.bonds.feature.chatroom.data.remote.ChatMessagesRemoteDataSource
import com.mvorontsov.bonds.feature.chatroom.data.remote.ChatSocketDataSource
import com.mvorontsov.bonds.feature.chatroom.data.remote.MessageDto
import com.mvorontsov.bonds.feature.chatroom.data.remote.SendMessageDto
import com.mvorontsov.bonds.feature.chatroom.domain.repository.ChatRoomRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

internal class ChatRoomRepositoryImpl(
    private val rest: ChatMessagesRemoteDataSource,
    private val socket: ChatSocketDataSource,
) : ChatRoomRepository {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    override suspend fun history(chatId: String, page: Int, size: Int): List<MessageDto> =
        rest.history(chatId, page, size)

    override suspend fun connect() = socket.connect()

    override fun observeMessages(chatId: String): Flow<MessageDto> = flow {
        emitAll(socket.subscribe(chatId).map { json.decodeFromString<MessageDto>(it) })
    }

    override suspend fun sendText(chatId: String, content: String) {
        socket.send(chatId, json.encodeToString(SendMessageDto(content, "TEXT")))
    }

    override suspend fun disconnect() = socket.disconnect()
}
