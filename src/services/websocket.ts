/**
 * WebSocket клиент для обмена сообщениями в реальном времени
 * WebSocket client for real-time messaging
 */

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';


let stompClient: Client | null = null;

/**
 * Подключение к WebSocket и получение клиента
 * Connect to WebSocket and obtain client
 * @param token - JWT токен для авторизации
 */
export const connectWebSocket = async (token: string): Promise<Client> => {
    // Деактивируем старый клиент перед созданием нового / Deactivate the old client before creating a new one.
    if (stompClient) {
        stompClient.deactivate();
        stompClient = null;
    }
    return new Promise((resolve, reject) => {
        const client = new Client({
            // webSocketFactory: () => new WebSocket('ws://165.245.213.90:8080/ws'),
            // webSocketFactory: () => new SockJS('http://165.245.213.90:8080/ws'),
            // webSocketFactory: () => new SockJS('http://192.168.106.112:8080/ws'),
            // webSocketFactory: () => new SockJS('http://10.0.2.2:8080/ws'),
            webSocketFactory: () => new SockJS('https://bonds-app.duckdns.org/ws'),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
            heartbeatIncoming: 20000,
            heartbeatOutgoing: 20000,
            onConnect: () => {
                stompClient = client;
                console.log('✅ WebSocket connected');
                resolve(client);
            },
            onStompError: (frame) => {
                console.error('STOMP error', frame);
                reject(frame);
            },
            onWebSocketClose: () => console.log('🔌 WebSocket closed'),
            onWebSocketError: (event) => console.error('❌ WebSocket error', event),
        });
        client.activate();
    });
};

/**
 * Подписка на топик комнаты чата
 * Subscribe to chat room topic
 * @param roomId - идентификатор комнаты
 * @param onMessage - колбэк при получении сообщения
 */
export const subscribeToRoom = (roomId: string, onMessage: (msg: any) => void) => {
    if (!stompClient?.connected) {
        console.warn('STOMP not connected, cannot subscribe');
        return null;
    }
    return stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
        onMessage(JSON.parse(message.body));
    });
};

/**
 * Подписка на индикатор печати в комнате чата
 * Subscribe to the room's typing indicator
 * @param roomId - идентификатор комнаты
 * @param onTyping - колбэк, вызываемый когда кто-то печатает
 */
export const subscribeToTyping = (roomId: string, onTyping: (data: { user: string; typing: boolean }) => void) => {
    if (!stompClient?.connected) {
        console.warn('STOMP not connected, cannot subscribe to typing');
        return null;
    }
    return stompClient.subscribe(`/topic/room/${roomId}/typing`, (message) => {
        onTyping(JSON.parse(message.body));
    });
};

/**
 * Уведомление о том, что текущий пользователь печатает
 * Notify that the current user is typing
 * @param roomId - идентификатор комнаты
 */
export const sendTyping = (roomId: string) => {
    if (!stompClient?.connected) return;
    stompClient.publish({
        destination: `/app/typing/${roomId}`,
        body: '',
    });
};

/**
 * Подписка на события "прочитано" в комнате чата
 * Subscribe to the room's read-receipt events
 * @param roomId - идентификатор комнаты
 * @param onRead - колбэк, вызываемый когда кто-то отмечает чат прочитанным
 */
export const subscribeToRead = (roomId: string, onRead: (data: { username: string; readAt: string }) => void) => {
    if (!stompClient?.connected) {
        console.warn('STOMP not connected, cannot subscribe to read receipts');
        return null;
    }
    return stompClient.subscribe(`/topic/room/${roomId}/read`, (message) => {
        onRead(JSON.parse(message.body));
    });
};

/**
 * Отправка сообщения в комнату
 * Send message to room
 * @param roomId - идентификатор комнаты
 * @param content - текст сообщения
 * @param type - тип сообщения (TEXT, IMAGE, VOICE)
 * @param mediaUrl - URL медиафайла (опционально)
 */
export const sendMessage = (roomId: string, content: string, type: string, mediaUrl?: string, replyToId?: string) => {
    if (!stompClient?.connected) {
        console.error('STOMP client not connected');
        return;
    }
    console.log('Sending message via STOMP:', { roomId, content, type, mediaUrl, replyToId });
    stompClient.publish({
        destination: `/app/chat.send/${roomId}`,
        body: JSON.stringify({ content, type, mediaUrl, replyToId }),
    });
};

/**
 * Отключение от WebSocket
 * Disconnect WebSocket
 */
export const disconnectWebSocket = () => {
    if (stompClient) {
        stompClient.deactivate();
        stompClient = null;
    }
};