package com.mvorontsov.bonds.feature.chatroom.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

/** История сообщений через REST. */
internal class ChatMessagesRemoteDataSource(private val client: HttpClient) {

    suspend fun history(chatId: String, page: Int, size: Int): List<MessageDto> =
        client.get("chats/$chatId/messages") {
            parameter("page", page)
            parameter("size", size)
        }.body()
}
