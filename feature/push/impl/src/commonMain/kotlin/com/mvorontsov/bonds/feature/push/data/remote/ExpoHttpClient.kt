package com.mvorontsov.bonds.feature.push.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/** Клиент для Expo — отдельный, без JWT нашего бэка (Expo отвергает чужой bearer). */
internal class ExpoHttpClient(val client: HttpClient)

internal fun createExpoHttpClient(): ExpoHttpClient = ExpoHttpClient(
    HttpClient {
        expectSuccess = true
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; encodeDefaults = true })
        }
    },
)
