package com.mvorontsov.bonds.feature.auth.domain.model

/** Доменная модель пользователя для фичи auth (ровно то, что нужно этой фиче). */
internal data class AuthUser(
    val id: Long,
    val username: String,
    val email: String,
)
