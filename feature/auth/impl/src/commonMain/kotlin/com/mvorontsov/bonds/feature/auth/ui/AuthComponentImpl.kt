package com.mvorontsov.bonds.feature.auth.ui

import androidx.compose.runtime.Composable
import com.mvorontsov.bonds.feature.auth.api.AuthComponent
import com.mvorontsov.bonds.feature.auth.ui.login.LoginScreen
import com.mvorontsov.bonds.feature.auth.ui.register.RegisterScreen

/** Реализация публичного входа в фичу: связывает экраны с контрактом [AuthComponent]. */
internal class AuthComponentImpl : AuthComponent {

    @Composable
    override fun Login(onLoggedIn: () -> Unit, onOpenRegister: () -> Unit) {
        LoginScreen(onLoggedIn = onLoggedIn, onOpenRegister = onOpenRegister)
    }

    @Composable
    override fun Register(onRegistered: () -> Unit, onBack: () -> Unit) {
        RegisterScreen(onRegistered = onRegistered, onBack = onBack)
    }
}
