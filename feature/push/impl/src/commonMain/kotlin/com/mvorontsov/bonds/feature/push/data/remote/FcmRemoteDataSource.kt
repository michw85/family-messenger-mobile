package com.mvorontsov.bonds.feature.push.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.request.post
import io.ktor.client.request.setBody

internal class FcmRemoteDataSource(private val client: HttpClient) {
    suspend fun register(token: String) {
        client.post("auth/fcm-token") { setBody(FcmTokenDto(token)) }
    }
}
