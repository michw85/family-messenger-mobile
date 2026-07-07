package com.mvorontsov.bonds.feature.auth.data.repository

import com.mvorontsov.bonds.feature.auth.data.remote.AuthRemoteDataSource
import com.mvorontsov.bonds.feature.auth.data.remote.AuthResponseDto
import com.mvorontsov.bonds.feature.auth.domain.repository.AuthRepository

internal class AuthRepositoryImpl(
    private val remote: AuthRemoteDataSource,
) : AuthRepository {

    override suspend fun login(username: String, password: String): AuthResponseDto =
        remote.login(username, password)

    override suspend fun register(username: String, email: String, password: String): AuthResponseDto =
        remote.register(username, email, password)
}
