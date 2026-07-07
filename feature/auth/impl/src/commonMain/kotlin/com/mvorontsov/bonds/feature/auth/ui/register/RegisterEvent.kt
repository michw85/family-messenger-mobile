package com.mvorontsov.bonds.feature.auth.ui.register

/** События экрана регистрации (UI → ViewModel). */
internal sealed interface RegisterEvent {
    data class UsernameChanged(val value: String) : RegisterEvent
    data class EmailChanged(val value: String) : RegisterEvent
    data class PasswordChanged(val value: String) : RegisterEvent
    data class ConfirmPasswordChanged(val value: String) : RegisterEvent
    data object Submit : RegisterEvent
    data object Back : RegisterEvent
}
