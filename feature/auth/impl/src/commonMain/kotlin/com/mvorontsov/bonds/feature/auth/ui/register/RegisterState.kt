package com.mvorontsov.bonds.feature.auth.ui.register

/** Состояние экрана регистрации. */
internal data class RegisterState(
    val username: String = "",
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
)
