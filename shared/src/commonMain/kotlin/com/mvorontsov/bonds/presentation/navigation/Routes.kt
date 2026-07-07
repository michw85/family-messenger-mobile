package com.mvorontsov.bonds.presentation.navigation

import kotlinx.serialization.Serializable

/** Маршруты навигации (type-safe, через kotlinx.serialization). */

// Временный корневой маршрут-заглушка (Фаза 0). Будет заменён на Login/Chats.
@Serializable
data object HomeRoute
