package com.mvorontsov.bonds.core.session.di

import com.mvorontsov.bonds.core.session.SessionStorage
import com.russhwolf.settings.Settings
import org.koin.core.module.Module
import org.koin.dsl.module

val sessionModule: Module = module {
    single { SessionStorage(Settings()) }
}
