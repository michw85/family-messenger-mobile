package com.mvorontsov.bonds.feature.push.data

import com.mvorontsov.bonds.feature.push.api.PushRegistrar
import com.mvorontsov.bonds.feature.push.domain.usecase.RegisterFcmTokenUseCase
import io.github.aakira.napier.Napier

internal class PushRegistrarImpl(
    private val registerToken: RegisterFcmTokenUseCase,
) : PushRegistrar {
    override suspend fun register() {
        runCatching { registerToken() }
            .onFailure { Napier.e("Ошибка регистрации push-токена", it) }
    }
}
