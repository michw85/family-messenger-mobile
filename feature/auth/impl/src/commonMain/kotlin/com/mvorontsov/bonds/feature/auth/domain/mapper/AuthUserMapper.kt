package com.mvorontsov.bonds.feature.auth.domain.mapper

import com.mvorontsov.bonds.feature.auth.data.remote.UserDto
import com.mvorontsov.bonds.feature.auth.domain.model.AuthUser

/** Маппинг DTO → доменная модель (вызывается из UseCase). */
internal fun UserDto.toAuthUser(): AuthUser = AuthUser(
    id = id,
    username = username,
    email = email.orEmpty(),
)
