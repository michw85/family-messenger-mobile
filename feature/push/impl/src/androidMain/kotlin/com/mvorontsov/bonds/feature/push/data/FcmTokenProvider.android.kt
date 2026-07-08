package com.mvorontsov.bonds.feature.push.data

import com.google.firebase.messaging.FirebaseMessaging
import io.github.aakira.napier.Napier
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

internal actual class FcmTokenProvider {
    actual suspend fun getToken(): String? = suspendCancellableCoroutine { cont ->
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token -> cont.resume(token) }
            .addOnFailureListener { e ->
                Napier.e("Не удалось получить FCM-токен", e)
                cont.resume(null)
            }
    }
}
