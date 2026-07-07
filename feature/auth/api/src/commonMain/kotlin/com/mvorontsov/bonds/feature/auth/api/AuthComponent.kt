package com.mvorontsov.bonds.feature.auth.api

import androidx.compose.runtime.Composable

/**
 * Публичный вход в фичу авторизации — единственная абстракция, которую фича
 * отдаёт наружу. `impl` реализует, `shared` берёт через DI и встраивает экраны
 * в NavHost, не зная о внутренностях фичи. Навигация наружу — через колбэки.
 */
interface AuthComponent {

    @Composable
    fun Login(onLoggedIn: () -> Unit, onOpenRegister: () -> Unit)

    @Composable
    fun Register(onRegistered: () -> Unit, onBack: () -> Unit)
}
