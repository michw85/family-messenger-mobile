package com.mvorontsov.bonds.feature.chatroom.ui.participants

import com.mvorontsov.bonds.feature.chatroom.domain.model.SearchUser

internal data class AddParticipantsState(
    val query: String = "",
    val results: List<SearchUser> = emptyList(),
    val selectedIds: Set<Long> = emptySet(),
    val isSearching: Boolean = false,
    val isAdding: Boolean = false,
)
