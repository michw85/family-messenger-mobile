package com.mvorontsov.bonds.feature.auth.domain.repository

import com.mvorontsov.bonds.feature.auth.data.remote.AuthResponseDto

/** Репозиторий авторизации. Оперирует DTO; маппинг в доменную модель — в UseCase. */
internal interface AuthRepository {
    suspend fun login(username: String, password: String): AuthResponseDto
    suspend fun register(username: String, email: String, password: String): AuthResponseDto
}
