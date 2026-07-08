package com.mvorontsov.bonds.feature.push.data.remote

import kotlinx.serialization.Serializable

@Serializable
internal data class ExpoTokenRequestDto(
    val deviceId: String,
    val deviceToken: String,
    val type: String = "fcm",
    val development: Boolean = false,
    val appId: String = "com.mvorontsov.bonds",
    val projectId: String = "cd3777d1-9f36-4fe9-b724-7dcb24a59bf5",
)
