package com.mvorontsov.bonds.core.session

import com.russhwolf.settings.Settings

/**
 * Персист сессии на Multiplatform-Settings: JWT-токен и username.
 * Пишет `feature:auth` (после логина/логаута), читает `core:network`
 * (заголовок Authorization) и остальные фичи (текущий пользователь).
 */
class SessionStorage(private val settings: Settings) {

    var token: String?
        get() = settings.getStringOrNull(KEY_TOKEN)
        set(value) {
            if (value == null) settings.remove(KEY_TOKEN) else settings.putString(KEY_TOKEN, value)
        }

    var username: String?
        get() = settings.getStringOrNull(KEY_USERNAME)
        set(value) {
            if (value == null) settings.remove(KEY_USERNAME) else settings.putString(KEY_USERNAME, value)
        }

    /** Пользователь считается авторизованным, если есть и токен, и username. */
    val isLoggedIn: Boolean
        get() = !token.isNullOrBlank() && !username.isNullOrBlank()

    /** Сохранить сессию после успешного входа/регистрации. */
    fun save(token: String, username: String) {
        this.token = token
        this.username = username
    }

    /** Полностью очистить сессию (логаут). */
    fun clear() {
        settings.remove(KEY_TOKEN)
        settings.remove(KEY_USERNAME)
    }

    private companion object {
        const val KEY_TOKEN = "auth_token"
        const val KEY_USERNAME = "auth_username"
    }
}
