package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val MAX_ITEMS = 10

@Composable
internal actual fun rememberImagePicker(onResult: (List<ByteArray>) -> Unit): () -> Unit {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia(MAX_ITEMS),
    ) { uris ->
        if (uris.isEmpty()) {
            onResult(emptyList())
            return@rememberLauncherForActivityResult
        }
        scope.launch {
            val images = withContext(Dispatchers.IO) {
                uris.mapNotNull { uri ->
                    context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                }
            }
            onResult(images)
        }
    }
    return remember {
        { launcher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }
    }
}
