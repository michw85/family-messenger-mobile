package com.mvorontsov.bonds.feature.chatroom.ui

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import io.github.aakira.napier.Napier
import java.io.File

internal actual class VoiceRecorder(
    private val context: Context,
    private val onRecorded: (ByteArray?) -> Unit,
    private val hasPermission: () -> Boolean,
    private val requestPermission: () -> Unit,
) {
    private var recorder: MediaRecorder? = null
    private var file: File? = null

    actual fun start() {
        if (!hasPermission()) {
            requestPermission()
            return
        }
        runCatching {
            val f = File.createTempFile("voice_", ".m4a", context.cacheDir)
            @Suppress("DEPRECATION")
            val rec = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(context) else MediaRecorder()
            rec.setAudioSource(MediaRecorder.AudioSource.MIC)
            rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            rec.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            rec.setOutputFile(f.absolutePath)
            rec.prepare()
            rec.start()
            recorder = rec
            file = f
        }.onFailure { Napier.e("Ошибка старта записи", it) }
    }

    actual fun stop() {
        val rec = recorder ?: return
        recorder = null
        val bytes = runCatching {
            rec.stop()
            file?.readBytes()
        }.getOrNull()
        runCatching { rec.release() }
        file = null
        onRecorded(bytes)
    }

    actual fun cancel() {
        val rec = recorder ?: return
        recorder = null
        runCatching { rec.stop() }
        runCatching { rec.release() }
        file?.let { runCatching { it.delete() } }
        file = null
    }
}

@Composable
internal actual fun rememberVoiceRecorder(onRecorded: (ByteArray?) -> Unit): VoiceRecorder {
    val context = LocalContext.current
    var granted by remember {
        mutableStateOf(
            context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED,
        )
    }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted = it }
    return remember {
        VoiceRecorder(
            context = context,
            onRecorded = onRecorded,
            hasPermission = { granted },
            requestPermission = { launcher.launch(Manifest.permission.RECORD_AUDIO) },
        )
    }
}
