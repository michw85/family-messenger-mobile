package com.mvorontsov.bonds.core.network

import com.mvorontsov.bonds.core.session.SessionStorage
import io.github.aakira.napier.Napier
import io.ktor.client.HttpClient
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.request.header
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/**
 * Единый Ktor-клиент приложения. Engine выбирается автоматически по платформе
 * (okhttp на Android, darwin на iOS). JWT-токен подставляется из [session]
 * на каждый запрос — читается заново, поэтому после логина заголовок появляется без пересоздания клиента.
 */
fun createHttpClient(session: SessionStorage): HttpClient = HttpClient {
    expectSuccess = true

    install(WebSockets)

    install(ContentNegotiation) {
        json(
            Json {
                ignoreUnknownKeys = true
                isLenient = true
                encodeDefaults = true
            }
        )
    }

    defaultRequest {
        url(ApiConfig.BASE_URL)
        contentType(ContentType.Application.Json)
        session.token?.let { token ->
            header(HttpHeaders.Authorization, "Bearer $token")
        }
    }
}.also { Napier.d("HttpClient создан, base=${ApiConfig.BASE_URL}") }
