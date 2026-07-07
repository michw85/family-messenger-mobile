package com.mvorontsov.bonds.feature.chats.domain.usecase

import com.mvorontsov.bonds.core.session.SessionStorage

/** Выход из аккаунта: очищает сессию (токен + username). */
internal class LogoutUseCase(
    private val session: SessionStorage,
) {
    operator fun invoke() = session.clear()
}
