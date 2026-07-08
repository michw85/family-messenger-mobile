package com.mvorontsov.bonds.feature.push.data

/** Платформенный источник push-токена устройства. */
internal expect class FcmTokenProvider() {
    suspend fun getToken(): String?
}
