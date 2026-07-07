package com.mvorontsov.bonds.presentation.navigation

import kotlinx.serialization.Serializable

/** Маршруты навигации (type-safe, через kotlinx.serialization). Централизованы в shared. */

@Serializable
data object LoginRoute

@Serializable
data object RegisterRoute

@Serializable
data object ChatsRoute

/** Экран чата. chatId/chatName — примитивы (кросс-фичевая навигация без общих типов). */
@Serializable
data class ChatRoomRoute(val chatId: String, val chatName: String)
