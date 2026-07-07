package com.mvorontsov.bonds.feature.chats.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody

/** Доступ к эндпоинтам чатов. Оперирует DTO. */
internal class ChatsRemoteDataSource(private val client: HttpClient) {

    suspend fun fetchChats(): List<ChatDto> =
        client.get("chats").body()

    suspend fun createChat(name: String, type: String): ChatDto =
        client.post("chats") { setBody(CreateChatRequestDto(name, type)) }.body()

    suspend fun deleteChat(chatId: String) {
        client.delete("chats/$chatId")
    }
}
