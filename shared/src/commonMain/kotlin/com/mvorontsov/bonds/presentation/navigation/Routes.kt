package com.mvorontsov.bonds.presentation.navigation

import kotlinx.serialization.Serializable

/** Маршруты навигации (type-safe, через kotlinx.serialization). Централизованы в shared. */

@Serializable
data object LoginRoute

@Serializable
data object RegisterRoute

// Временный экран «после входа» (Фаза 2). В Фазе 3 заменится на список чатов.
@Serializable
data object HomeRoute
