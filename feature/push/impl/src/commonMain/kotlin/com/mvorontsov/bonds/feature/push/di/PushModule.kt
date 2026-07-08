package com.mvorontsov.bonds.feature.push.di

import com.mvorontsov.bonds.feature.push.api.PushRegistrar
import com.mvorontsov.bonds.feature.push.data.DeviceIdStorage
import com.mvorontsov.bonds.feature.push.data.FcmTokenProvider
import com.mvorontsov.bonds.feature.push.data.PushRegistrarImpl
import com.mvorontsov.bonds.feature.push.data.remote.ExpoPushTokenDataSource
import com.mvorontsov.bonds.feature.push.data.remote.FcmRemoteDataSource
import com.mvorontsov.bonds.feature.push.data.remote.createExpoHttpClient
import com.mvorontsov.bonds.feature.push.domain.usecase.RegisterFcmTokenUseCase
import com.russhwolf.settings.Settings
import org.koin.core.module.Module
import org.koin.dsl.module

val pushModule: Module = module {
    single { Settings() }
    factory { DeviceIdStorage(get()) }
    factory { FcmTokenProvider() }
    single { createExpoHttpClient() }
    factory { ExpoPushTokenDataSource(get()) }
    factory { FcmRemoteDataSource(get()) }
    factory { RegisterFcmTokenUseCase(get(), get(), get(), get()) }
    single<PushRegistrar> { PushRegistrarImpl(get()) }
}
