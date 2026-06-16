/**
 * @file ChatRoomScreen.tsx
 * @description Экран чата с загрузкой истории сообщений и WebSocket в реальном времени
 * @description Chat screen with message history and real‑time WebSocket
 * 
 * @author Family Messenger Team
 * @version 5.0.0
 * @license MIT
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Keyboard,
    Platform,
    Alert,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import ThoughtBubble from '../components/ThoughtBubble';
import FloatingClouds from '../components/FloatingClouds';
import { useLanguage } from '../context/LanguageContext';
import { fetchMessages, uploadFile } from '../services/api';
import { connectWebSocket, subscribeToRoom, sendMessage as wsSendMessage, disconnectWebSocket } from '../services/websocket';

/**
 * Интерфейс сообщения (соответствует DTO бэкенда)
 * Message interface (matches backend DTO)
 */
interface Message {
    id: string;
    sender: {
        id: number;
        username: string;
        avatarUrl?: string;
    };
    content: string;
    type: 'TEXT' | 'IMAGE' | 'VOICE';
    mediaUrl?: string;
    timestamp: string;
}

/**
 * Экран чата
 * Chat screen component
 */
const ChatRoomScreen: React.FC<any> = ({ route }) => {
    const { roomId, roomName } = route.params || { roomId: 'family-chat', roomName: 'Family Chat' };
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();

    // Состояния
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState<string>('');
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [currentUsername, setCurrentUsername] = useState<string>('');
    const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [sending, setSending] = useState<boolean>(false);

    // Refs
    const flatListRef = useRef<FlatList>(null);
    const stompClientRef = useRef<any>(null);
    const subscriptionRef = useRef<any>(null);

    /**
     * Загрузка истории сообщений через REST API
     * Load message history via REST API
     */
    const loadMessages = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchMessages(roomId);
            setMessages(response.data);
        } catch (error) {
            console.error('Failed to load messages:', error);
            Alert.alert(t('error'), 'Could not load messages');
        } finally {
            setLoading(false);
        }
    }, [roomId, t]);

    /**
     * Получение имени текущего пользователя
     * Get current username
     */
    const loadCurrentUser = useCallback(async () => {
        const name = await AsyncStorage.getItem('username');
        if (name) setCurrentUsername(name);
    }, []);

    /**
     * Настройка WebSocket и подписка на комнату
     * Setup WebSocket and subscribe to room
     */
    const setupWebSocket = useCallback(async () => {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        try {
            const client = await connectWebSocket(token);
            stompClientRef.current = client;
            // Подписываемся на топик комнаты
            const sub = subscribeToRoom(roomId, (newMessage: Message) => {
                setMessages(prev => [...prev, newMessage]);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            });
            subscriptionRef.current = sub;
        } catch (error) {
            console.error('WebSocket connection failed:', error);
        }
    }, [roomId]);

    // Загрузка данных при монтировании
    useEffect(() => {
        loadCurrentUser();
        loadMessages();
        setupWebSocket();
        // Отписка при размонтировании
        return () => {
            if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
            disconnectWebSocket();
        };
    }, [loadCurrentUser, loadMessages, setupWebSocket]);

    // Автоматическая прокрутка при новых сообщениях
    useEffect(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    /**
     * Отправка текстового сообщения через WebSocket
     * Send text message via WebSocket
     */
    const sendTextMessage = useCallback(() => {
        if (!inputText.trim() || !stompClientRef.current) return;
        console.log('Sending message:', { roomId, inputText });
        wsSendMessage(roomId, inputText.trim(), 'TEXT');
        setInputText('');
        setSending(false);
    }, [inputText, roomId]);

    /**
     * Отправка изображения (загрузка на сервер, затем WebSocket)
     * Send image (upload to server, then WebSocket)
     */
    const sendImage = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('error'), t('no_access'));
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setSending(true);
            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: result.assets[0].uri,
                    type: 'image/jpeg',
                    name: 'photo.jpg',
                } as any);
                const uploadRes = await uploadFile(formData, 'image');
                const mediaUrl = uploadRes.data.url;
                wsSendMessage(roomId, '📷 Photo', 'IMAGE', mediaUrl);
            } catch (error) {
                Alert.alert(t('error'), 'Failed to send image');
            } finally {
                setSending(false);
            }
        }
    }, [roomId, t]);

    /**
     * Начало записи голоса (заглушка, можно расширить)
     * Start voice recording (placeholder)
     */
    const startRecording = useCallback(async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            setIsRecording(true);
            setTimeout(() => stopRecording(), 3000);
        } catch (err) {
            Alert.alert(t('error'), 'Could not start recording');
        }
    }, [t]);

    /**
     * Остановка записи и отправка голосового сообщения
     * Stop recording and send voice message
     */
    const stopRecording = useCallback(async () => {
        setIsRecording(false);
        // Здесь нужно получить URI записанного файла и загрузить его на сервер
        // Для примера отправляем фиктивное сообщение
        wsSendMessage(roomId, '🎤 Voice message', 'VOICE', 'mock_voice_url');
    }, [roomId]);

    /**
     * Рендер одного сообщения
     * Render a single message
     */
    const renderMessage = useCallback(({ item }: { item: Message }) => (
        <ThoughtBubble
            content={item.content}
            sender={item.sender.username}
            timestamp={new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            isMyMessage={item.sender.username === currentUsername}
            type={item.type}
            mediaUrl={item.mediaUrl}
        />
    ), [currentUsername]);

    const keyExtractor = useCallback((item: Message, index: number) => `${index}-${item.id}`, []);

    // Обработчики клавиатуры для плавной прокрутки
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#6C5CE7" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']} style={StyleSheet.absoluteFillObject} />
            <FloatingClouds />

            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>{roomName}</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={keyExtractor}
                renderItem={renderMessage}
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />

            <View style={[styles.inputWrapper, { paddingBottom: keyboardVisible ? 12 : insets.bottom + 12 }]}>
                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={sendImage} style={styles.iconButton} disabled={sending}>
                        <Text style={styles.iconText}>📷</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                        style={[styles.iconButton, isRecording && styles.recordingActive]}
                    >
                        <Text style={styles.iconText}>{isRecording ? '🔴' : '🎙️'}</Text>
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={t('placeholder')}
                        placeholderTextColor="#95A5A6"
                        onSubmitEditing={sendTextMessage}
                        returnKeyType="send"
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
                        onPress={sendTextMessage}
                        disabled={!inputText.trim() || sending}
                    >
                        <Text style={styles.sendButtonText}>↑</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#2C3E50' },
    messageList: { flex: 1 },
    messageListContent: { paddingHorizontal: 8, paddingVertical: 16, paddingBottom: 24 },
    inputWrapper: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(255,255,255,0.96)',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    iconButton: {
        padding: 10,
        backgroundColor: '#F0F0F5',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        width: 44,
        height: 44,
    },
    iconText: { fontSize: 20 },
    recordingActive: { backgroundColor: '#FFE0E0' },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        borderRadius: 30,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        fontSize: 15,
        color: '#2C3E50',
        maxHeight: 80,
    },
    sendButton: {
        backgroundColor: '#6C5CE7',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: { backgroundColor: '#B0A0D0', opacity: 0.7 },
    sendButtonText: { color: '#FFFFFF', fontSize: 24, fontWeight: '600', marginTop: -2 },
});

export default ChatRoomScreen;