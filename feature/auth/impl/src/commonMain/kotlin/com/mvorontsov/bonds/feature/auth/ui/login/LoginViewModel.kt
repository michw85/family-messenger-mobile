package com.mvorontsov.bonds.feature.auth.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.error_fill_all_fields
import com.mvorontsov.bonds.core.localization.resources.error_invalid_credentials
import com.mvorontsov.bonds.feature.auth.domain.usecase.LoginUseCase
import io.github.aakira.napier.Napier
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

internal class LoginViewModel(
    private val login: LoginUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()

    private val _effect = Channel<LoginEffect>(Channel.BUFFERED)
    val effect: Flow<LoginEffect> = _effect.receiveAsFlow()

    fun onEvent(event: LoginEvent) {
        when (event) {
            is LoginEvent.UsernameChanged -> _state.update { it.copy(username = event.value) }
            is LoginEvent.PasswordChanged -> _state.update { it.copy(password = event.value) }
            LoginEvent.OpenRegister -> _effect.trySend(LoginEffect.NavigateToRegister)
            LoginEvent.Submit -> submit()
        }
    }

    private fun submit() {
        val current = _state.value
        if (current.username.isBlank() || current.password.isBlank()) {
            _effect.trySend(LoginEffect.ShowError(Res.string.error_fill_all_fields))
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                login(current.username.trim(), current.password)
                _effect.send(LoginEffect.LoggedIn)
            } catch (e: Exception) {
                Napier.e("Ошибка входа", e)
                _effect.send(LoginEffect.ShowError(Res.string.error_invalid_credentials))
            } finally {
                _state.update { it.copy(isLoading = false) }
            }
        }
    }
}
