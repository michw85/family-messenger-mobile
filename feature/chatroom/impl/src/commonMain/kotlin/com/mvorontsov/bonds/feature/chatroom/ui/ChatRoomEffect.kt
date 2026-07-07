package com.mvorontsov.bonds.feature.chatroom.ui

import org.jetbrains.compose.resources.StringResource

internal sealed interface ChatRoomEffect {
    data object NavigateBack : ChatRoomEffect
    data class ShowError(val message: StringResource) : ChatRoomEffect
}
