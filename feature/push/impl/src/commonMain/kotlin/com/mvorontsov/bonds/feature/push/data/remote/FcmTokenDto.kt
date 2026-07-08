package com.mvorontsov.bonds.feature.push.data.remote

import kotlinx.serialization.Serializable

@Serializable
internal data class FcmTokenDto(val token: String)
