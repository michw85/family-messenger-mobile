package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.runtime.Composable

/** Запись голоса. start() — начать, stop() — закончить и отдать байты в onRecorded. */
internal expect class VoiceRecorder {
    fun start()
    fun stop()
    fun cancel()
}

@Composable
internal expect fun rememberVoiceRecorder(onRecorded: (ByteArray?) -> Unit): VoiceRecorder
