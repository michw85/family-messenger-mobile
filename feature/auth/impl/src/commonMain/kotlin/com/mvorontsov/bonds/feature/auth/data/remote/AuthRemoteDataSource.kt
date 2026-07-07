package com.mvorontsov.bonds.feature.auth.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody

/** Доступ к auth-эндпоинтам бэкенда. Оперирует DTO. */
internal class AuthRemoteDataSource(private val client: HttpClient) {

    suspend fun login(username: String, password: String): AuthResponseDto =
        client.post("auth/login") { setBody(LoginRequestDto(username, password)) }.body()

    suspend fun register(username: String, email: String, password: String): AuthResponseDto =
        client.post("auth/register") { setBody(RegisterRequestDto(username, email, password)) }.body()
}
