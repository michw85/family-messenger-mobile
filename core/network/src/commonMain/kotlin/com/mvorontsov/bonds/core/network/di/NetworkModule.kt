package com.mvorontsov.bonds.core.network.di

import com.mvorontsov.bonds.core.network.createHttpClient
import org.koin.core.module.Module
import org.koin.dsl.module

val networkModule: Module = module {
    single { createHttpClient(get()) }
}
