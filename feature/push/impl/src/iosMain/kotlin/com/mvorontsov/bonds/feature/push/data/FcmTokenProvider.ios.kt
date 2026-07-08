package com.mvorontsov.bonds.feature.push.data

// iOS: FCM/APNs подключим отдельным шагом (нужен Apple Developer + APNs-ключ). Пока токена нет.
internal actual class FcmTokenProvider {
    actual suspend fun getToken(): String? = null
}
