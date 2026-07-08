package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.runtime.Composable
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import platform.Foundation.NSData
import platform.PhotosUI.PHPickerConfiguration
import platform.PhotosUI.PHPickerFilter
import platform.PhotosUI.PHPickerResult
import platform.PhotosUI.PHPickerViewController
import platform.PhotosUI.PHPickerViewControllerDelegateProtocol
import platform.UIKit.UIApplication
import platform.UIKit.UIViewController
import platform.darwin.NSObject
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue
import platform.posix.memcpy

private const val MAX_ITEMS = 10L

@Composable
internal actual fun rememberImagePicker(onResult: (List<ByteArray>) -> Unit): () -> Unit =
    { presentImagePicker(onResult) }

// Делегат PHPicker weak — удерживаем сами до завершения выбора.
private var retained: ImagePickerDelegate? = null

private fun presentImagePicker(onResult: (List<ByteArray>) -> Unit) {
    val config = PHPickerConfiguration()
    config.selectionLimit = MAX_ITEMS
    config.filter = PHPickerFilter.imagesFilter()
    val picker = PHPickerViewController(configuration = config)
    val delegate = ImagePickerDelegate(onResult)
    retained = delegate
    picker.delegate = delegate
    topViewController()?.presentViewController(picker, animated = true, completion = null)
}

private class ImagePickerDelegate(
    private val onResult: (List<ByteArray>) -> Unit,
) : NSObject(), PHPickerViewControllerDelegateProtocol {

    override fun picker(picker: PHPickerViewController, didFinishPicking: List<*>) {
        picker.dismissViewControllerAnimated(true, null)
        retained = null
        val results = didFinishPicking.filterIsInstance<PHPickerResult>()
        if (results.isEmpty()) {
            onResult(emptyList())
            return
        }
        val collected = mutableListOf<ByteArray>()
        var remaining = results.size
        results.forEach { result ->
            result.itemProvider.loadDataRepresentationForTypeIdentifier("public.image") { data, _ ->
                dispatch_async(dispatch_get_main_queue()) {
                    data?.toByteArray()?.let { collected.add(it) }
                    remaining--
                    if (remaining == 0) onResult(collected.toList())
                }
            }
        }
    }
}

@OptIn(ExperimentalForeignApi::class)
private fun NSData.toByteArray(): ByteArray {
    val size = length.toInt()
    val result = ByteArray(size)
    if (size > 0) {
        result.usePinned { pinned -> memcpy(pinned.addressOf(0), bytes, length) }
    }
    return result
}

private fun topViewController(): UIViewController? {
    var vc = UIApplication.sharedApplication.keyWindow?.rootViewController
    while (vc?.presentedViewController != null) vc = vc.presentedViewController
    return vc
}
