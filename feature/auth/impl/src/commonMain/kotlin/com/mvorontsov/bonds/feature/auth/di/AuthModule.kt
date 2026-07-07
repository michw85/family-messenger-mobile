package com.mvorontsov.bonds.feature.auth.di

import com.mvorontsov.bonds.feature.auth.api.AuthComponent
import com.mvorontsov.bonds.feature.auth.data.remote.AuthRemoteDataSource
import com.mvorontsov.bonds.feature.auth.data.repository.AuthRepositoryImpl
import com.mvorontsov.bonds.feature.auth.domain.repository.AuthRepository
import com.mvorontsov.bonds.feature.auth.domain.usecase.LoginUseCase
import com.mvorontsov.bonds.feature.auth.domain.usecase.RegisterUseCase
import com.mvorontsov.bonds.feature.auth.ui.AuthComponentImpl
import com.mvorontsov.bonds.feature.auth.ui.login.LoginViewModel
import com.mvorontsov.bonds.feature.auth.ui.register.RegisterViewModel
import org.koin.core.module.Module
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

/** Koin-модуль фичи auth. Регистрируется в shared/AppModules. */
val authModule: Module = module {
    factory { AuthRemoteDataSource(get()) }
    factory<AuthRepository> { AuthRepositoryImpl(get()) }
    factory { LoginUseCase(get(), get()) }
    factory { RegisterUseCase(get(), get()) }
    viewModel { LoginViewModel(get()) }
    viewModel { RegisterViewModel(get()) }
    single<AuthComponent> { AuthComponentImpl() }
}
