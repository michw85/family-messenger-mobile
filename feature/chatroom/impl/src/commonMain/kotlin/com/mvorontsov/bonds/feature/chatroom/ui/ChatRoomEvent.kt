package com.mvorontsov.bonds.feature.chatroom.ui

internal sealed interface ChatRoomEvent {
    data class InputChanged(val value: String) : ChatRoomEvent
    data object SendText : ChatRoomEvent
    data object Back : ChatRoomEvent
}
