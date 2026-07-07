package com.mvorontsov.bonds.feature.chats.ui

import androidx.compose.runtime.Composable
import com.mvorontsov.bonds.feature.chats.api.ChatsComponent
import com.mvorontsov.bonds.feature.chats.ui.list.ChatsScreen

/** Реализация публичного входа в фичу: связывает экран со списком с контрактом [ChatsComponent]. */
internal class ChatsComponentImpl : ChatsComponent {

    @Composable
    override fun Chats(
        onOpenChat: (chatId: String, chatName: String) -> Unit,
        onLoggedOut: () -> Unit,
    ) {
        ChatsScreen(onOpenChat = onOpenChat, onLoggedOut = onLoggedOut)
    }
}
