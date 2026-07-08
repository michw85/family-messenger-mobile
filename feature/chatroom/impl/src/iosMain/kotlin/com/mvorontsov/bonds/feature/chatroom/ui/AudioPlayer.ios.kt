package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import platform.AVFoundation.AVPlayer
import platform.AVFoundation.AVPlayerItem
import platform.AVFoundation.AVPlayerItemDidPlayToEndTimeNotification
import platform.AVFoundation.pause
import platform.AVFoundation.play
import platform.Foundation.NSNotificationCenter
import platform.Foundation.NSURL
import platform.darwin.NSObjectProtocol

internal actual class AudioPlayer(private val onCompletion: () -> Unit) {
    private var player: AVPlayer? = null
    private var observer: NSObjectProtocol? = null

    actual fun play(url: String) {
        stop()
        val nsUrl = NSURL.URLWithString(url) ?: return
        val item = AVPlayerItem(uRL = nsUrl)
        observer = NSNotificationCenter.defaultCenter.addObserverForName(
            AVPlayerItemDidPlayToEndTimeNotification,
            item,
            null,
        ) { _ -> onCompletion() }
        val p = AVPlayer(playerItem = item)
        player = p
        p.play()
    }

    actual fun stop() {
        player?.pause()
        player = null
        observer?.let { NSNotificationCenter.defaultCenter.removeObserver(it) }
        observer = null
    }
}

@Composable
internal actual fun rememberAudioPlayer(onCompletion: () -> Unit): AudioPlayer =
    remember { AudioPlayer(onCompletion) }
