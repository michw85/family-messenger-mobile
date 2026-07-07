package com.mvorontsov.bonds.feature.chatroom.ui.participants

internal sealed interface AddParticipantsEvent {
    data class QueryChanged(val value: String) : AddParticipantsEvent
    data class ToggleUser(val id: Long) : AddParticipantsEvent
    data object Confirm : AddParticipantsEvent
    data object Dismiss : AddParticipantsEvent
}
