package com.mvorontsov.bonds.feature.chatroom.ui

import androidx.compose.runtime.Composable
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import platform.Foundation.NSData
import platform.UIKit.UIApplication
import platform.UIKit.UIImage
import platform.UIKit.UIImageJPEGRepresentation
import platform.UIKit.UIImagePickerController
import platform.UIKit.UIImagePickerControllerDelegateProtocol
import platform.UIKit.UIImagePickerControllerOriginalImage
import platform.UIKit.UIImagePickerControllerSourceType
import platform.UIKit.UINavigationControllerDelegateProtocol
import platform.UIKit.UIViewController
import platform.darwin.NSObject
import platform.posix.memcpy

@Composable
internal actual fun rememberCameraCapture(onResult: (ByteArray?) -> Unit): () -> Unit =
    { presentCamera(onResult) }

private var retainedCam: CameraDelegate? = null

private fun presentCamera(onResult: (ByteArray?) -> Unit) {
    if (!UIImagePickerController.isSourceTypeAvailable(UIImagePickerControllerSourceType.UIImagePickerControllerSourceTypeCamera)) {
        onResult(null)
        return
    }
    val picker = UIImagePickerController()
    picker.sourceType = UIImagePickerControllerSourceType.UIImagePickerControllerSourceTypeCamera
    val delegate = CameraDelegate(onResult)
    retainedCam = delegate
    picker.delegate = delegate
    topViewControllerCam()?.presentViewController(picker, animated = true, completion = null)
}

private class CameraDelegate(
    private val onResult: (ByteArray?) -> Unit,
) : NSObject(), UIImagePickerControllerDelegateProtocol, UINavigationControllerDelegateProtocol {

    override fun imagePickerController(
        picker: UIImagePickerController,
        didFinishPickingMediaWithInfo: Map<Any?, *>,
    ) {
        picker.dismissViewControllerAnimated(true, null)
        retainedCam = null
        val image = didFinishPickingMediaWithInfo[UIImagePickerControllerOriginalImage] as? UIImage
        val data = image?.let { UIImageJPEGRepresentation(it, 0.8) }
        onResult(data?.toByteArray())
    }

    override fun imagePickerControllerDidCancel(picker: UIImagePickerController) {
        picker.dismissViewControllerAnimated(true, null)
        retainedCam = null
        onResult(null)
    }
}

@OptIn(ExperimentalForeignApi::class)
private fun NSData.toByteArray(): ByteArray {
    val size = length.toInt()
    val out = ByteArray(size)
    if (size > 0) out.usePinned { memcpy(it.addressOf(0), bytes, length) }
    return out
}

private fun topViewControllerCam(): UIViewController? {
    var vc = UIApplication.sharedApplication.keyWindow?.rootViewController
    while (vc?.presentedViewController != null) vc = vc.presentedViewController
    return vc
}
