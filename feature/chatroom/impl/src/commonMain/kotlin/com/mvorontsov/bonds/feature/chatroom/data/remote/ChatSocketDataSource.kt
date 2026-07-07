package com.mvorontsov.bonds.feature.chatroom.data.remote

import com.mvorontsov.bonds.core.network.ApiConfig
import com.mvorontsov.bonds.core.session.SessionStorage
import io.github.aakira.napier.Napier
import io.ktor.client.HttpClient
import kotlinx.coroutines.flow.Flow
import org.hildan.krossbow.stomp.StompClient
import org.hildan.krossbow.stomp.StompSession
import org.hildan.krossbow.stomp.sendText
import org.hildan.krossbow.stomp.subscribeText
import org.hildan.krossbow.websocket.ktor.KtorWebSocketClient

/** STOMP поверх Ktor WebSocket (raw-транспорт SockJS). */
internal class ChatSocketDataSource(
    httpClient: HttpClient,
    private val session: SessionStorage,
) {
    private val stompClient = StompClient(KtorWebSocketClient(httpClient))
    private var stompSession: StompSession? = null

    suspend fun connect() {
        if (stompSession != null) return
        val headers = session.token?.let { mapOf("Authorization" to "Bearer $it") }.orEmpty()
        stompSession = stompClient.connect(ApiConfig.STOMP_URL, customStompConnectHeaders = headers)
        Napier.d("STOMP подключён")
    }

    suspend fun subscribe(roomId: String): Flow<String> {
        val active = stompSession ?: error("STOMP не подключён")
        return active.subscribeText("/topic/room/$roomId")
    }

    suspend fun send(roomId: String, body: String) {
        stompSession?.sendText("/app/chat.send/$roomId", body)
    }

    suspend fun disconnect() {
        stompSession?.disconnect()
        stompSession = null
    }
}
