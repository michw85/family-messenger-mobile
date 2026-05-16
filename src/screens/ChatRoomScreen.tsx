/**
 * Экран чата - основная логика обмена сообщениями в реальном времени
 * Chat Room Screen - main real-time messaging logic
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Image,
    Keyboard,
    SafeAreaView,
} from 'react-native';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WS_URL } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

/**
 * Тип сообщения
 * Message type interface
 */
interface Message {
    id: string;           // Уникальный ID сообщения / Unique message ID
    sender: string;       // Отправитель / Sender name
    content: string;      // Текст или ссылка на файл / Text or file URL
    timestamp: string;    // Время отправки / Timestamp
    type?: 'TEXT' | 'IMAGE' | 'VOICE'; // Тип сообщения / Message type
    mediaUrl?: string;    // Ссылка на файл (фото/голос) / Media file URL
}

/**
 * Компонент чата с WebSocket подключением
 * Chat component with WebSocket connection
 */
export default function ChatRoomScreen({ route }: any) {
    // Получаем ID комнаты из параметров навигации
    // Get room ID from navigation params
    const { roomId } = route.params || { roomId: 'family-chat' };

    // Состояния компонента / Component states
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [connected, setConnected] = useState(false);
    const [token, setToken] = useState('');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Refs для доступа к DOM элементам / Refs for DOM elements access
    const stompClientRef = useRef<Client | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Загрузка сохранённого JWT токена из AsyncStorage
     * Load saved JWT token from AsyncStorage
     */
    useEffect(() => {
        const loadToken = async () => {
            try {
                const savedToken = await AsyncStorage.getItem('token');
                if (savedToken) setToken(savedToken);
            } catch (error) {
                console.error('Error loading token:', error);
            }
        };
        loadToken();
    }, []);

    /**
     * Отслеживание появления/скрытия клавиатуры для корректировки отступов
     * Track keyboard show/hide to adjust padding
     */
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    /**
     * WebSocket подключение и подписка на комнату
     * WebSocket connection and room subscription
     */
    useEffect(() => {
        if (!token) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: {
                Authorization: `Bearer ${token}`, // JWT токен для авторизации / JWT token for auth
            },
            debug: (str) => console.log('🐛 DEBUG:', str),
            reconnectDelay: 5000, // Переподключение через 5 секунд / Reconnect after 5 seconds

            // Обработчик успешного подключения / On successful connection
            onConnect: () => {
                setConnected(true);

                // Подписка на сообщения комнаты / Subscribe to room messages
                client.subscribe(`/topic/room/${roomId}`, (message) => {
                    const newMessage = JSON.parse(message.body);
                    setMessages(prev => [...prev, newMessage]);
                    flatListRef.current?.scrollToEnd({ animated: true });
                });

                // Подписка на статус печатания / Subscribe to typing status
                client.subscribe(`/topic/room/${roomId}/typing`, (message) => {
                    const data = JSON.parse(message.body);
                    if (data.typing) {
                        setTypingUser(data.user);
                        setTimeout(() => setTypingUser(null), 2000);
                    }
                });

                // Отправляем приветственное сообщение / Send welcome message
                client.publish({
                    destination: `/app/chat.send/${roomId}`,
                    body: JSON.stringify({ content: 'User joined the chat', type: 'JOIN' }),
                });
            },

            onDisconnect: () => setConnected(false),
            onStompError: (frame) => Alert.alert('WebSocket Error', 'Connection failed'),
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
        };
    }, [roomId, token]);

    // Авто-скролл к новым сообщениям / Auto-scroll to new messages
    useEffect(() => {
        if (messages.length) flatListRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    /**
     * Отправка текстового сообщения
     * Send text message
     */
    const sendMessage = () => {
        if (!inputText.trim() || !connected) return;

        // Оптимистичное обновление / Optimistic update
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'You',
            content: inputText,
            timestamp: new Date().toLocaleTimeString(),
            type: 'TEXT',
        }]);

        stompClientRef.current?.publish({
            destination: `/app/chat.send/${roomId}`,
            body: JSON.stringify({ content: inputText, type: 'CHAT' }),
        });

        setInputText('');
    };

    /**
     * Отправка статуса "печатает..."
     * Send typing status
     */
    const handleTyping = () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        stompClientRef.current?.publish({
            destination: `/app/typing/${roomId}`,
            body: JSON.stringify({ typing: true }),
        });

        typingTimeoutRef.current = setTimeout(() => {
            stompClientRef.current?.publish({
                destination: `/app/typing/${roomId}`,
                body: JSON.stringify({ typing: false }),
            });
        }, 1000);
    };

    /**
     * Выбор и отправка фото из галереи
     * Pick and send photo from gallery
     */
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Ошибка', 'Нет доступа к галерее / No gallery access');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            stompClientRef.current?.publish({
                destination: `/app/chat.send/${roomId}`,
                body: JSON.stringify({
                    content: '📷 Photo',
                    type: 'IMAGE',
                    mediaUrl: result.assets[0].uri,
                }),
            });
        }
    };

    /**
     * Запись голосового сообщения
     * Record voice message
     */
    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            Alert.alert('Ошибка', 'Не удалось начать запись / Failed to start recording');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        if (uri && connected) {
            stompClientRef.current?.publish({
                destination: `/app/chat.send/${roomId}`,
                body: JSON.stringify({
                    content: '🎤 Voice message',
                    type: 'VOICE',
                    mediaUrl: uri,
                }),
            });
        }
        setRecording(null);
    };

    return (
        
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.container}>
                    {/* Шапка с названием комнаты и статусом подключения */}
                    {/* Header with room name and connection status */}
                    <View style={styles.header}>
                        <Text style={styles.headerText}>Room: {roomId}</Text>
                        <Text style={[styles.status, connected ? styles.connected : styles.disconnected]}>
                            {connected ? '🟢 Connected' : '🔴 Disconnected'}
                        </Text>
                    </View>

                    {/* Индикатор печатания */}
                    {/* Typing indicator */}
                    {typingUser && (
                        <View style={styles.typingIndicator}>
                            <Text style={styles.typingText}>{typingUser} is typing...</Text>
                        </View>
                    )}

                    {/* Список сообщений */}
                    {/* Messages list */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={({ item }) => (
                            <View style={[styles.messageBubble, item.sender === 'You' && styles.myMessage]}>
                                <Text style={styles.sender}>{item.sender || 'User'}</Text>
                                {item.type === 'IMAGE' && item.mediaUrl ? (
                                    <Image source={{ uri: item.mediaUrl }} style={styles.imageMessage} />
                                ) : (
                                    <Text>{item.content}</Text>
                                )}
                                <Text style={styles.time}>{item.timestamp}</Text>
                            </View>
                        )}
                        style={styles.messageList}
                    />

                    {/* Панель ввода сообщения */}
                    {/* Message input panel */}
                    <View style={[styles.inputContainer, keyboardHeight > 0 && { paddingBottom: keyboardHeight - 20 }]}>
                        <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
                            <Text style={styles.iconText}>📷</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPressIn={startRecording}
                            onPressOut={stopRecording}
                            style={[styles.iconButton, isRecording && styles.recordingActive]}
                        >
                            <Text style={styles.iconText}>{isRecording ? '⏺' : '🎤'}</Text>
                        </TouchableOpacity>

                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={(text) => {
                                setInputText(text);
                                handleTyping();
                            }}
                            placeholder="Type a message..."
                            placeholderTextColor="#999"
                            onSubmitEditing={sendMessage}
                            returnKeyType="send"
                        />

                        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                            <Text style={styles.sendButtonText}>Send</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

    );
}

/**
 * Стили компонента
 * Component styles
 */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },

    // Шапка / Header
    header: { padding: 16, backgroundColor: '#007AFF', flexDirection: 'row', justifyContent: 'space-between' },
    headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    status: { fontSize: 14 },
    connected: { color: '#4CD964' },
    disconnected: { color: 'white' },

    // Индикатор печатания / Typing indicator
    typingIndicator: { padding: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
    typingText: { fontSize: 12, color: '#666', fontStyle: 'italic' },

    // Список сообщений / Messages list
    messageList: { flex: 1, padding: 16 },
    messageListContent: { padding: 16, paddingBottom: 20 },
    messageBubble: { backgroundColor: '#e1e1e1', padding: 12, borderRadius: 8, marginBottom: 8, maxWidth: '80%', alignSelf: 'flex-start', },
    myMessage: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
    sender: { fontWeight: 'bold', marginBottom: 4 },
    time: { fontSize: 10, color: '#666', marginTop: 4 },
    imageMessage: { width: 200, height: 200, borderRadius: 8, marginVertical: 4 },

    // Панель ввода / Input panel
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    iconButton: {
        padding: 12,
        backgroundColor: '#e1e1e1',
        borderRadius: 8,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
        width: 50,
    },
    iconText: { fontSize: 20 },
    recordingActive: { backgroundColor: '#ff4444' },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginRight: 8,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    sendButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, justifyContent: 'center', minWidth: 70 },
    sendButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
});