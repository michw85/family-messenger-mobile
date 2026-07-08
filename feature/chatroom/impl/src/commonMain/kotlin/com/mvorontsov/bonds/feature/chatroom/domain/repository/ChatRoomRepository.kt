package com.mvorontsov.bonds.feature.chatroom.domain.repository

import com.mvorontsov.bonds.feature.chatroom.data.remote.MessageDto
import kotlinx.coroutines.flow.Flow

internal interface ChatRoomRepository {
    suspend fun history(chatId: String, page: Int, size: Int): List<MessageDto>
    suspend fun connect(force: Boolean = false)
    fun observeMessages(chatId: String): Flow<MessageDto>
    suspend fun sendText(chatId: String, content: String)
    suspend fun sendImage(chatId: String, bytes: ByteArray, filename: String)
    suspend fun sendVoice(chatId: String, bytes: ByteArray, filename: String)
    fun dispose()
}
