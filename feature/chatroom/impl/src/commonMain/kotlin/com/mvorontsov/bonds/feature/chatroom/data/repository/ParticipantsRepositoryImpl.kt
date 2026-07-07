package com.mvorontsov.bonds.feature.chatroom.data.repository

import com.mvorontsov.bonds.feature.chatroom.data.remote.ParticipantsRemoteDataSource
import com.mvorontsov.bonds.feature.chatroom.data.remote.SearchUserDto
import com.mvorontsov.bonds.feature.chatroom.domain.repository.ParticipantsRepository

internal class ParticipantsRepositoryImpl(
    private val remote: ParticipantsRemoteDataSource,
) : ParticipantsRepository {

    override suspend fun searchUsers(query: String): List<SearchUserDto> =
        remote.searchUsers(query)

    override suspend fun addParticipants(chatId: String, userIds: List<Long>) =
        remote.addParticipants(chatId, userIds)
}
