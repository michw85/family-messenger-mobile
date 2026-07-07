package com.mvorontsov.bonds.feature.auth.ui.login

/** События экрана входа (UI → ViewModel). */
internal sealed interface LoginEvent {
    data class UsernameChanged(val value: String) : LoginEvent
    data class PasswordChanged(val value: String) : LoginEvent
    data object Submit : LoginEvent
    data object OpenRegister : LoginEvent
}
