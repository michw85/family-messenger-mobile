package com.mvorontsov.bonds.di

import org.koin.core.module.Module
import org.koin.dsl.module

val appModule: Module = module {
    // Зависимости уровня приложения добавляются по мере появления
}

/**
 * Список всех Koin-модулей приложения. По мере добавления core/feature-модулей
 * их модули регистрируются здесь.
 */
val appModules: List<Module> = listOf(
    appModule,
)
