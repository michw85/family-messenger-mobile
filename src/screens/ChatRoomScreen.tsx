/**
 * @file ChatRoomScreen.tsx
 * @description Экран чата с загрузкой истории сообщений и WebSocket в реальном времени
 * @description Chat screen with message history and real‑time WebSocket
 * 
 * @author Bonds Team
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
    KeyboardAvoidingView,
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
import { colors, spacing, borderRadius, shadows, typography } from '../styles/theme';
import AddParticipantsModal from '../components/AddParticipantsModal';

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
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [addParticipantsVisible, setAddParticipantsVisible] = useState(false);

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
            setMessages(response.data.reverse());
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
        if (!token) {
            console.log('No token, skipping WebSocket connection');
            return;
        }
        try {
            const client = await connectWebSocket(token);
            stompClientRef.current = client;
            console.log('WebSocket connected, subscribing to room:', roomId);
            // Подписываемся на топик комнаты
            const sub = subscribeToRoom(roomId, (newMessage: Message) => {
                console.log('New message received:', newMessage);
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
 * Начало записи голоса
 * Start voice recording
 */
    const startRecording = useCallback(async () => {
        // Если уже идёт запись – ничего не делаем
        if (recording) {
            console.log('Recording already in progress');
            return;
        }

        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('error'), 'Нет доступа к микрофону');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(newRecording);
            setIsRecording(true);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert(t('error'), 'Не удалось начать запись');
        }
    }, [recording, t]);

    /**
     * Остановка записи и отправка голосового сообщения
     * Stop recording and send voice message
     */
    const stopRecording = useCallback(async () => {
        if (!recording) {
            console.log('No recording to stop');
            setIsRecording(false); // сброс, если запись не активна
            return;
        }

        try {
            setIsRecording(false); // сразу меняем UI
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null); // сброс состояния

            if (!uri) {
                console.error('Recording URI is null');
                return;
            }

            const formData = new FormData();
            formData.append('file', {
                uri: uri,
                type: 'audio/m4a',
                name: 'voice.m4a',
            } as any);

            const uploadRes = await uploadFile(formData, 'voice');
            const mediaUrl = uploadRes.data.url;
            wsSendMessage(roomId, '🎤 Voice message', 'VOICE', mediaUrl);
        } catch (error) {
            console.error('Failed to send voice message', error);
            Alert.alert(t('error'), 'Не удалось отправить голосовое сообщение');
        } finally {
            setIsRecording(false);
            setRecording(null);
        }
    }, [recording, roomId, t]);

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
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
        >
            <View style={styles.container}>
                {/* Тёплый градиент Bonds вместо холодного */}
                <LinearGradient colors={['#FDF8F0', '#F5E6CA', '#E8D5B8']}
                    style={StyleSheet.absoluteFillObject} />
                <FloatingClouds />

                {/* Заголовок чата — прозрачный с тенью */}
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                    <Text style={styles.headerTitle}>{roomName}</Text>
                    <TouchableOpacity onPress={() => setAddParticipantsVisible(true)} style={styles.addButton}>
                        <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
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

                {/* Панель ввода с новыми цветами */}
                {/* <View style={[styles.inputWrapper, { paddingBottom: insets.bottom + 12 }]}> */}
                <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                        {/* Кнопка фото */}
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
                            placeholderTextColor={colors.textMuted}
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
                {/* Модалка добавления участников */}
                <AddParticipantsModal
                    visible={addParticipantsVisible}
                    onClose={() => setAddParticipantsVisible(false)}
                    chatId={roomId}
                    onParticipantsAdded={() => {
                        Alert.alert('Участники добавлены');
                        // При необходимости можно перезагрузить список участников
                    }}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

/**
 * Стили экрана чата в стиле Bonds
 * Chat screen styles in Bonds style
*/
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // теперь кремовый
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Заголовок стал чуть прозрачнее и теплее
    header: {
        backgroundColor: 'rgba(255, 248, 240, 0.85)',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
        borderBottomLeftRadius: borderRadius.large,
        borderBottomRightRadius: borderRadius.large,
        alignItems: 'center',
        ...shadows.soft,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary, // индиго
        letterSpacing: 0.5,
    },
    /**
     * Кнопка добавления участников
     * Add participants button
     */
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.soft,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '300',
        marginTop: -2,
        textAlign: 'center',
    },
    messageList: {
        flex: 1,
    },
    messageListContent: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    // Панель ввода с тёплым фоном
    inputWrapper: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: 'rgba(255, 248, 240, 0.96)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        paddingBottom: spacing.md,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
    },
    // Иконки — теперь с мягким фоном
    iconButton: {
        padding: spacing.sm,
        backgroundColor: '#F5F0EA',
        borderRadius: borderRadius.circle,
        justifyContent: 'center',
        alignItems: 'center',
        width: 44,
        height: 44,
        ...shadows.soft,
    },
    iconText: {
        fontSize: 20,
    },
    recordingActive: {
        backgroundColor: '#FFE8E0',
    },
    // Поле ввода — светлое с тёплой границей
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xlarge,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.backgroundLight,
        fontSize: 15,
        color: colors.text,
        maxHeight: 80,
        ...shadows.soft,
    },
    // Кнопка отправки — индиго
    sendButton: {
        backgroundColor: colors.primary,
        width: 44,
        height: 44,
        borderRadius: borderRadius.circle,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.medium,
    },
    sendButtonDisabled: {
        backgroundColor: colors.textMuted,
        opacity: 0.7,
    },
    sendButtonText: {
        color: colors.textLight,
        fontSize: 24,
        fontWeight: '600',
        marginTop: -2,
    },
});

export default ChatRoomScreen;