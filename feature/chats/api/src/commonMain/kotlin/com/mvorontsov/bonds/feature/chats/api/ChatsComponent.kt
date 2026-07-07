package com.mvorontsov.bonds.feature.chats.api

import androidx.compose.runtime.Composable

/**
 * Публичный вход в фичу списка чатов. `impl` реализует, `shared` берёт через DI.
 * Навигация наружу (открыть чат / разлогиниться) — через колбэки.
 */
interface ChatsComponent {

    @Composable
    fun Chats(
        onOpenChat: (chatId: String, chatName: String) -> Unit,
        onLoggedOut: () -> Unit,
    )
}
