package com.mvorontsov.bonds.feature.chats.ui.list

import com.mvorontsov.bonds.feature.chats.domain.model.Chat

/** Состояние экрана списка чатов. */
internal data class ChatsState(
    val chats: List<Chat> = emptyList(),
    val username: String = "",
    val language: String? = null,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val showCreateDialog: Boolean = false,
)
