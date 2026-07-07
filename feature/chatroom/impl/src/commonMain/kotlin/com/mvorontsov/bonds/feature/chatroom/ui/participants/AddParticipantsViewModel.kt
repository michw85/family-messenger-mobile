package com.mvorontsov.bonds.feature.chatroom.ui.participants

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.error_add_participants
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.AddParticipantsUseCase
import com.mvorontsov.bonds.feature.chatroom.domain.usecase.SearchUsersUseCase
import io.github.aakira.napier.Napier
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

internal class AddParticipantsViewModel(
    private val chatId: String,
    private val searchUsers: SearchUsersUseCase,
    private val addParticipants: AddParticipantsUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(AddParticipantsState())
    val state: StateFlow<AddParticipantsState> = _state.asStateFlow()

    private val _effect = Channel<AddParticipantsEffect>(Channel.BUFFERED)
    val effect: Flow<AddParticipantsEffect> = _effect.receiveAsFlow()

    private var searchJob: Job? = null

    fun onEvent(event: AddParticipantsEvent) {
        when (event) {
            is AddParticipantsEvent.QueryChanged -> onQuery(event.value)
            is AddParticipantsEvent.ToggleUser -> toggle(event.id)
            AddParticipantsEvent.Confirm -> confirm()
            AddParticipantsEvent.Dismiss -> _effect.trySend(AddParticipantsEffect.Dismissed)
        }
    }

    private fun onQuery(query: String) {
        _state.update { it.copy(query = query) }
        searchJob?.cancel()
        if (query.trim().length < MIN_QUERY) {
            _state.update { it.copy(results = emptyList(), isSearching = false) }
            return
        }
        searchJob = viewModelScope.launch {
            delay(DEBOUNCE_MS)
            _state.update { it.copy(isSearching = true) }
            try {
                val users = searchUsers(query)
                _state.update { it.copy(results = users, isSearching = false) }
            } catch (e: Exception) {
                Napier.e("Ошибка поиска пользователей", e)
                _state.update { it.copy(isSearching = false) }
            }
        }
    }

    private fun toggle(id: Long) {
        _state.update {
            val next = if (id in it.selectedIds) it.selectedIds - id else it.selectedIds + id
            it.copy(selectedIds = next)
        }
    }

    private fun confirm() {
        val ids = _state.value.selectedIds.toList()
        if (ids.isEmpty()) return
        viewModelScope.launch {
            _state.update { it.copy(isAdding = true) }
            try {
                addParticipants(chatId, ids)
                _effect.send(AddParticipantsEffect.Added)
            } catch (e: Exception) {
                Napier.e("Ошибка добавления участников", e)
                _effect.send(AddParticipantsEffect.ShowError(Res.string.error_add_participants))
            } finally {
                _state.update { it.copy(isAdding = false) }
            }
        }
    }

    private companion object {
        const val MIN_QUERY = 2
        const val DEBOUNCE_MS = 300L
    }
}
