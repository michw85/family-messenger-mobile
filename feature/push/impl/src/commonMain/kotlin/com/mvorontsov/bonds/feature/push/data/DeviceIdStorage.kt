package com.mvorontsov.bonds.feature.push.data

import com.russhwolf.settings.Settings
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

/** Стабильный per-install идентификатор устройства для Expo. */
@OptIn(ExperimentalUuidApi::class)
internal class DeviceIdStorage(private val settings: Settings) {
    fun getOrCreate(): String =
        settings.getStringOrNull(KEY) ?: Uuid.random().toString().also { settings.putString(KEY, it) }

    private companion object {
        const val KEY = "expo_device_id"
    }
}
