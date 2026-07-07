package com.mvorontsov.bonds.feature.auth.ui.login

/** Состояние экрана входа. */
internal data class LoginState(
    val username: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
)
