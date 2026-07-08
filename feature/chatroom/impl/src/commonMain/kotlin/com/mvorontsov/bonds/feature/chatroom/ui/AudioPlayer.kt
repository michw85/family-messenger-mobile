package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.runtime.Composable

/** Плеер голосовых. play(url) — играть по URL, stop() — остановить. */
internal expect class AudioPlayer {
    fun play(url: String)
    fun stop()
}

@Composable
internal expect fun rememberAudioPlayer(onCompletion: () -> Unit): AudioPlayer
