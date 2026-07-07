package com.mvorontsov.bonds.core.network

/** Адреса бэкенда Bonds. BASE_URL с завершающим слэшем — фичи бьют относительными путями без ведущего слэша (`get("auth/me")`). */
object ApiConfig {
    const val BASE_URL = "https://bonds-app.duckdns.org/api/"

    /** SockJS-эндпоинт, raw-WebSocket транспорт для STOMP. */
    const val STOMP_URL = "wss://bonds-app.duckdns.org/ws/websocket"
}
