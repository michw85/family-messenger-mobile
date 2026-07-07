package com.mvorontsov.bonds.feature.chatroom.di

import com.mvorontsov.bonds.feature.chatroom.api.ChatRoomComponent
import com.mvorontsov.bonds.feature.chatroom.data.remote.ChatMessagesRemoteDataSource
import com.mvorontsov.bonds.feature.chatroom.data.remote.ChatSocketDataSource
import com.mvorontsov.bonds.feature.chatroom.data.remote.ParticipantsRemoteDataSource
import com.mvorontsov.bonds.feature.chatroom.data.repository.ChatRoomRepositoryImpl
import com.mvorontsov.bonds.feature.chatroom.data.repository.ParticipantsRepositoryImpl
import com.mvorontsov.bonds.feature.chatroom.domain.repository.ChatRoomRepository
import com.mvorontsov.bonds.feature.chatroom.domain.repository.ParticipantsRepository
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.AddParticipantsUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.ConnectChatUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.DisconnectChatUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.GetMessagesUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.ObserveMessagesUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.SearchUsersUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.SendTextMessageUseCase
import com.mvorontsov.bonds.feature.chatroom.ui.ChatRoomComponentImpl
import com.mvorontsov.bonds.feature.chatroom.ui.ChatRoomViewModel
import com.mvorontsov.bonds.feature.chatroom.ui.participants.AddParticipantsViewModel
import org.koin.core.module.Module
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val chatRoomModule: Module = module {
    single { ChatSocketDataSource(get(), get()) }
    factory { ChatMessagesRemoteDataSource(get()) }
    factory<ChatRoomRepository> { ChatRoomRepositoryImpl(get(), get()) }
    factory { ConnectChatUseCase(get()) }
    factory { DisconnectChatUseCase(get()) }
    factory { GetMessagesUseCase(get(), get()) }
    factory { ObserveMessagesUseCase(get(), get()) }
    factory { SendTextMessageUseCase(get()) }
    factory { ParticipantsRemoteDataSource(get()) }
    factory<ParticipantsRepository> { ParticipantsRepositoryImpl(get()) }
    factory { SearchUsersUseCase(get()) }
    factory { AddParticipantsUseCase(get()) }
    viewModel { (chatId: String) -> ChatRoomViewModel(chatId, get(), get(), get(), get()) }
    viewModel { (chatId: String) -> AddParticipantsViewModel(chatId, get(), get()) }
    single<ChatRoomComponent> { ChatRoomComponentImpl() }
}
