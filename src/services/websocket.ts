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
    return new Promise((resolve, reject) => {
        const client = new Client({
            // webSocketFactory: () => new WebSocket('ws://165.245.213.90:8080/ws'),
            webSocketFactory: () => new SockJS('http://165.245.213.90:8080/ws'),
            // webSocketFactory: () => new SockJS('http://192.168.106.112:8080/ws'),
            // webSocketFactory: () => new SockJS('http://10.0.2.2:8080/ws'),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
            onConnect: () => {
                stompClient = client;
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
    if (!stompClient) return null;
    return stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
        onMessage(JSON.parse(message.body));
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
export const sendMessage = (roomId: string, content: string, type: string, mediaUrl?: string) => {
    if (!stompClient) {
        console.error('STOMP client not connected');
        return;
    }
    console.log('Sending message via STOMP:', { roomId, content, type, mediaUrl });
    stompClient.publish({
        destination: `/app/chat.send/${roomId}`,
        body: JSON.stringify({ content, type, mediaUrl }),
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