/**
 * WebSocket клиент для обмена сообщениями в реальном времени
 * WebSocket client for real-time messaging
 */

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getCurrentUser } from './api';
import { getToken } from './authStorage';


let stompClient: Client | null = null;

/**
 * Слушатели "переподключения" WebSocket - см. connectWebSocket's onConnect.
 * КОРЕНЬ БАГА (задача #86): в stomp.js автопереподключение (reconnectDelay)
 * восстанавливает только сам транспорт, но НЕ переиздаёт заново все ранее
 * сделанные client.subscribe() - все подписки экрана чата (room/typing/
 * read/reactions) остаются привязаны к старому, уже недействительному
 * соединению и молча перестают получать что-либо, хотя client.connected
 * снова true и отправка сообщений (publish) работает как ни в чём не бывало.
 * Отсюда и жалобы "сообщения не приходят, пока не выйти из чата и не
 * зайти заново" - повторный вход просто вызывает subscribe() заново.
 * Экраны (ChatRoomScreen, CallProvider) регистрируют здесь колбэк, который
 * заново переподписывается при каждом реальном переподключении - не только
 * при первом подключении, которое обрабатывается ожиданием промиса
 * connectWebSocket()/acquireWebSocket() как раньше.
 *
 * Reconnect listeners for the WebSocket - see connectWebSocket's onConnect.
 * ROOT CAUSE (task #86): stomp.js's automatic reconnect (reconnectDelay)
 * only restores the transport itself, it does NOT reissue any of the
 * previously made client.subscribe() calls - all of a chat screen's
 * subscriptions (room/typing/read/reactions) stay bound to the old, now-dead
 * connection and silently stop receiving anything, even though
 * client.connected is true again and sending messages (publish) works fine.
 * This is why messages stopped arriving until leaving and re-entering the
 * chat - re-entering just calls subscribe() again from scratch.
 * Screens (ChatRoomScreen, CallProvider) register a callback here that
 * re-subscribes on every actual reconnect - not just the first connection,
 * which is already handled by awaiting connectWebSocket()/acquireWebSocket()'s
 * promise as before.
 */
const reconnectListeners = new Set<() => void>();

export const onWebSocketReconnect = (listener: () => void): (() => void) => {
    reconnectListeners.add(listener);
    return () => reconnectListeners.delete(listener);
};

/**
 * Подключение к WebSocket и получение клиента
 * Connect to WebSocket and obtain client
 */
export const connectWebSocket = async (): Promise<Client> => {
    // Деактивируем старый клиент перед созданием нового / Deactivate the old client before creating a new one.
    if (stompClient) {
        stompClient.deactivate();
        stompClient = null;
    }
    return new Promise((resolve, reject) => {
        // true только для самого первого onConnect этого клиента - именно он
        // резолвит промис. Любой следующий onConnect для того же клиента -
        // это уже автопереподключение stomp.js (см. reconnectListeners выше).
        // true only for this client's very first onConnect - that one
        // resolves the promise. Any later onConnect for the same client is
        // stomp.js's automatic reconnect (see reconnectListeners above).
        let isFirstConnect = true;
        const client = new Client({
            // webSocketFactory: () => new WebSocket('ws://165.245.213.90:8080/ws'),
            // webSocketFactory: () => new SockJS('http://165.245.213.90:8080/ws'),
            // webSocketFactory: () => new SockJS('http://192.168.106.112:8080/ws'),
            // webSocketFactory: () => new SockJS('http://10.0.2.2:8080/ws'),
            webSocketFactory: () => new SockJS('https://bonds-app.duckdns.org/ws'),
            reconnectDelay: 5000,
            heartbeatIncoming: 20000,
            heartbeatOutgoing: 20000,
            // Вызывается перед КАЖДОЙ попыткой подключения, включая
            // автоматические ретраи через reconnectDelay - без этого
            // connectHeaders фиксировался бы один раз при создании клиента,
            // и любой автопереподключение поздее в долгой сессии (access-
            // токен живёт ~15 минут) слало бы уже протухший токен снова и
            // снова, получая "Invalid JWT token" вечно.
            // Called before EVERY connection attempt, including automatic
            // retries via reconnectDelay - without this, connectHeaders
            // would be fixed once at client creation, and any auto-
            // reconnect later in a long session (the access token lives
            // ~15 minutes) would keep sending the now-stale token forever,
            // hitting "Invalid JWT token" every time.
            beforeConnect: async () => {
                await getCurrentUser();
                const token = await getToken();
                client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            },
            onConnect: () => {
                stompClient = client;
                if (isFirstConnect) {
                    isFirstConnect = false;
                    console.log('✅ WebSocket connected');
                    resolve(client);
                } else {
                    console.log('🔁 WebSocket reconnected - notifying subscribers to re-subscribe');
                    reconnectListeners.forEach((listener) => {
                        try {
                            listener();
                        } catch (e) {
                            console.error('WebSocket reconnect listener failed', e);
                        }
                    });
                }
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
/**
 * Возвращает false, если публикация не удалась (сокет не подключён) - раньше
 * это молча логировалось в консоль и терялось, вызывающий код не мог узнать,
 * что сообщение на самом деле никуда не ушло (задача #87)
 * Returns false if publishing failed (socket not connected) - previously
 * this was silently logged to the console and lost, the calling code had no
 * way to find out the message never actually went anywhere (task #87)
 */
export const sendMessage = (roomId: string, content: string, type: string, mediaUrl?: string, replyToId?: string, revealAt?: string): boolean => {
    if (!stompClient?.connected) {
        console.error('STOMP client not connected');
        return false;
    }
    console.log('Sending message via STOMP:', { roomId, content, type, mediaUrl, replyToId, revealAt });
    stompClient.publish({
        destination: `/app/chat.send/${roomId}`,
        body: JSON.stringify({ content, type, mediaUrl, replyToId, revealAt }),
    });
    return true;
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

export const acquireWebSocket = async (): Promise<Client> => {
    refCount++;
    if (stompClient?.connected) return stompClient;
    if (connectingPromise) return connectingPromise;
    // Токен для подключения читается и при необходимости обновляется
    // внутри connectWebSocket's beforeConnect - см. его комментарий.
    // The connection token is read and refreshed as needed inside
    // connectWebSocket's beforeConnect - see its comment.
    connectingPromise = connectWebSocket().finally(() => {
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