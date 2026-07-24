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
                // Ошибка STOMP (например "Invalid JWT token") означает, что
                // сервер отверг само соединение - слепой автоповтор через
                // reconnectDelay использовал бы тот же самый (уже
                // недействительный) токен из connectHeaders вечно, спамя той
                // же ошибкой. Останавливаем клиент, а не даём ему повторять
                // заведомо провальную попытку.
                // A STOMP error (e.g. "Invalid JWT token") means the server
                // rejected the connection itself - blind auto-reconnect via
                // reconnectDelay would keep using the same (now invalid)
                // token from connectHeaders forever, spamming the same
                // error. Stop the client instead of letting it repeat a
                // doomed attempt.
                client.deactivate();
                if (stompClient === client) {
                    stompClient = null;
                }
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
 * Подписка на изменения реакций в комнате чата
 * Subscribe to reaction changes in the chat room
 * @param roomId - идентификатор комнаты
 * @param onReactions - колбэк с обновлённым списком реакций для сообщения
 */
export const subscribeToReactions = (
    roomId: string,
    onReactions: (data: { messageId: string; reactions: { emoji: string; count: number; usernames: string[] }[] }) => void
) => {
    if (!stompClient?.connected) {
        console.warn('STOMP not connected, cannot subscribe to reactions');
        return null;
    }
    return stompClient.subscribe(`/topic/room/${roomId}/reactions`, (message) => {
        onReactions(JSON.parse(message.body));
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
export const sendMessage = (roomId: string, content: string, type: string, mediaUrl?: string, replyToId?: string, revealAt?: string) => {
    if (!stompClient?.connected) {
        console.error('STOMP client not connected');
        return;
    }
    console.log('Sending message via STOMP:', { roomId, content, type, mediaUrl, replyToId, revealAt });
    stompClient.publish({
        destination: `/app/chat.send/${roomId}`,
        body: JSON.stringify({ content, type, mediaUrl, replyToId, revealAt }),
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

/**
 * Соединение с подсчётом ссылок поверх connectWebSocket/disconnectWebSocket.
 * ChatRoomScreen подключается/отключается на mount/unmount конкретного экрана,
 * а CallProvider должен держать то же соединение живым и на других экранах
 * (RoomSelect, Profile), чтобы не пропустить входящий звонок - без переписывания
 * существующего lifecycle.
 * Ref-counted connection on top of connectWebSocket/disconnectWebSocket.
 * ChatRoomScreen connects/disconnects on that specific screen's mount/unmount,
 * while CallProvider needs the same connection to survive on other screens
 * (RoomSelect, Profile) too, so an incoming call isn't missed - without
 * rewriting the existing lifecycle.
 */
let refCount = 0;
let connectingPromise: Promise<Client> | null = null;

export const acquireWebSocket = async (token: string): Promise<Client> => {
    refCount++;
    if (stompClient?.connected) return stompClient;
    if (connectingPromise) return connectingPromise;
    connectingPromise = connectWebSocket(token).finally(() => {
        connectingPromise = null;
    });
    return connectingPromise;
};

export const releaseWebSocket = () => {
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0) {
        disconnectWebSocket();
    }
};

/**
 * Подписка на персональную очередь сигналов звонка (offer/answer/ICE/hangup) -
 * одна подписка на всю сессию приложения, а не на комнату
 * Subscribe to the personal call-signal queue (offer/answer/ICE/hangup) - one
 * subscription for the whole app session, not per room
 */
export const subscribeToCallQueue = (onSignal: (signal: any) => void) => {
    if (!stompClient?.connected) {
        console.warn('STOMP not connected, cannot subscribe to call queue');
        return null;
    }
    console.log('📞 Subscribing to /user/queue/call');
    return stompClient.subscribe('/user/queue/call', (message) => {
        console.log('📞 Call signal received:', message.body);
        onSignal(JSON.parse(message.body));
    });
};

/**
 * Отправка сигнала звонка в комнату (roomId используется сервером только для
 * авторизации и поиска собеседника, не для маршрутизации доставки)
 * Send a call signal to a room (roomId is used by the server only for
 * authorization and finding the other participant, not for delivery routing)
 */
export const sendCallSignal = (roomId: string, signal: object) => {
    if (!stompClient?.connected) {
        console.warn('STOMP not connected, cannot send call signal');
        return;
    }
    stompClient.publish({
        destination: `/app/call.signal/${roomId}`,
        body: JSON.stringify(signal),
    });
};