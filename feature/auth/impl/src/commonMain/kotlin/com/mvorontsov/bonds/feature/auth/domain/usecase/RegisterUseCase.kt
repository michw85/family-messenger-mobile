package com.mvorontsov.bonds.feature.auth.domain.usecase

import com.mvorontsov.bonds.core.session.SessionStorage
import com.mvorontsov.bonds.feature.auth.domain.mapper.toAuthUser
import com.mvorontsov.bonds.feature.auth.domain.model.AuthUser
import com.mvorontsov.bonds.feature.auth.domain.repository.AuthRepository

/** Регистрация: дёргает репозиторий, сохраняет сессию, отдаёт доменную модель. */
internal class RegisterUseCase(
    private val repository: AuthRepository,
    private val session: SessionStorage,
) {
    suspend operator fun invoke(username: String, email: String, password: String): AuthUser {
        val response = repository.register(username, email, password)
        session.save(token = response.token, username = response.user.username)
        return response.user.toAuthUser()
    }
}
