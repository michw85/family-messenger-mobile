package com.mvorontsov.bonds.feature.auth.ui.register

import org.jetbrains.compose.resources.StringResource

/** Разовые эффекты экрана регистрации (ViewModel → UI). */
internal sealed interface RegisterEffect {
    data object Registered : RegisterEffect
    data object NavigateBack : RegisterEffect
    data class ShowError(val message: StringResource) : RegisterEffect
}
