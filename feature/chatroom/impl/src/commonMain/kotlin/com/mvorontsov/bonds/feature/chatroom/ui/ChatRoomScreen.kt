package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.core.designsystem.ErrorDialog
import com.mvorontsov.bonds.core.designsystem.FloatingClouds
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.action_back
import com.mvorontsov.bonds.core.localization.resources.chatroom_cd_photo
import com.mvorontsov.bonds.core.localization.resources.chatroom_cd_voice
import com.mvorontsov.bonds.core.localization.resources.chatroom_input_hint
import com.mvorontsov.bonds.core.localization.resources.media_camera
import com.mvorontsov.bonds.core.localization.resources.media_gallery
import com.mvorontsov.bonds.core.localization.resources.rec_release_cancel
import com.mvorontsov.bonds.core.localization.resources.rec_swipe_cancel
import com.mvorontsov.bonds.feature.chatroom.ui.participants.AddParticipantsSheet
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.minutes

@Composable
internal fun ChatRoomScreen(
    chatId: String,
    chatName: String,
    onBack: () -> Unit,
    viewModel: ChatRoomViewModel = koinViewModel { parametersOf(chatId) },
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()
    var showParticipants by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<StringResource?>(null) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                ChatRoomEffect.NavigateBack -> onBack()
                is ChatRoomEffect.ShowError -> errorMessage = effect.message
            }
        }
    }

    errorMessage?.let { message ->
        ErrorDialog(message = message, onDismiss = { errorMessage = null })
    }
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.lastIndex)
    }
    // При появлении клавиатуры область сжимается — доскроллим к последнему сообщению.
    val density = LocalDensity.current
    val imeVisible = WindowInsets.ime.getBottom(density) > 0
    LaunchedEffect(imeVisible) {
        if (imeVisible && state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.lastIndex)
    }

    val pickImages = rememberImagePicker { images ->
        if (images.isNotEmpty()) viewModel.onEvent(ChatRoomEvent.SendImages(images))
    }
    val captureImage = rememberCameraCapture { bytes ->
        bytes?.let { viewModel.onEvent(ChatRoomEvent.SendImages(listOf(it))) }
    }
    var showMediaSource by remember { mutableStateOf(false) }
    var recording by remember { mutableStateOf(false) }
    var cancelArmed by remember { mutableStateOf(false) }
    val recorder = rememberVoiceRecorder { bytes ->
        recording = false
        if (bytes != null && bytes.isNotEmpty()) viewModel.onEvent(ChatRoomEvent.SendVoice(bytes))
    }
    var playingUrl by remember { mutableStateOf<String?>(null) }
    val player = rememberAudioPlayer(onCompletion = { playingUrl = null })

    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens

    Scaffold(
        containerColor = Color.Transparent,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
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
                        itemsIndexed(state.messages) { index, message ->
                            val prev = state.messages.getOrNull(index - 1)
                            val next = state.messages.getOrNull(index + 1)
                            val continuesFromPrev = prev != null &&
                                prev.senderUsername == message.senderUsername &&
                                message.timestamp != null && prev.timestamp != null &&
                                (message.timestamp - prev.timestamp) <= 2.minutes
                            val continuesToNext = next != null &&
                                next.senderUsername == message.senderUsername &&
                                message.timestamp != null && next.timestamp != null &&
                                (next.timestamp - message.timestamp) <= 2.minutes
                            MessageBubble(
                                message = message,
                                showSenderName = !message.isMine && !continuesFromPrev,
                                showTail = !continuesToNext,
                                grouped = continuesFromPrev,
                                isVoicePlaying = message.mediaUrl != null && message.mediaUrl == playingUrl,
                                onVoiceToggle = {
                                    val url = message.mediaUrl
                                    if (url != null) {
                                        if (playingUrl == url) {
                                            player.stop()
                                            playingUrl = null
                                        } else {
                                            player.play(url)
                                            playingUrl = url
                                        }
                                    }
                                },
                            )
                        }
                    }
                }

                InputPanel(
                    input = state.input,
                    onInputChange = { viewModel.onEvent(ChatRoomEvent.InputChanged(it)) },
                    onSend = { viewModel.onEvent(ChatRoomEvent.SendText) },
                    onPickImage = { showMediaSource = true },
                    onRecordStart = {
                        recording = true
                        recorder.start()
                    },
                    onRecordStop = { recorder.stop() },
                    onRecordCancel = {
                        recording = false
                        cancelArmed = false
                        recorder.cancel()
                    },
                    onCancelArmedChange = { cancelArmed = it },
                    isRecording = recording,
                    cancelArmed = cancelArmed,
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

        if (showMediaSource) {
            MediaSourceSheet(
                onCamera = {
                    showMediaSource = false
                    captureImage()
                },
                onGallery = {
                    showMediaSource = false
                    pickImages()
                },
                onDismiss = { showMediaSource = false },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MediaSourceSheet(onCamera: () -> Unit, onGallery: () -> Unit, onDismiss: () -> Unit) {
    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = colors.backgroundLight) {
        Column(modifier = Modifier.fillMaxWidth().padding(bottom = dimens.xl)) {
            MediaSourceRow(Icons.Filled.PhotoCamera, stringResource(Res.string.media_camera), onCamera)
            MediaSourceRow(Icons.Filled.PhotoLibrary, stringResource(Res.string.media_gallery), onGallery)
        }
    }
}

@Composable
private fun MediaSourceRow(icon: ImageVector, text: String, onClick: () -> Unit) {
    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = dimens.xl, vertical = dimens.md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = colors.primary)
        Spacer(Modifier.size(dimens.md))
        Text(text, color = colors.text, fontSize = 16.sp)
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
private fun InputPanel(
    input: String,
    onInputChange: (String) -> Unit,
    onSend: () -> Unit,
    onPickImage: () -> Unit,
    onRecordStart: () -> Unit,
    onRecordStop: () -> Unit,
    onRecordCancel: () -> Unit,
    onCancelArmedChange: (Boolean) -> Unit,
    isRecording: Boolean,
    cancelArmed: Boolean,
) {
    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens

    val density = LocalDensity.current
    // высоту обычной панели меряем и жёстко применяем при записи, чтобы бар не менял высоту
    var restHeight by remember { mutableStateOf<Dp?>(null) }

    var elapsedMs by remember { mutableStateOf(0L) }
    LaunchedEffect(isRecording) {
        if (isRecording) {
            elapsedMs = 0L
            while (true) {
                delay(100)
                elapsedMs += 100
            }
        } else {
            elapsedMs = 0L
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.inputScrim)
            .navigationBarsPadding()
            .imePadding(),
    ) {
        HorizontalDivider(color = colors.border)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .onSizeChanged { if (!isRecording) restHeight = with(density) { it.height.toDp() } }
                .then(if (isRecording) restHeight?.let { Modifier.height(it) } ?: Modifier else Modifier)
                .padding(horizontal = dimens.sm, vertical = dimens.sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(dimens.sm),
        ) {
            if (isRecording) {
                RecordingDot()
            } else {
                IconChip(Icons.Filled.PhotoCamera, stringResource(Res.string.chatroom_cd_photo), onClick = onPickImage)
            }
            key("mic") {
                MicButton(
                    isRecording = isRecording,
                    onStart = onRecordStart,
                    onStop = onRecordStop,
                    onCancel = onRecordCancel,
                    onCancelArmedChange = onCancelArmedChange,
                )
            }
            if (isRecording) {
                RecordingInfo(
                    elapsedMs = elapsedMs,
                    cancelArmed = cancelArmed,
                    modifier = Modifier.weight(1f),
                )
            } else {
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
}

@Composable
private fun RecordingDot() {
    val colors = BondsTheme.colors
    val blinkAlpha by rememberInfiniteTransition(label = "rec").animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(600), RepeatMode.Reverse),
        label = "recBlink",
    )
    Box(modifier = Modifier.size(48.dp), contentAlignment = Alignment.Center) {
        Box(Modifier.size(16.dp).clip(CircleShape).background(colors.danger.copy(alpha = blinkAlpha)))
    }
}

@Composable
private fun RecordingInfo(elapsedMs: Long, cancelArmed: Boolean, modifier: Modifier = Modifier) {
    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens
    Row(
        modifier = modifier.padding(end = dimens.md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(formatTimer(elapsedMs), color = colors.text, fontSize = 15.sp)
        Spacer(Modifier.weight(1f))
        Text(
            text = if (cancelArmed) stringResource(Res.string.rec_release_cancel) else stringResource(Res.string.rec_swipe_cancel),
            color = if (cancelArmed) colors.danger else colors.textSecondary,
            fontSize = 13.sp,
        )
    }
}

private fun formatTimer(ms: Long): String {
    val totalSec = ms / 1000
    val min = totalSec / 60
    val sec = totalSec % 60
    val tenth = (ms % 1000) / 100
    return "$min:${sec.toString().padStart(2, '0')},$tenth"
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

private const val MIN_RECORD_MS = 800L

@Composable
private fun MicButton(
    isRecording: Boolean,
    onStart: () -> Unit,
    onStop: () -> Unit,
    onCancel: () -> Unit,
    onCancelArmedChange: (Boolean) -> Unit,
) {
    val colors = BondsTheme.colors
    val thresholdPx = with(LocalDensity.current) { 100.dp.toPx() }
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(if (isRecording) colors.danger.copy(alpha = 0.2f) else colors.iconButtonBg)
            .pointerInput(Unit) {
                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false)
                    val startMs = down.uptimeMillis
                    onStart()
                    var armed = false
                    var endMs = startMs
                    while (true) {
                        val event = awaitPointerEvent()
                        val change = event.changes.firstOrNull { it.id == down.id } ?: event.changes.first()
                        endMs = change.uptimeMillis
                        val nowArmed = (change.position.x - down.position.x) > thresholdPx
                        if (nowArmed != armed) {
                            armed = nowArmed
                            onCancelArmedChange(armed)
                        }
                        if (!change.pressed) break
                    }
                    onCancelArmedChange(false)
                    if (armed || endMs - startMs < MIN_RECORD_MS) onCancel() else onStop()
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.Mic,
            contentDescription = stringResource(Res.string.chatroom_cd_voice),
            tint = if (isRecording) colors.danger else colors.primary,
            modifier = Modifier.size(22.dp),
        )
    }
}
