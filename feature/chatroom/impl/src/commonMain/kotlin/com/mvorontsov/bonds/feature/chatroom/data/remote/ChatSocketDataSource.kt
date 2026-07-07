package com.mvorontsov.bonds.feature.chatroom.data.remote

import com.mvorontsov.bonds.core.network.ApiConfig
import com.mvorontsov.bonds.core.session.SessionStorage
import io.github.aakira.napier.Napier
import io.ktor.client.HttpClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import org.hildan.krossbow.stomp.StompClient
import org.hildan.krossbow.stomp.StompSession
import org.hildan.krossbow.stomp.sendText
import org.hildan.krossbow.stomp.subscribeText
import org.hildan.krossbow.websocket.ktor.KtorWebSocketClient

/** STOMP поверх Ktor WebSocket (raw-транспорт SockJS). Своё соединение на каждый экран чата. */
internal class ChatSocketDataSource(
    httpClient: HttpClient,
    private val session: SessionStorage,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val stompClient = StompClient(KtorWebSocketClient(httpClient))
    private var stompSession: StompSession? = null
    private var connectedToken: String? = null

    suspend fun connect(force: Boolean = false) {
        val token = session.token
        // Переподключаемся, если сокета нет, форс, или сменился токен (релогин).
        if (!force && stompSession != null && token == connectedToken) return
        stompSession?.let { old -> runCatching { old.disconnect() } }
        val headers = token?.let { mapOf("Authorization" to "Bearer $it") }.orEmpty()
        stompSession = stompClient.connect(ApiConfig.STOMP_URL, customStompConnectHeaders = headers)
        connectedToken = token
        Napier.d("STOMP подключён")
    }

    suspend fun subscribe(roomId: String): Flow<String> {
        val active = stompSession ?: error("STOMP не подключён")
        return active.subscribeText("/topic/room/$roomId")
    }

    suspend fun send(roomId: String, body: String) {
        stompSession?.sendText("/app/chat.send/$roomId", body)
    }

    /** Закрыть соединение и освободить скоуп (из VM.onCleared). */
    fun dispose() {
        val active = stompSession
        stompSession = null
        scope.launch { runCatching { active?.disconnect() } }
            .invokeOnCompletion { scope.cancel() }
    }
}
