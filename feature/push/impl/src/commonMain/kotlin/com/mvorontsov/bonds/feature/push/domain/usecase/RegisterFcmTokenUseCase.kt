package com.mvorontsov.bonds.feature.push.domain.usecase

import com.mvorontsov.bonds.feature.push.data.DeviceIdStorage
import com.mvorontsov.bonds.feature.push.data.FcmTokenProvider
import com.mvorontsov.bonds.feature.push.data.remote.ExpoPushTokenDataSource
import com.mvorontsov.bonds.feature.push.data.remote.FcmRemoteDataSource
import io.github.aakira.napier.Napier

internal class RegisterFcmTokenUseCase(
    private val provider: FcmTokenProvider,
    private val expo: ExpoPushTokenDataSource,
    private val deviceId: DeviceIdStorage,
    private val remote: FcmRemoteDataSource,
) {
    suspend operator fun invoke() {
        val fcm = provider.getToken()
        if (fcm.isNullOrBlank()) {
            Napier.w("FCM: токен не получен")
            return
        }
        // Бэкенд рассылает через Expo → регистрируем Expo-токен (сырой FCM — как запасной)
        val expoToken = expo.exchange(fcm, deviceId.getOrCreate())
        val token = expoToken ?: fcm
        remote.register(token)
        Napier.d("Push: токен зарегистрирован (expo=${expoToken != null})")
    }
}
