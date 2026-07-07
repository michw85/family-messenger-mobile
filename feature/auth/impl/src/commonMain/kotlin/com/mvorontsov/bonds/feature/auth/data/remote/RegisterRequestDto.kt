package com.mvorontsov.bonds.feature.auth.data.remote

import kotlinx.serialization.Serializable

/** Тело запроса POST /auth/register. */
@Serializable
internal data class RegisterRequestDto(
    val username: String,
    val email: String,
    val password: String,
)
