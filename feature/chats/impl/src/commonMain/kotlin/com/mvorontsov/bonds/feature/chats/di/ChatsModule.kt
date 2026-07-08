package com.mvorontsov.bonds.feature.chats.di

import com.mvorontsov.bonds.feature.chats.api.ChatsComponent
import com.mvorontsov.bonds.feature.chats.data.remote.ChatsRemoteDataSource
import com.mvorontsov.bonds.feature.chats.data.repository.ChatsRepositoryImpl
import com.mvorontsov.bonds.feature.chats.domain.repository.ChatsRepository
import com.mvorontsov.bonds.feature.chats.domain.usecase.CreateChatUseCase
import com.mvorontsov.bonds.feature.chats.domain.usecase.DeleteChatUseCase
import com.mvorontsov.bonds.feature.chats.domain.usecase.GetChatsUseCase
import com.mvorontsov.bonds.feature.chats.domain.usecase.LogoutUseCase
import com.mvorontsov.bonds.feature.chats.ui.ChatsComponentImpl
import com.mvorontsov.bonds.feature.chats.ui.list.ChatsViewModel
import org.koin.core.module.Module
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

/** Koin-модуль фичи chats. Регистрируется в shared/AppModules. */
val chatsModule: Module = module {
    factory { ChatsRemoteDataSource(get()) }
    factory<ChatsRepository> { ChatsRepositoryImpl(get()) }
    factory { GetChatsUseCase(get()) }
    factory { CreateChatUseCase(get()) }
    factory { DeleteChatUseCase(get()) }
    factory { LogoutUseCase(get()) }
    viewModel { ChatsViewModel(get(), get(), get(), get(), get(), get(), get(), get()) }
    single<ChatsComponent> { ChatsComponentImpl() }
}
