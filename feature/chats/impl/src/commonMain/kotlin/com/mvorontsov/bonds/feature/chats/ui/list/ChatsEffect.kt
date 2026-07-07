package com.mvorontsov.bonds.feature.chats.ui.list

import org.jetbrains.compose.resources.StringResource

/** Разовые эффекты экрана списка чатов (ViewModel → UI). */
internal sealed interface ChatsEffect {
    data class OpenChat(val chatId: String, val chatName: String) : ChatsEffect
    data object LoggedOut : ChatsEffect
    data class ShowError(val message: StringResource) : ChatsEffect
}
