/**
 * @file ChatRoomScreen.tsx
 * @description Экран чата с загрузкой истории сообщений и WebSocket в реальном времени
 * @description Chat screen with message history and real‑time WebSocket
 * 
 * @author Bonds Team
 * @version 5.0.0
 * @license MIT
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    TouchableWithoutFeedback,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import ThoughtBubble from '../components/ThoughtBubble';
import FloatingClouds from '../components/FloatingClouds';
import ParticipantsModal from '../components/ParticipantsModal';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { fetchMessages, uploadFile, searchMessages, editMessage, deleteMessage } from '../services/api';
import { connectWebSocket, subscribeToRoom, sendMessage as wsSendMessage, disconnectWebSocket } from '../services/websocket';
import { spacing, borderRadius, shadows, typography, AppColors } from '../styles/theme';
import AddParticipantsModal from '../components/AddParticipantsModal';
import ImageView from 'react-native-image-viewing';
import { formatMessageTime, formatMessageDate } from '../utils/dateTime';

const MESSAGES_PAGE_SIZE = 30;

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
    grouped?: boolean;
    edited?: boolean;
    deleted?: boolean;
}

/**
 * Экран чата
 * Chat screen component
 */
const ChatRoomScreen: React.FC<any> = ({ route, navigation }) => {
    const { roomId, roomName } = route.params || { roomId: 'family-chat', roomName: 'Family Chat' };
    const { t } = useLanguage();
    const { theme, colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const insets = useSafeAreaInsets();

    // Состояния
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState<string>('');
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [currentUsername, setCurrentUsername] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [sending, setSending] = useState<boolean>(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [addParticipantsVisible, setAddParticipantsVisible] = useState(false);
    const [participantsVisible, setParticipantsVisible] = useState(false);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Пагинация истории / Message history pagination
    const [page, setPage] = useState(0);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Поиск по чату / Search within the chat
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [searching, setSearching] = useState(false);

    // Редактирование сообщения / Message editing
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editText, setEditText] = useState('');

    /**
     * Сообщения с флагом группировки: true, если предыдущее сообщение от того
     * же отправителя отправлено не позже чем через 2 минуты - тогда пузыри
     * рисуются плотнее, без повтора имени (как в Telegram/WhatsApp)
     * Messages with a grouping flag: true if the previous message is from the
     * same sender and was sent within 2 minutes - renders tighter bubbles
     * without repeating the sender name (like Telegram/WhatsApp)
     */
    const messagesWithGrouping = React.useMemo(() => {
        const GROUP_WINDOW_MS = 2 * 60 * 1000;
        return messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const grouped = !!prev
                && prev.sender.username === msg.sender.username
                && (new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime()) < GROUP_WINDOW_MS;
            return { ...msg, grouped };
        });
    }, [messages]);

    // Refs
    const flatListRef = useRef<FlatList>(null);
    const isNearBottomRef = useRef(true);
    const stompClientRef = useRef<any>(null);
    const subscriptionRef = useRef<any>(null);

    /**
     * Загрузка истории сообщений через REST API (первая страница - самые новые)
     * Load message history via REST API (first page - the newest)
     */
    const loadMessages = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchMessages(roomId, 0, MESSAGES_PAGE_SIZE);
            setMessages([...response.data].reverse());
            setPage(0);
            setHasMoreMessages(response.data.length === MESSAGES_PAGE_SIZE);
        } catch (error) {
            console.error('Failed to load messages:', error);
            Alert.alert(t('error'), 'Could not load messages');
        } finally {
            setLoading(false);
        }
    }, [roomId, t]);

    /**
     * Подгрузка более старых сообщений при прокрутке вверх
     * Load older messages when scrolling up
     */
    const loadMoreMessages = useCallback(async () => {
        if (loadingMore || !hasMoreMessages) return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const response = await fetchMessages(roomId, nextPage, MESSAGES_PAGE_SIZE);
            if (response.data.length === 0) {
                setHasMoreMessages(false);
                return;
            }
            setMessages(prev => [...[...response.data].reverse(), ...prev]);
            setPage(nextPage);
            setHasMoreMessages(response.data.length === MESSAGES_PAGE_SIZE);
        } catch (error) {
            // Останавливаем догрузку, иначе onEndReached тут же вызовет её
            // заново и при устойчивой ошибке (напр. протухший токен) уйдём в
            // бесконечный цикл одинаковых неудачных запросов
            // Stop further pagination, otherwise onEndReached would call this
            // again right away and, on a persistent error (e.g. an expired
            // token), we'd loop forever on the same failing request
            console.error('Failed to load more messages:', error);
            setHasMoreMessages(false);
        } finally {
            setLoadingMore(false);
        }
    }, [roomId, page, loadingMore, hasMoreMessages]);

    /**
     * Применяет пришедшее по WebSocket/REST сообщение: если оно уже есть в
     * списке (по id) - заменяет его (правка/удаление), иначе добавляет новое
     * Applies a message from WebSocket/REST: if it already exists in the list
     * (by id) - replaces it (edit/delete), otherwise appends a new one
     */
    const applyMessageUpdate = useCallback((incoming: Message) => {
        setMessages(prev => {
            const idx = prev.findIndex(m => m.id === incoming.id);
            if (idx === -1) return [...prev, incoming];
            const next = [...prev];
            next[idx] = incoming;
            return next;
        });
    }, []);

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
                // Прокрутку к новым сообщениям делает FlatList.onContentSizeChange
                // (см. ниже) - он же учитывает isNearBottomRef, поэтому здесь
                // отдельный scrollToEnd() не нужен (и уводил бы не туда - см.
                // комментарий у onContentSizeChange)
                // Scrolling to new messages is handled by
                // FlatList.onContentSizeChange (below), which also respects
                // isNearBottomRef - a separate scrollToEnd() here isn't needed
                // (and would scroll the wrong way anyway - see the comment
                // next to onContentSizeChange)
                applyMessageUpdate(newMessage);
            });
            subscriptionRef.current = sub;
        } catch (error) {
            console.error('WebSocket connection failed:', error);
        }
    }, [roomId, applyMessageUpdate]);

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
            quality: 0.3,
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
     * Поиск по тексту сообщений в чате (с debounce)
     * Search message content within the chat (debounced)
     */
    useEffect(() => {
        if (!searchVisible || !searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const timeout = setTimeout(async () => {
            setSearching(true);
            try {
                const response = await searchMessages(roomId, searchQuery.trim());
                setSearchResults(response.data);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, searchVisible, roomId]);

    /**
     * Переход к найденному сообщению (если оно уже загружено на экране)
     * Jump to a found message (if it's already loaded on screen)
     */
    const handleSelectSearchResult = useCallback((result: Message) => {
        setSearchVisible(false);
        setSearchQuery('');
        setSearchResults([]);

        const displayData = [...messagesWithGrouping].reverse();
        const index = displayData.findIndex(m => m.id === result.id);
        if (index === -1) {
            Alert.alert(
                t('error') === 'Error' ? 'Not loaded yet' : 'Пока не загружено',
                `${formatMessageDate(result.timestamp)}, ${formatMessageTime(result.timestamp)}: ${result.content}\n\n` +
                'Прокрутите чат вверх, чтобы подгрузить более старые сообщения / Scroll up to load older messages'
            );
            return;
        }
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }, [messagesWithGrouping, t]);

    /**
     * Копирование, редактирование и удаление сообщения (долгое нажатие)
     * Copy, edit and delete a message (long press)
     */
    const handleMessageLongPress = useCallback((item: Message) => {
        if (item.deleted) return;

        const isMine = item.sender.username === currentUsername;
        const options: any[] = [];

        if (item.type === 'TEXT' && item.content) {
            options.push({
                text: 'Копировать / Copy',
                onPress: () => Clipboard.setStringAsync(item.content),
            });
        }
        if (isMine && item.type === 'TEXT') {
            options.push({
                text: 'Редактировать / Edit',
                onPress: () => {
                    setEditingMessage(item);
                    setEditText(item.content);
                },
            });
        }
        if (isMine) {
            options.push({
                text: 'Удалить / Delete',
                style: 'destructive',
                onPress: () => {
                    Alert.alert(
                        'Удалить сообщение? / Delete message?',
                        '',
                        [
                            { text: 'Отмена / Cancel', style: 'cancel' },
                            {
                                text: 'Удалить / Delete',
                                style: 'destructive',
                                onPress: async () => {
                                    try {
                                        const response = await deleteMessage(roomId, item.id);
                                        applyMessageUpdate(response.data);
                                    } catch (error) {
                                        console.error('Failed to delete message:', error);
                                        Alert.alert(t('error'), 'Не удалось удалить сообщение / Could not delete message');
                                    }
                                },
                            },
                        ]
                    );
                },
            });
        }

        if (options.length === 0) return;
        options.push({ text: 'Отмена / Cancel', style: 'cancel' });
        Alert.alert('', '', options);
    }, [currentUsername, roomId, applyMessageUpdate, t]);

    /**
     * Сохранение отредактированного текста сообщения
     * Save the edited message text
     */
    const saveEditedMessage = useCallback(async () => {
        if (!editingMessage || !editText.trim()) return;
        try {
            const response = await editMessage(roomId, editingMessage.id, editText.trim());
            applyMessageUpdate(response.data);
            setEditingMessage(null);
            setEditText('');
        } catch (error) {
            console.error('Failed to edit message:', error);
            Alert.alert(t('error'), 'Не удалось изменить сообщение / Could not edit message');
        }
    }, [editingMessage, editText, roomId, applyMessageUpdate, t]);

    /**
     * Рендер одного сообщения
     * Render a single message
     */
    const renderMessage = useCallback(({ item }: { item: Message }) => (
        <TouchableOpacity
            onPress={() => {
                if (item.type === 'IMAGE' && item.mediaUrl) {
                    setSelectedImage(item.mediaUrl);
                    setImageViewerVisible(true);
                }
            }}
            onLongPress={() => handleMessageLongPress(item)}
            activeOpacity={item.type === 'IMAGE' ? 0.7 : 1}
        >
            <ThoughtBubble
                content={item.deleted ? 'Сообщение удалено / Message deleted' : item.content}
                sender={item.sender.username}
                timestamp={formatMessageTime(item.timestamp)}
                isMyMessage={item.sender.username === currentUsername}
                type={item.deleted ? 'TEXT' : item.type}
                mediaUrl={item.deleted ? undefined : item.mediaUrl}
                grouped={item.grouped}
                edited={item.edited}
                deletedPlaceholder={item.deleted}
            />
        </TouchableOpacity>
    ), [currentUsername, handleMessageLongPress]);

    const keyExtractor = useCallback((item: Message) => item.id, []);

    // Клавиатуру теперь целиком отрабатывает система (windowSoftInputMode=
    // adjustResize в манифесте) - вручную считать её высоту в JS больше не
    // нужно (несколько раундов ручного JS-трекинга по событиям Keyboard
    // оказались ненадёжны на Android - на повторном фокусе на поле высота
    // иногда приходила неверной). Здесь только докручиваем к новым
    // сообщениям при открытии клавиатуры. Список инвертирован - offset 0
    // это самые новые сообщения (низ экрана), а scrollToEnd() уводил бы к
    // самым старым, поэтому используем именно scrollToOffset(0).
    // The keyboard is now handled entirely by the system (windowSoftInputMode=
    // adjustResize in the manifest) - manually tracking its height in JS is no
    // longer needed (several rounds of manual JS tracking via Keyboard events
    // proved unreliable on Android - on a repeat focus the height sometimes
    // came back wrong). This just scrolls to the newest messages when the
    // keyboard opens. The list is inverted - offset 0 is the newest messages
    // (bottom of the screen), while scrollToEnd() would jump to the oldest
    // ones, hence scrollToOffset(0).
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => {
            setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 300);
        });
        return () => {
            showSub.remove();
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
            // Несколько раундов настройки windowSoftInputMode
            // (adjustResize/adjustPan/adjustNothing) не дали стабильного
            // результата на Android - оказалось, что проект собран с
            // edgeToEdgeEnabled=true (android/gradle.properties), а на
            // edge-to-edge Android этот механизм в принципе ненадёжен.
            // KeyboardAvoidingView теперь импортируется из
            // react-native-keyboard-controller - эта библиотека получает
            // высоту клавиатуры напрямую через нативные IME-инсеты
            // (WindowInsetsCompat), а не через windowSoftInputMode, поэтому
            // работает одинаково надёжно на обеих платформах.
            // Several rounds of tuning windowSoftInputMode
            // (adjustResize/adjustPan/adjustNothing) never gave stable
            // results on Android - it turned out the project is built with
            // edgeToEdgeEnabled=true (android/gradle.properties), and that
            // mechanism is fundamentally unreliable on edge-to-edge Android.
            // KeyboardAvoidingView is now imported from
            // react-native-keyboard-controller - this library gets the
            // keyboard height directly from native IME insets
            // (WindowInsetsCompat) instead of windowSoftInputMode, so it
            // works equally reliably on both platforms.
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View
                    style={{ flex: 1 }}
                >
                    <View style={styles.container}>
                        {/* Тёплый градиент Bonds вместо холодного */}
                        <LinearGradient colors={colors.backgroundGradient as [string, string, string]}
                            style={StyleSheet.absoluteFillObject} />
                        <FloatingClouds />

                        {/* Заголовок чата — прозрачный с тенью */}
                        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
                            {searchVisible ? (
                                <>
                                    <TextInput
                                        style={styles.searchInput}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Поиск по чату / Search chat"
                                        placeholderTextColor={colors.textMuted}
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        onPress={() => { setSearchVisible(false); setSearchQuery(''); setSearchResults([]); }}
                                        style={styles.addButton}
                                    >
                                        <Text style={styles.addButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                        <Text style={styles.backButtonText}>←</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setParticipantsVisible(true)} activeOpacity={0.7}>
                                        <Text style={styles.headerTitle}>{roomName}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.iconHeaderButton}>
                                        <Text style={styles.iconText}>🔍</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setAddParticipantsVisible(true)} style={styles.addButton}>
                                        <Text style={styles.addButtonText}>+</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {/* Выпадающий список результатов поиска / Search results dropdown */}
                        {searchVisible && searchQuery.trim().length > 0 && (
                            <View style={styles.searchResultsBox}>
                                {searching ? (
                                    <ActivityIndicator size="small" color={colors.primary} style={{ padding: spacing.md }} />
                                ) : searchResults.length === 0 ? (
                                    <Text style={styles.searchEmptyText}>Ничего не найдено / Nothing found</Text>
                                ) : (
                                    <FlatList
                                        data={searchResults}
                                        keyExtractor={(item) => item.id}
                                        style={{ maxHeight: 260 }}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity style={styles.searchResultItem} onPress={() => handleSelectSearchResult(item)}>
                                                <Text style={styles.searchResultSender}>{item.sender.username}</Text>
                                                <Text style={styles.searchResultContent} numberOfLines={1}>{item.content}</Text>
                                                <Text style={styles.searchResultDate}>
                                                    {formatMessageDate(item.timestamp)}, {formatMessageTime(item.timestamp)}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                )}
                            </View>
                        )}

                        <FlatList
                            ref={flatListRef}
                            // data={messages}
                            data={[...messagesWithGrouping].reverse()} // Инвертируем массив
                            keyExtractor={keyExtractor}
                            renderItem={renderMessage}
                            inverted={true} // КЛЮЧЕВОЙ ПАРАМЕТР!
                            style={styles.messageList}
                            contentContainerStyle={styles.messageListContent}
                            showsVerticalScrollIndicator={false}
                            // Список инвертирован, поэтому offset 0 - это САМЫЕ НОВЫЕ сообщения
                            // (визуально низ экрана) - это и есть нужное положение по умолчанию,
                            // scrollToEnd() здесь наоборот уводил бы к самым старым. Автопрокрутку
                            // к новым сообщениям делаем только если пользователь и так уже внизу -
                            // иначе она перебивала бы ручную прокрутку истории вверх.
                            // The list is inverted, so offset 0 is the NEWEST messages (visually
                            // the bottom of the screen) - that's the correct default position;
                            // scrollToEnd() would instead jump to the oldest ones. We only
                            // auto-scroll to new messages when the user is already near the
                            // bottom - otherwise it would fight manual scrolling through history.
                            onScroll={(e) => {
                                isNearBottomRef.current = e.nativeEvent.contentOffset.y < 100;
                            }}
                            scrollEventThrottle={200}
                            onContentSizeChange={() => {
                                if (isNearBottomRef.current) {
                                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                                }
                            }}
                            onEndReached={loadMoreMessages}
                            onEndReachedThreshold={0.3}
                            onScrollToIndexFailed={() => { }}
                            ListFooterComponent={loadingMore ? (
                                <ActivityIndicator size="small" color={colors.primary} style={{ padding: spacing.md }} />
                            ) : null}
                        />

                        {/* Панель ввода. Подъём над клавиатурой на обеих платформах
                            делает KeyboardAvoidingView (см. выше) - здесь только
                            safe-area отступ в состоянии покоя. */}
                        {/* Input panel. The lift above the keyboard on both
                            platforms is handled by KeyboardAvoidingView (see
                            above) - this is just the resting safe-area padding. */}
                        <View style={[styles.inputWrapper, {
                            paddingBottom: insets.bottom + 6
                        }]}>
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
                        {/* Модалка со списком текущих участников (открывается по нажатию на название чата) */}
                        <ParticipantsModal
                            visible={participantsVisible}
                            onClose={() => setParticipantsVisible(false)}
                            chatId={roomId}
                            currentUsername={currentUsername}
                            onAddPress={() => {
                                setParticipantsVisible(false);
                                setAddParticipantsVisible(true);
                            }}
                        />
                    </View>
                    <ImageView
                        images={[{ uri: selectedImage || '' }]}
                        imageIndex={0}
                        visible={imageViewerVisible}
                        onRequestClose={() => setImageViewerVisible(false)}
                    />

                    {/* Модалка редактирования сообщения / Message editing modal */}
                    <Modal
                        visible={!!editingMessage}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setEditingMessage(null)}
                    >
                        <View style={styles.editModalOverlay}>
                            <View style={styles.editModalBox}>
                                <Text style={styles.editModalTitle}>Редактировать сообщение / Edit message</Text>
                                <TextInput
                                    style={styles.editModalInput}
                                    value={editText}
                                    onChangeText={setEditText}
                                    multiline
                                    autoFocus
                                />
                                <View style={styles.editModalButtons}>
                                    <TouchableOpacity onPress={() => setEditingMessage(null)} style={styles.editModalCancelButton}>
                                        <Text style={styles.editModalCancelText}>Отмена / Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={saveEditedMessage} style={styles.editModalSaveButton}>
                                        <Text style={styles.editModalSaveText}>Сохранить / Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

/**
 * Стили экрана чата в стиле Bonds
 * Chat screen styles in Bonds style
*/
const createStyles = (colors: AppColors) => StyleSheet.create({
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.panelBackground,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
        borderBottomLeftRadius: borderRadius.large,
        borderBottomRightRadius: borderRadius.large,
        ...shadows.soft,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary, // индиго
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        padding: 4,
        marginRight: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: colors.primary,
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
        backgroundColor: colors.panelBackgroundSolid,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
    },
    // Иконки — теперь с мягким фоном
    iconButton: {
        padding: spacing.xs,
        backgroundColor: colors.iconButtonBackground,
        borderRadius: borderRadius.circle,
        justifyContent: 'center',
        alignItems: 'center',
        width: 38,
        height: 38,
        ...shadows.soft,
    },
    iconText: {
        fontSize: 18,
    },
    recordingActive: {
        backgroundColor: colors.recordingActiveBackground,
    },
    // Поле ввода — светлое с тёплой границей
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xlarge,
        paddingHorizontal: spacing.lg,
        paddingVertical: 6,
        backgroundColor: colors.backgroundLight,
        fontSize: 15,
        color: colors.text,
        maxHeight: 80,
        minHeight: 38,
        ...shadows.soft,
    },
    // Кнопка отправки — индиго
    sendButton: {
        backgroundColor: colors.primary,
        width: 38,
        height: 38,
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
    // Поиск / Search
    iconHeaderButton: {
        padding: 8,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xlarge,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.backgroundLight,
        fontSize: 15,
        color: colors.text,
        marginRight: spacing.sm,
    },
    searchResultsBox: {
        backgroundColor: colors.backgroundLight,
        marginHorizontal: spacing.md,
        borderRadius: borderRadius.medium,
        ...shadows.medium,
        zIndex: 10,
    },
    searchEmptyText: {
        padding: spacing.lg,
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: 13,
    },
    searchResultItem: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    searchResultSender: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
    },
    searchResultContent: {
        fontSize: 14,
        color: colors.text,
        marginTop: 2,
    },
    searchResultDate: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
    },
    // Модалка редактирования / Edit modal
    editModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(26, 37, 48, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    editModalBox: {
        width: '100%',
        backgroundColor: colors.backgroundLight,
        borderRadius: borderRadius.large,
        padding: spacing.lg,
        ...shadows.large,
    },
    editModalTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primary,
        marginBottom: spacing.md,
    },
    editModalInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.medium,
        padding: spacing.md,
        fontSize: 15,
        color: colors.text,
        minHeight: 60,
        maxHeight: 160,
    },
    editModalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    editModalCancelButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    editModalCancelText: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    editModalSaveButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.medium,
    },
    editModalSaveText: {
        color: colors.textLight,
        fontWeight: '600',
    },
});

export default ChatRoomScreen;