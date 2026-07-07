package com.mvorontsov.bonds.core.localization.di

import com.mvorontsov.bonds.core.localization.LocaleController
import com.mvorontsov.bonds.core.localization.domain.ObserveAppLanguageUseCase
import com.mvorontsov.bonds.core.localization.domain.SetAppLanguageUseCase
import com.russhwolf.settings.Settings
import org.koin.core.module.Module
import org.koin.dsl.module

val localizationModule: Module = module {
    single { LocaleController(Settings()) }
    factory { ObserveAppLanguageUseCase(get()) }
    factory { SetAppLanguageUseCase(get()) }
}
