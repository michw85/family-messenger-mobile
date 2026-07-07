package com.mvorontsov.bonds.feature.auth.data.remote

import kotlinx.serialization.Serializable

/** Ответ POST /auth/login и /auth/register: JWT-токен + пользователь. */
@Serializable
internal data class AuthResponseDto(
    val token: String,
    val user: UserDto,
)
