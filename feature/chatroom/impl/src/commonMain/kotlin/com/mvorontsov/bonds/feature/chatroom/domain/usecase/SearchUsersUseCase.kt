package com.mvorontsov.bonds.feature.chatroom.domain.usecase

import com.mvorontsov.bonds.feature.chatroom.domain.mapper.toSearchUser
import com.mvorontsov.bonds.feature.chatroom.domain.model.SearchUser
import com.mvorontsov.bonds.feature.chatroom.domain.repository.ParticipantsRepository

internal class SearchUsersUseCase(private val repository: ParticipantsRepository) {
    suspend operator fun invoke(query: String): List<SearchUser> =
        repository.searchUsers(query.trim()).map { it.toSearchUser() }
}
