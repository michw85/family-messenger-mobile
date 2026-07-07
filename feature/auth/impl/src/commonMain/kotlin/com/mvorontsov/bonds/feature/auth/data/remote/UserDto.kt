package com.mvorontsov.bonds.feature.auth.data.remote

import kotlinx.serialization.Serializable

/** Пользователь в ответе auth-эндпоинтов. */
@Serializable
internal data class UserDto(
    val id: Long = 0,
    val username: String,
    val email: String? = null,
    val avatarUrl: String? = null,
    val status: String? = null,
)
