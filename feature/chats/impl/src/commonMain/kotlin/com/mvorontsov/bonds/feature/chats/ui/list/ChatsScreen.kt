package com.mvorontsov.bonds.feature.chats.ui.list

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.action_cancel
import com.mvorontsov.bonds.core.localization.resources.action_delete
import com.mvorontsov.bonds.core.localization.resources.auth_logout
import com.mvorontsov.bonds.core.localization.resources.chats_delete_message
import com.mvorontsov.bonds.core.localization.resources.chats_delete_title
import com.mvorontsov.bonds.core.localization.resources.chats_empty
import com.mvorontsov.bonds.core.localization.resources.chats_empty_hint
import com.mvorontsov.bonds.core.localization.resources.chats_greeting
import com.mvorontsov.bonds.core.localization.resources.chats_group
import com.mvorontsov.bonds.core.localization.resources.chats_private
import com.mvorontsov.bonds.core.localization.resources.chats_title
import com.mvorontsov.bonds.core.localization.resources.logout_confirm_message
import com.mvorontsov.bonds.core.localization.resources.logout_confirm_title
import com.mvorontsov.bonds.feature.chats.domain.model.Chat
import com.mvorontsov.bonds.feature.chats.domain.model.ChatType
import org.jetbrains.compose.resources.getString
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ChatsScreen(
    onOpenChat: (String, String) -> Unit,
    onLoggedOut: () -> Unit,
    viewModel: ChatsViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    var deleteTarget by remember { mutableStateOf<Chat?>(null) }
    var showLogoutConfirm by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is ChatsEffect.OpenChat -> onOpenChat(effect.chatId, effect.chatName)
                ChatsEffect.LoggedOut -> onLoggedOut()
                is ChatsEffect.ShowError -> snackbarHostState.showSnackbar(getString(effect.message))
            }
        }
    }

    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens

    Scaffold(
        containerColor = Color.Transparent,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.onEvent(ChatsEvent.CreateClicked) },
                shape = CircleShape,
                containerColor = colors.primary,
                contentColor = colors.textLight,
            ) { Text("+", fontSize = 28.sp) }
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(colors.gradient)),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = dimens.lg),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = dimens.md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(Res.string.chats_greeting, state.username.ifBlank { "…" }),
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.textSecondary,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = { viewModel.onEvent(ChatsEvent.ToggleLanguage) }) {
                        Text(if (state.language == "ru") "EN" else "RU", color = colors.primary)
                    }
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clickable(onClickLabel = stringResource(Res.string.auth_logout)) {
                                showLogoutConfirm = true
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("⎋", fontSize = 28.sp, color = colors.danger)
                    }
                }
                Text(
                    text = stringResource(Res.string.chats_title),
                    style = MaterialTheme.typography.headlineMedium,
                    color = colors.primary,
                )
                Spacer(Modifier.height(dimens.md))

                PullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(ChatsEvent.Refresh) },
                    modifier = Modifier.fillMaxSize(),
                ) {
                    when {
                        state.isLoading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                            CircularProgressIndicator(color = colors.primary)
                        }
                        state.chats.isEmpty() -> EmptyState()
                        else -> LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(vertical = dimens.md, horizontal = 2.dp),
                            verticalArrangement = Arrangement.spacedBy(dimens.sm),
                        ) {
                            items(state.chats, key = { it.id }) { chat ->
                                ChatItem(
                                    chat = chat,
                                    onClick = { viewModel.onEvent(ChatsEvent.OpenChat(chat.id, chat.name)) },
                                    onLongClick = { deleteTarget = chat },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (state.showCreateDialog) {
        com.mvorontsov.bonds.feature.chats.ui.create.CreateChatDialog(
            onConfirm = { name, isGroup -> viewModel.onEvent(ChatsEvent.ConfirmCreate(name, isGroup)) },
            onDismiss = { viewModel.onEvent(ChatsEvent.DismissCreateDialog) },
        )
    }

    deleteTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text(stringResource(Res.string.chats_delete_title)) },
            text = { Text(stringResource(Res.string.chats_delete_message, target.name)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.onEvent(ChatsEvent.DeleteChat(target.id))
                    deleteTarget = null
                }) { Text(stringResource(Res.string.action_delete), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { deleteTarget = null }) { Text(stringResource(Res.string.action_cancel)) }
            },
        )
    }

    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            title = { Text(stringResource(Res.string.logout_confirm_title)) },
            text = { Text(stringResource(Res.string.logout_confirm_message)) },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutConfirm = false
                    viewModel.onEvent(ChatsEvent.Logout)
                }) { Text(stringResource(Res.string.auth_logout), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutConfirm = false }) { Text(stringResource(Res.string.action_cancel)) }
            },
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ChatItem(chat: Chat, onClick: () -> Unit, onLongClick: () -> Unit) {
    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens
    Surface(
        color = colors.backgroundLight,
        shape = RoundedCornerShape(dimens.radiusMedium),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(dimens.radiusMedium))
            .combinedClickable(onClick = onClick, onLongClick = onLongClick),
    ) {
        Row(
            modifier = Modifier.padding(dimens.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(colors.accentLight),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = chat.name.take(1).uppercase(),
                    color = colors.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 20.sp,
                )
            }
            Spacer(Modifier.size(dimens.md))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = chat.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = colors.text,
                    fontWeight = FontWeight.SemiBold,
                )
                val typeLabel = if (chat.type == ChatType.GROUP) {
                    "👥 " + stringResource(Res.string.chats_group)
                } else {
                    "👤 " + stringResource(Res.string.chats_private)
                }
                Text(text = typeLabel, style = MaterialTheme.typography.labelSmall, color = colors.textSecondary)
            }
            Text("›", fontSize = 24.sp, color = colors.accent)
        }
    }
}

@Composable
private fun EmptyState() {
    val colors = BondsTheme.colors
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("💛", fontSize = 48.sp)
        Spacer(Modifier.height(8.dp))
        Text(stringResource(Res.string.chats_empty), style = MaterialTheme.typography.bodyLarge, color = colors.textSecondary)
        Text(stringResource(Res.string.chats_empty_hint), style = MaterialTheme.typography.bodySmall, color = colors.textMuted)
    }
}
