package com.mvorontsov.bonds.feature.push.api

/** Регистрация push-токена устройства на бэкенде. Вызывается после входа. */
interface PushRegistrar {
    suspend fun register()
}
