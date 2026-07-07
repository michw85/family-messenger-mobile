package com.mvorontsov.bonds.di

import com.mvorontsov.bonds.core.localization.di.localizationModule
import com.mvorontsov.bonds.core.network.di.networkModule
import com.mvorontsov.bonds.core.session.di.sessionModule
import com.mvorontsov.bonds.feature.auth.di.authModule
import org.koin.core.module.Module
import org.koin.dsl.module

val appModule: Module = module {
    // Зависимости уровня приложения добавляются по мере появления
}

/**
 * Список всех Koin-модулей приложения. По мере добавления feature:*:impl
 * их модули регистрируются здесь.
 */
val appModules: List<Module> = listOf(
    appModule,
    // core
    sessionModule,
    networkModule,
    localizationModule,
    // feature
    authModule,
)
