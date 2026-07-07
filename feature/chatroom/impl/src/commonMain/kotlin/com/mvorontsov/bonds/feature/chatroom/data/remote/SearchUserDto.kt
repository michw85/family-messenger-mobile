package com.mvorontsov.bonds.feature.chatroom.data.remote

import kotlinx.serialization.Serializable

@Serializable
internal data class SearchUserDto(
    val id: Long,
    val username: String,
    val email: String = "",
    val avatarUrl: String? = null,
)
