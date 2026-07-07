package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.runtime.Composable
import com.mvorontsov.bonds.feature.chatroom.api.ChatRoomComponent

internal class ChatRoomComponentImpl : ChatRoomComponent {

    @Composable
    override fun ChatRoom(chatId: String, chatName: String, onBack: () -> Unit) {
        ChatRoomScreen(chatId = chatId, chatName = chatName, onBack = onBack)
    }
}
