package com.mvorontsov.bonds.feature.chatroom.ui

internal sealed interface ChatRoomEvent {
    data class InputChanged(val value: String) : ChatRoomEvent
    data object SendText : ChatRoomEvent
    class SendImages(val images: List<ByteArray>) : ChatRoomEvent
    class SendVoice(val bytes: ByteArray) : ChatRoomEvent
    data object Back : ChatRoomEvent
}
