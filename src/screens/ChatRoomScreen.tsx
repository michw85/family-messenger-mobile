/**
 * @file ChatRoomScreen.tsx
 * @description Экран чата с облаками мыслей и анимацией отправки
 * @description Chat screen with thought bubbles and send animation
 * 
 * @author Family Messenger Team
 * @version 3.3.0
 * @license MIT
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Keyboard,
    Platform,
    Alert,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import ThoughtBubble from '../components/ThoughtBubble';
import InputPanel from '../components/InputPanel';
import TypingIndicator from '../components/TypingIndicator';
import FloatingClouds from '../components/FloatingClouds';
import { useKeyboard } from '../hooks/useKeyboard';
import { colors, spacing } from '../styles/theme';
import { Message, User } from '../types';
import { WS_URL } from '../services/api';

const { height: screenHeight } = Dimensions.get('window');

/**
 * Экран чата
 * Chat screen component
 * @param route - Параметры маршрута / Route parameters
 */
const ChatRoomScreen: React.FC<any> = ({ route }) => {
    // Получаем параметры комнаты / Get room parameters
    const { roomId, roomName } = route.params || { roomId: 'family-chat', roomName: 'Семейные мысли' };
    
    // Состояния / States
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState<string>('');
    const [connected, setConnected] = useState<boolean>(false);
    const [token, setToken] = useState<string>('');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    
    // Refs
    const stompClientRef = useRef<Client | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const insets = useSafeAreaInsets();
    
    // Хуки / Hooks
    const { isVisible: isKeyboardVisible, height: keyboardHeight } = useKeyboard();

    /**
     * Загрузка токена и данных пользователя
     * Load token and user data
     */
    useEffect(() => {
        const loadUserData = async (): Promise<void> => {
            try {
                const savedToken = await AsyncStorage.getItem('token');
                if (savedToken) {
                    setToken(savedToken);
                    // TODO: Загрузить данные пользователя / Load user data
                    setCurrentUser({ id: 1, username: 'You', email: 'user@test.com', avatarUrl: null, status: 'ONLINE' });
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        };
        loadUserData();
    }, []);

    /**
     * WebSocket подключение
     * WebSocket connection
     */
    useEffect(() => {
        if (!token) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
            onConnect: () => {
                setConnected(true);
                
                // Подписка на сообщения комнаты / Subscribe to room messages
                client.subscribe(`/topic/room/${roomId}`, (message) => {
                    const newMessage: Message = JSON.parse(message.body);
                    setMessages(prev => [...prev, newMessage]);
                    // Прокрутка к новому сообщению / Scroll to new message
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                });
                
                // Подписка на статус печатания / Subscribe to typing status
                client.subscribe(`/topic/room/${roomId}/typing`, (message) => {
                    const data = JSON.parse(message.body);
                    if (data.typing && data.user !== currentUser?.username) {
                        setTypingUser(data.user);
                        setTimeout(() => setTypingUser(null), 2000);
                    }
                });
            },
            onDisconnect: () => setConnected(false),
            onStompError: () => Alert.alert('Ошибка', 'Потеря соединения'),
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (stompClientRef.current && stompClientRef.current.active) {
                stompClientRef.current.deactivate();
            }
        };
    }, [token, roomId, currentUser]);

    /**
     * Отправка текстового сообщения
     * Send text message
     */
    const sendMessage = useCallback((): void => {
        if (!inputText.trim() || !connected) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            sender: currentUser?.username || 'You',
            content: inputText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'TEXT',
        };

        setMessages(prev => [...prev, newMessage]);
        
        stompClientRef.current?.publish({
            destination: `/app/chat.send/${roomId}`,
            body: JSON.stringify({ content: inputText, type: 'CHAT' }),
        });

        setInputText('');
        
        // Прокрутка после отправки / Scroll after send
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
    }, [inputText, connected, roomId, currentUser]);

    /**
     * Обработчик печатания с debounce
     * Typing handler with debounce
     */
    const handleTyping = useCallback((): void => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        stompClientRef.current?.publish({
            destination: `/app/typing/${roomId}`,
            body: JSON.stringify({ typing: true, user: currentUser?.username }),
        });
        
        typingTimeoutRef.current = setTimeout(() => {
            stompClientRef.current?.publish({
                destination: `/app/typing/${roomId}`,
                body: JSON.stringify({ typing: false, user: currentUser?.username }),
            });
        }, 1000);
    }, [roomId, currentUser]);

    /**
     * Выбор и отправка фото
     * Pick and send photo
     */
    const pickImage = async (): Promise<void> => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Ошибка', 'Нет доступа к галерее');
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
                    content: '📷 Фото',
                    type: 'IMAGE',
                    mediaUrl: result.assets[0].uri,
                }),
            });
        }
    };

    /**
     * Начало записи голоса
     * Start voice recording
     */
    const startRecording = async (): Promise<void> => {
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
            Alert.alert('Ошибка', 'Не удалось начать запись');
        }
    };

    /**
     * Остановка записи и отправка голоса
     * Stop recording and send voice
     */
    const stopRecording = async (): Promise<void> => {
        if (!recording) return;
        
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        if (uri && connected) {
            stompClientRef.current?.publish({
                destination: `/app/chat.send/${roomId}`,
                body: JSON.stringify({
                    content: '🎙️ Голосовое сообщение',
                    type: 'VOICE',
                    mediaUrl: uri,
                }),
            });
        }
        setRecording(null);
    };

    /**
     * Рендер сообщения
     * Render message
     */
    const renderMessage = useCallback(({ item }: { item: Message }) => (
        <ThoughtBubble
            content={item.content}
            sender={item.sender}
            timestamp={item.timestamp}
            isMyMessage={item.sender === currentUser?.username}
            type={item.type}
            mediaUrl={item.mediaUrl}
            userColor={colors.primary}
        />
    ), [currentUser]);

    /**
     * Ключ для FlatList
     * FlatList key extractor
     */
    const keyExtractor = useCallback((_: Message, index: number) => `${index}-${_.id}`, []);

    // Расчёт отступа для панели ввода / Calculate input panel padding
    const inputPanelBottom = isKeyboardVisible 
        ? keyboardHeight - (Platform.OS === 'ios' ? 0 : 20)
        : (Platform.OS === 'ios' ? insets.bottom + 15 : 20);

    return (
        <View style={styles.container}>
            {/* Фоновый градиент / Background gradient */}
            <LinearGradient
                colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />
            
            {/* Декоративные облака / Decorative clouds */}
            <FloatingClouds />
            
            {/* Индикатор печатания / Typing indicator */}
            {typingUser && <TypingIndicator username={typingUser} />}
            
            {/* Список сообщений / Messages list */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={keyExtractor}
                renderItem={renderMessage}
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }}
                onLayout={() => {
                    if (messages.length > 0) {
                        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
                    }
                }}
            />
            
            {/* Панель ввода / Input panel */}
            <View style={{ paddingBottom: inputPanelBottom }}>
                <InputPanel
                    inputText={inputText}
                    setInputText={setInputText}
                    onSend={sendMessage}
                    onTyping={handleTyping}
                    onPickImage={pickImage}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    isRecording={isRecording}
                    isSending={false}
                    isConnected={connected}
                />
            </View>
        </View>
    );
}

/**
 * Стили экрана чата
 * Chat screen styles
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    messageList: {
        flex: 1,
    },
    messageListContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
});

export default ChatRoomScreen;