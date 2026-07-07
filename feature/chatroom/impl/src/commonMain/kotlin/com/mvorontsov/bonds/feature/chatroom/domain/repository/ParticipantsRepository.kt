package com.mvorontsov.bonds.feature.chatroom.domain.repository

import com.mvorontsov.bonds.feature.chatroom.data.remote.SearchUserDto

internal interface ParticipantsRepository {
    suspend fun searchUsers(query: String): List<SearchUserDto>
    suspend fun addParticipants(chatId: String, userIds: List<Long>)
}
