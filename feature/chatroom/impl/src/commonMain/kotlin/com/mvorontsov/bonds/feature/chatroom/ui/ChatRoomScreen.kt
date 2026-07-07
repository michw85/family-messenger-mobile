package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.core.designsystem.FloatingClouds
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.action_back
import com.mvorontsov.bonds.core.localization.resources.chatroom_cd_photo
import com.mvorontsov.bonds.core.localization.resources.chatroom_cd_voice
import com.mvorontsov.bonds.core.localization.resources.chatroom_input_hint
import com.mvorontsov.bonds.feature.chatroom.ui.participants.AddParticipantsSheet
import org.jetbrains.compose.resources.getString
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

@Composable
internal fun ChatRoomScreen(
    chatId: String,
    chatName: String,
    onBack: () -> Unit,
    viewModel: ChatRoomViewModel = koinViewModel { parametersOf(chatId) },
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val listState = rememberLazyListState()
    var showParticipants by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                ChatRoomEffect.NavigateBack -> onBack()
                is ChatRoomEffect.ShowError -> snackbarHostState.showSnackbar(getString(effect.message))
            }
        }
    }
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.lastIndex)
    }

    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens

    Scaffold(
        containerColor = Color.Transparent,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { _ ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(colors.gradient)),
        ) {
            FloatingClouds()

            Column(modifier = Modifier.fillMaxSize()) {
                Header(
                    chatName = chatName,
                    onBack = { viewModel.onEvent(ChatRoomEvent.Back) },
                    onAddParticipants = { showParticipants = true },
                )

                if (state.isLoading) {
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        CircularProgressIndicator(color = colors.primary)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth().weight(1f),
                        state = listState,
                        contentPadding = PaddingValues(vertical = dimens.lg),
                        verticalArrangement = Arrangement.Bottom,
                    ) {
                        items(state.messages, key = { it.id }) { message ->
                            MessageBubble(message)
                        }
                    }
                }

                InputPanel(
                    input = state.input,
                    onInputChange = { viewModel.onEvent(ChatRoomEvent.InputChanged(it)) },
                    onSend = { viewModel.onEvent(ChatRoomEvent.SendText) },
                )
            }
        }

        if (showParticipants) {
            AddParticipantsSheet(
                chatId = chatId,
                onDismiss = { showParticipants = false },
                onAdded = { showParticipants = false },
            )
        }
    }
}

@Composable
private fun Header(chatName: String, onBack: () -> Unit, onAddParticipants: () -> Unit) {
    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = colors.headerScrim,
                shape = RoundedCornerShape(bottomStart = dimens.radiusLarge, bottomEnd = dimens.radiusLarge),
            )
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = dimens.md, vertical = dimens.md),
    ) {
        IconButton(
            onClick = onBack,
            modifier = Modifier.align(Alignment.CenterStart),
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = stringResource(Res.string.action_back),
                tint = colors.primary,
            )
        }
        Text(
            text = chatName,
            modifier = Modifier.align(Alignment.Center),
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = colors.primary,
        )
        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .size(36.dp)
                .clip(CircleShape)
                .background(colors.accent)
                .clickable(onClick = onAddParticipants),
            contentAlignment = Alignment.Center,
        ) { Text("+", fontSize = 22.sp, color = colors.textLight) }
    }
}

@Composable
private fun InputPanel(input: String, onInputChange: (String) -> Unit, onSend: () -> Unit) {
    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.inputScrim)
            .navigationBarsPadding()
            .imePadding(),
    ) {
        HorizontalDivider(color = colors.border)
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = dimens.sm, vertical = dimens.sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(dimens.sm),
        ) {
            // Медиа подключим в Фазе 5
            IconChip(Icons.Filled.PhotoCamera, stringResource(Res.string.chatroom_cd_photo), onClick = {})
            IconChip(Icons.Filled.Mic, stringResource(Res.string.chatroom_cd_voice), onClick = {})
            OutlinedTextField(
                value = input,
                onValueChange = onInputChange,
                placeholder = { Text(stringResource(Res.string.chatroom_input_hint)) },
                shape = RoundedCornerShape(dimens.radiusXLarge),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = colors.backgroundLight,
                    unfocusedContainerColor = colors.backgroundLight,
                ),
                maxLines = 4,
                modifier = Modifier.weight(1f),
            )
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(colors.primary)
                    .clickable(onClick = onSend),
                contentAlignment = Alignment.Center,
            ) { Text("↑", fontSize = 24.sp, color = colors.textLight) }
        }
    }
}

@Composable
private fun IconChip(icon: ImageVector, contentDescription: String, onClick: () -> Unit) {
    val colors = BondsTheme.colors
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(colors.iconButtonBg)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = colors.primary,
            modifier = Modifier.size(22.dp),
        )
    }
}
