package com.mvorontsov.bonds.feature.auth.ui.login

import org.jetbrains.compose.resources.StringResource

/** Разовые эффекты экрана входа (ViewModel → UI). */
internal sealed interface LoginEffect {
    data object LoggedIn : LoginEffect
    data object NavigateToRegister : LoginEffect
    data class ShowError(val message: StringResource) : LoginEffect
}
