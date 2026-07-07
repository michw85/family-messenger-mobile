package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.error_load_messages
import com.mvorontsov.bonds.core.localization.resources.error_send_message
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.ConnectChatUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.DisconnectChatUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.GetMessagesUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.ObserveMessagesUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.SendTextMessageUseCase
import io.github.aakira.napier.Napier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
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

internal class ChatRoomViewModel(
    private val chatId: String,
    private val connect: ConnectChatUseCase,
    private val disconnect: DisconnectChatUseCase,
    private val getMessages: GetMessagesUseCase,
    private val observeMessages: ObserveMessagesUseCase,
    private val sendText: SendTextMessageUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(ChatRoomState())
    val state: StateFlow<ChatRoomState> = _state.asStateFlow()

    private val _effect = Channel<ChatRoomEffect>(Channel.BUFFERED)
    val effect: Flow<ChatRoomEffect> = _effect.receiveAsFlow()

    init {
        start()
    }

    private fun start() {
        viewModelScope.launch {
            try {
                connect()
                val history = getMessages(chatId)
                _state.update { it.copy(messages = history, isLoading = false) }
                observeMessages(chatId)
                    .onEach { msg -> _state.update { it.copy(messages = it.messages + msg) } }
                    .launchIn(viewModelScope)
            } catch (e: Exception) {
                Napier.e("Ошибка чата", e)
                _state.update { it.copy(isLoading = false) }
                _effect.send(ChatRoomEffect.ShowError(Res.string.error_load_messages))
            }
        }
    }

    fun onEvent(event: ChatRoomEvent) {
        when (event) {
            is ChatRoomEvent.InputChanged -> _state.update { it.copy(input = event.value) }
            ChatRoomEvent.SendText -> send()
            ChatRoomEvent.Back -> _effect.trySend(ChatRoomEffect.NavigateBack)
        }
    }

    private fun send() {
        val text = _state.value.input.trim()
        if (text.isEmpty()) return
        _state.update { it.copy(input = "") }
        viewModelScope.launch {
            try {
                sendText(chatId, text)
            } catch (e: Exception) {
                Napier.e("Ошибка отправки", e)
                _effect.send(ChatRoomEffect.ShowError(Res.string.error_send_message))
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        CoroutineScope(Dispatchers.Default).launch { runCatching { disconnect() } }
    }
}
