package com.mvorontsov.bonds.feature.chats.ui.list

/** События экрана списка чатов (UI → ViewModel). */
internal sealed interface ChatsEvent {
    data object Refresh : ChatsEvent
    data class OpenChat(val chatId: String, val chatName: String) : ChatsEvent
    data class DeleteChat(val chatId: String) : ChatsEvent
    data object CreateClicked : ChatsEvent
    data object DismissCreateDialog : ChatsEvent
    data class ConfirmCreate(val name: String, val isGroup: Boolean) : ChatsEvent
    data object ToggleLanguage : ChatsEvent
    data object Logout : ChatsEvent
}
