package com.mvorontsov.bonds.feature.auth.data.remote

import kotlinx.serialization.Serializable

/** Тело запроса POST /auth/login. */
@Serializable
internal data class LoginRequestDto(
    val username: String,
    val password: String,
)
