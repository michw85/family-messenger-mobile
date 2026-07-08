package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.error_load_messages
import com.mvorontsov.bonds.core.localization.resources.error_send_message
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.ConnectChatUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.GetMessagesUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.ObserveMessagesUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.SendImageUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.SendTextMessageUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.SendVoiceUseCase
import io.github.aakira.napier.Napier
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.retryWhen
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

internal class ChatRoomViewModel(
    private val chatId: String,
    private val connect: ConnectChatUseCase,
    private val getMessages: GetMessagesUseCase,
    private val observeMessages: ObserveMessagesUseCase,
    private val sendText: SendTextMessageUseCase,
    private val sendImage: SendImageUseCase,
    private val sendVoice: SendVoiceUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(ChatRoomState())
    val state: StateFlow<ChatRoomState> = _state.asStateFlow()

    private val _effect = Channel<ChatRoomEffect>(Channel.BUFFERED)
    val effect: Flow<ChatRoomEffect> = _effect.receiveAsFlow()

    init {
        loadHistory()
        observeLive()
    }

    private fun loadHistory() {
        viewModelScope.launch {
            try {
                connect()
                val history = getMessages(chatId)
                _state.update { it.copy(messages = history, isLoading = false) }
            } catch (e: Exception) {
                Napier.e("Ошибка загрузки истории", e)
                _state.update { it.copy(isLoading = false) }
                _effect.send(ChatRoomEffect.ShowError(Res.string.error_load_messages))
            }
        }
    }

    // Realtime с авто-переподключением: при обрыве ждём и коннектимся заново.
    private fun observeLive() {
        observeMessages(chatId)
            .retryWhen { cause, _ ->
                if (cause is CancellationException) return@retryWhen false
                Napier.w("WS обрыв, переподключаемся: ${cause.message}")
                delay(RECONNECT_DELAY_MS)
                runCatching { connect(force = true) }.isSuccess
            }
            .catch { e -> Napier.e("WS-поток остановлен", e) }
            .onEach { msg -> _state.update { it.copy(messages = it.messages + msg) } }
            .launchIn(viewModelScope)
    }

    fun onEvent(event: ChatRoomEvent) {
        when (event) {
            is ChatRoomEvent.InputChanged -> _state.update { it.copy(input = event.value) }
            ChatRoomEvent.SendText -> send()
            is ChatRoomEvent.SendImages -> onSendImages(event.images)
            is ChatRoomEvent.SendVoice -> onSendVoice(event.bytes)
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

    private fun onSendImages(images: List<ByteArray>) {
        if (images.isEmpty()) return
        viewModelScope.launch {
            _state.update { it.copy(isSending = true) }
            try {
                images.forEachIndexed { index, bytes -> sendImage(chatId, bytes, "photo_$index.jpg") }
            } catch (e: Exception) {
                Napier.e("Ошибка отправки изображения", e)
                _effect.send(ChatRoomEffect.ShowError(Res.string.error_send_message))
            } finally {
                _state.update { it.copy(isSending = false) }
            }
        }
    }

    private fun onSendVoice(bytes: ByteArray) {
        if (bytes.isEmpty()) return
        viewModelScope.launch {
            _state.update { it.copy(isSending = true) }
            try {
                sendVoice(chatId, bytes)
            } catch (e: Exception) {
                Napier.e("Ошибка отправки голоса", e)
                _effect.send(ChatRoomEffect.ShowError(Res.string.error_send_message))
            } finally {
                _state.update { it.copy(isSending = false) }
            }
        }
    }

    private companion object {
        const val RECONNECT_DELAY_MS = 3000L
    }
}
