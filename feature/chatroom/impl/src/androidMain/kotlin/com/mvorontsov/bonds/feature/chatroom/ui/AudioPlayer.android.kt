package com.mvorontsov.bonds.feature.chatroom.ui

import android.media.AudioAttributes
import android.media.MediaPlayer
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import io.github.aakira.napier.Napier

internal actual class AudioPlayer(private val onCompletion: () -> Unit) {
    private var player: MediaPlayer? = null

    actual fun play(url: String) {
        stop()
        runCatching {
            player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build(),
                )
                setDataSource(url)
                setOnPreparedListener { it.start() }
                setOnCompletionListener { onCompletion() }
                prepareAsync()
            }
        }.onFailure { Napier.e("Ошибка воспроизведения", it) }
    }

    actual fun stop() {
        player?.let { runCatching { it.release() } }
        player = null
    }
}

@Composable
internal actual fun rememberAudioPlayer(onCompletion: () -> Unit): AudioPlayer {
    val player = remember { AudioPlayer(onCompletion) }
    DisposableEffect(Unit) { onDispose { player.stop() } }
    return player
}
