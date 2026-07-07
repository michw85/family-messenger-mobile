package com.mvorontsov.bonds.feature.chatroom.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody

internal class ParticipantsRemoteDataSource(private val client: HttpClient) {

    suspend fun searchUsers(query: String): List<SearchUserDto> =
        client.get("users/search") { parameter("query", query) }.body()

    suspend fun addParticipants(chatId: String, userIds: List<Long>) {
        client.post("chats/$chatId/participants") { setBody(userIds) }
    }
}
