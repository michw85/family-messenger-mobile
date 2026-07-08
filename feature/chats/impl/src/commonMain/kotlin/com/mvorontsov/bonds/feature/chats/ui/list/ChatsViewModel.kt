package com.mvorontsov.bonds.feature.chats.ui.list

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mvorontsov.bonds.core.localization.domain.ObserveAppLanguageUseCase
import com.mvorontsov.bonds.core.localization.domain.SetAppLanguageUseCase
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.error_create_chat
import com.mvorontsov.bonds.core.localization.resources.error_delete_chat
import com.mvorontsov.bonds.core.localization.resources.error_load_chats
import com.mvorontsov.bonds.core.session.SessionStorage
import com.mvorontsov.bonds.feature.chats.domain.usecase.CreateChatUseCase
import com.mvorontsov.bonds.feature.chats.domain.usecase.DeleteChatUseCase
import com.mvorontsov.bonds.feature.chats.domain.usecase.GetChatsUseCase
import com.mvorontsov.bonds.feature.chats.domain.usecase.LogoutUseCase
import com.mvorontsov.bonds.feature.push.api.PushRegistrar
import io.github.aakira.napier.Napier
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

internal class ChatsViewModel(
    private val getChats: GetChatsUseCase,
    private val createChat: CreateChatUseCase,
    private val deleteChat: DeleteChatUseCase,
    private val logout: LogoutUseCase,
    observeLanguage: ObserveAppLanguageUseCase,
    private val setLanguage: SetAppLanguageUseCase,
    session: SessionStorage,
    private val pushRegistrar: PushRegistrar,
) : ViewModel() {

    private val _state = MutableStateFlow(ChatsState(username = session.username.orEmpty()))
    val state: StateFlow<ChatsState> = _state.asStateFlow()

    private val _effect = Channel<ChatsEffect>(Channel.BUFFERED)
    val effect: Flow<ChatsEffect> = _effect.receiveAsFlow()

    init {
        observeLanguage()
            .onEach { lang -> _state.update { it.copy(language = lang) } }
            .launchIn(viewModelScope)
        loadChats(initial = true)
        viewModelScope.launch { pushRegistrar.register() }
    }

    fun onEvent(event: ChatsEvent) {
        when (event) {
            ChatsEvent.Refresh -> loadChats(initial = false)
            is ChatsEvent.OpenChat -> _effect.trySend(ChatsEffect.OpenChat(event.chatId, event.chatName))
            is ChatsEvent.DeleteChat -> delete(event.chatId)
            ChatsEvent.CreateClicked -> _state.update { it.copy(showCreateDialog = true) }
            ChatsEvent.DismissCreateDialog -> _state.update { it.copy(showCreateDialog = false) }
            is ChatsEvent.ConfirmCreate -> create(event.name, event.isGroup)
            ChatsEvent.ToggleLanguage -> setLanguage(if (_state.value.language == "ru") "en" else "ru")
            ChatsEvent.Logout -> {
                logout()
                _effect.trySend(ChatsEffect.LoggedOut)
            }
        }
    }

    private fun loadChats(initial: Boolean) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = initial && it.chats.isEmpty(), isRefreshing = !initial) }
            try {
                val chats = getChats()
                _state.update { it.copy(chats = chats, isLoading = false, isRefreshing = false) }
            } catch (e: Exception) {
                Napier.e("Ошибка загрузки чатов", e)
                _state.update { it.copy(isLoading = false, isRefreshing = false) }
                _effect.send(ChatsEffect.ShowError(Res.string.error_load_chats))
            }
        }
    }

    private fun create(name: String, isGroup: Boolean) {
        _state.update { it.copy(showCreateDialog = false) }
        viewModelScope.launch {
            try {
                createChat(name, isGroup)
                loadChats(initial = false)
            } catch (e: Exception) {
                Napier.e("Ошибка создания чата", e)
                _effect.send(ChatsEffect.ShowError(Res.string.error_create_chat))
            }
        }
    }

    private fun delete(chatId: String) {
        viewModelScope.launch {
            try {
                deleteChat(chatId)
                loadChats(initial = false)
            } catch (e: Exception) {
                Napier.e("Ошибка удаления чата", e)
                _effect.send(ChatsEffect.ShowError(Res.string.error_delete_chat))
            }
        }
    }
}
