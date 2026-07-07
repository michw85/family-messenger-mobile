package com.mvorontsov.bonds.feature.chatroom.ui.participants

import org.jetbrains.compose.resources.StringResource

internal sealed interface AddParticipantsEffect {
    data object Added : AddParticipantsEffect
    data object Dismissed : AddParticipantsEffect
    data class ShowError(val message: StringResource) : AddParticipantsEffect
}
