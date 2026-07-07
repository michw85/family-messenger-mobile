package com.mvorontsov.bonds.di

import io.github.aakira.napier.DebugAntilog
import io.github.aakira.napier.Napier
import org.koin.core.context.startKoin
import org.koin.dsl.KoinAppDeclaration

/**
 * Единая точка инициализации приложения для обеих платформ.
 *
 * Android: вызывается из [Application.onCreate] с `androidContext(...)` в [koinConfig].
 * iOS: вызывается из `iOSApp.init` (в Swift — `AppInitKt.doInitApp(koinConfig: nil)`).
 */
fun initApp(koinConfig: KoinAppDeclaration? = null) {
    Napier.base(DebugAntilog())
    startKoin {
        koinConfig?.invoke(this)
        modules(appModules)
    }
}
