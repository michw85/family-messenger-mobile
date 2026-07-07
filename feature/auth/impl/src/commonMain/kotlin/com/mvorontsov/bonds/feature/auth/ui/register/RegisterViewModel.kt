package com.mvorontsov.bonds.feature.auth.ui.register

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.error_email_invalid
import com.mvorontsov.bonds.core.localization.resources.error_fill_all_fields
import com.mvorontsov.bonds.core.localization.resources.error_password_too_short
import com.mvorontsov.bonds.core.localization.resources.error_passwords_mismatch
import com.mvorontsov.bonds.core.localization.resources.error_registration_failed
import com.mvorontsov.bonds.core.localization.resources.error_username_too_short
import com.mvorontsov.bonds.feature.auth.domain.usecase.RegisterUseCase
import io.github.aakira.napier.Napier
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.StringResource

internal class RegisterViewModel(
    private val register: RegisterUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(RegisterState())
    val state: StateFlow<RegisterState> = _state.asStateFlow()

    private val _effect = Channel<RegisterEffect>(Channel.BUFFERED)
    val effect: Flow<RegisterEffect> = _effect.receiveAsFlow()

    fun onEvent(event: RegisterEvent) {
        when (event) {
            is RegisterEvent.UsernameChanged -> _state.update { it.copy(username = event.value) }
            is RegisterEvent.EmailChanged -> _state.update { it.copy(email = event.value) }
            is RegisterEvent.PasswordChanged -> _state.update { it.copy(password = event.value) }
            is RegisterEvent.ConfirmPasswordChanged -> _state.update { it.copy(confirmPassword = event.value) }
            RegisterEvent.Back -> _effect.trySend(RegisterEffect.NavigateBack)
            RegisterEvent.Submit -> submit()
        }
    }

    private fun submit() {
        val current = _state.value
        val validationError = validate(current)
        if (validationError != null) {
            _effect.trySend(RegisterEffect.ShowError(validationError))
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                register(current.username.trim(), current.email.trim(), current.password)
                _effect.send(RegisterEffect.Registered)
            } catch (e: Exception) {
                Napier.e("Ошибка регистрации", e)
                _effect.send(RegisterEffect.ShowError(Res.string.error_registration_failed))
            } finally {
                _state.update { it.copy(isLoading = false) }
            }
        }
    }

    private fun validate(state: RegisterState): StringResource? = when {
        state.username.isBlank() || state.email.isBlank() ||
            state.password.isBlank() || state.confirmPassword.isBlank() -> Res.string.error_fill_all_fields
        state.username.trim().length < MIN_USERNAME -> Res.string.error_username_too_short
        !EMAIL_REGEX.matches(state.email.trim()) -> Res.string.error_email_invalid
        state.password.length < MIN_PASSWORD -> Res.string.error_password_too_short
        state.password != state.confirmPassword -> Res.string.error_passwords_mismatch
        else -> null
    }

    private companion object {
        const val MIN_USERNAME = 3
        const val MIN_PASSWORD = 6
        val EMAIL_REGEX = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
    }
}
