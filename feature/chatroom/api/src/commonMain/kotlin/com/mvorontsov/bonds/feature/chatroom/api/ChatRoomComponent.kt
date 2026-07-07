package com.mvorontsov.bonds.feature.chatroom.api

import androidx.compose.runtime.Composable

interface ChatRoomComponent {

    @Composable
    fun ChatRoom(chatId: String, chatName: String, onBack: () -> Unit)
}
