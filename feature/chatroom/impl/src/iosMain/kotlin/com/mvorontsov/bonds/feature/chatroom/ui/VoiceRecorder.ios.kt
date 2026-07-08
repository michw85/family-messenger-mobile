package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.runtime.Composable
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import platform.AVFAudio.AVAudioRecorder
import platform.AVFAudio.AVAudioSession
import platform.AVFAudio.AVAudioSessionCategoryPlayAndRecord
import platform.AVFAudio.AVAudioSessionRecordPermissionGranted
import platform.AVFAudio.AVFormatIDKey
import platform.AVFAudio.AVNumberOfChannelsKey
import platform.AVFAudio.AVSampleRateKey
import platform.AVFAudio.setActive
import platform.CoreAudioTypes.kAudioFormatMPEG4AAC
import platform.Foundation.NSData
import platform.Foundation.NSFileManager
import platform.Foundation.NSTemporaryDirectory
import platform.Foundation.NSURL
import platform.Foundation.NSUUID
import platform.Foundation.dataWithContentsOfURL
import platform.posix.memcpy

@OptIn(ExperimentalForeignApi::class)
internal actual class VoiceRecorder(private val onRecorded: (ByteArray?) -> Unit) {
    private var recorder: AVAudioRecorder? = null
    private var url: NSURL? = null

    actual fun start() {
        val session = AVAudioSession.sharedInstance()
        if (session.recordPermission != AVAudioSessionRecordPermissionGranted) {
            session.requestRecordPermission { }
            return
        }
        runCatching {
            session.setCategory(AVAudioSessionCategoryPlayAndRecord, null)
            session.setActive(true, null)
            val path = NSTemporaryDirectory() + "voice_" + NSUUID().UUIDString + ".m4a"
            val fileUrl = NSURL.fileURLWithPath(path)
            url = fileUrl
            val settings = mapOf<Any?, Any?>(
                AVFormatIDKey to kAudioFormatMPEG4AAC,
                AVSampleRateKey to 44100.0,
                AVNumberOfChannelsKey to 1,
            )
            val rec = AVAudioRecorder(uRL = fileUrl, settings = settings, error = null)
            rec.record()
            recorder = rec
        }
    }

    actual fun stop() {
        val rec = recorder ?: return
        recorder = null
        rec.stop()
        val data = url?.let { NSData.dataWithContentsOfURL(it) }
        url = null
        onRecorded(data?.toByteArray())
    }

    actual fun cancel() {
        val rec = recorder ?: return
        recorder = null
        rec.stop()
        url?.let { NSFileManager.defaultManager.removeItemAtURL(it, null) }
        url = null
    }
}

@Composable
internal actual fun rememberVoiceRecorder(onRecorded: (ByteArray?) -> Unit): VoiceRecorder =
    VoiceRecorder(onRecorded)

@OptIn(ExperimentalForeignApi::class)
private fun NSData.toByteArray(): ByteArray {
    val size = length.toInt()
    val out = ByteArray(size)
    if (size > 0) out.usePinned { memcpy(it.addressOf(0), bytes, length) }
    return out
}
