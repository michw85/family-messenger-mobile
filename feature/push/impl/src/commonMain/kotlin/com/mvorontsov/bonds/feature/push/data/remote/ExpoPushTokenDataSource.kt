package com.mvorontsov.bonds.feature.push.data.remote

import io.github.aakira.napier.Napier
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

/** Обменивает нативный FCM-токен на Expo push-токен (бэкенд рассылает через Expo). */
internal class ExpoPushTokenDataSource(private val http: ExpoHttpClient) {

    suspend fun exchange(fcmToken: String, deviceId: String): String? = runCatching {
        val response: ExpoTokenResponseDto = http.client.post(EXPO_URL) {
            contentType(ContentType.Application.Json)
            setBody(ExpoTokenRequestDto(deviceId = deviceId, deviceToken = fcmToken))
        }.body()
        response.data.expoPushToken
    }.getOrElse {
        Napier.e("Expo: не удалось обменять токен", it)
        null
    }

    private companion object {
        const val EXPO_URL = "https://exp.host/--/api/v2/push/getExpoPushToken"
    }
}
