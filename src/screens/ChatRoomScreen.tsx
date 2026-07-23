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
    Image,
} from 'react-native';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { useAudioRecorder, setAudioModeAsync, requestRecordingPermissionsAsync, IOSOutputFormat, AudioQuality, type RecordingOptions } from 'expo-audio';
import ThoughtBubble from '../components/ThoughtBubble';
import FloatingClouds from '../components/FloatingClouds';
import ParticipantsModal from '../components/ParticipantsModal';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useSimpleMode } from '../context/SimpleModeContext';
import { fetchMessages, uploadFile, searchMessages, editMessage, deleteMessage, markChatRead, toggleReaction, getMemories } from '../services/api';
import { connectWebSocket, subscribeToRoom, subscribeToTyping, subscribeToRead, subscribeToReactions, sendTyping, sendMessage as wsSendMessage, disconnectWebSocket } from '../services/websocket';
import TypingIndicator from '../components/TypingIndicator';
import { spacing, borderRadius, shadows, typography, AppColors } from '../styles/theme';
import AddParticipantsModal from '../components/AddParticipantsModal';
import ImageView from 'react-native-image-viewing';
import { formatMessageTime, formatMessageDate } from '../utils/dateTime';

const MESSAGES_PAGE_SIZE = 30;

/**
 * Настройки записи голосовых сообщений: моно + пониженный битрейт вместо
 * RecordingPresets.HIGH_QUALITY (stereo, 128kbps) - для речи разницы в
 * качестве почти не слышно, а файл выходит в 4 раза меньше.
 * Voice message recording settings: mono + lower bitrate instead of
 * RecordingPresets.HIGH_QUALITY (stereo, 128kbps) - barely audible quality
 * difference for speech, ~4x smaller file.
 */
const VOICE_RECORDING_OPTIONS: RecordingOptions = {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
    android: {
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
    },
    ios: {
        outputFormat: IOSOutputFormat.MPEG4AAC,
        audioQuality: AudioQuality.MEDIUM,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
    },
    web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 64000,
    },
};

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
    type: 'TEXT' | 'IMAGE' | 'VOICE' | 'VIDEO' | 'FILE' | 'MOOD_CHECKIN';
    mediaUrl?: string;
    timestamp: string;
    grouped?: boolean;
    edited?: boolean;
    deleted?: boolean;
    read?: boolean;
    replyToId?: string;
    replyTo?: {
        id: string;
        senderUsername: string;
        content: string;
        type: 'TEXT' | 'IMAGE' | 'VOICE' | 'VIDEO' | 'FILE' | 'MOOD_CHECKIN';
        deleted: boolean;
    } | null;
    reactions?: { emoji: string; count: number; usernames: string[] }[];
    revealAt?: string | null;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];
// Быстрые реакции для чек-ина настроения - показываются вместо обычных QUICK_REACTIONS
// Quick reactions for the mood check-in - shown instead of the regular QUICK_REACTIONS
const MOOD_REACTIONS = ['😊', '😐', '😢', '😡', '😴', '🥳'];
const MOOD_CHECKIN_PROMPT = 'Как настроение сегодня? Ответь эмодзи 👇 / How are you feeling today? React with an emoji 👇';

/**
 * Экран чата
 * Chat screen component
 */
const ChatRoomScreen: React.FC<any> = ({ route, navigation }) => {
    const { roomId, roomName } = route.params || { roomId: 'family-chat', roomName: 'Family Chat' };
    const { t } = useLanguage();
    const { theme, colors } = useTheme();
    const { fontScale } = useSimpleMode();
    const styles = useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
    const insets = useSafeAreaInsets();
    // Надёжный флаг видимости клавиатуры из той же библиотеки, что и
    // KeyboardAvoidingView - чтобы не добавлять safe-area отступ снизу ещё
    // раз, когда клавиатура и так уже впритык к панели ввода
    // Reliable keyboard-visible flag from the same library as
    // KeyboardAvoidingView - so we don't add the bottom safe-area padding
    // again when the keyboard is already flush against the input panel
    const isKeyboardVisible = useKeyboardState((state) => state.isVisible);

    // Состояния
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState<string>('');
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [currentUsername, setCurrentUsername] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [sending, setSending] = useState<boolean>(false);
    const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
    const [addParticipantsVisible, setAddParticipantsVisible] = useState(false);
    const [participantsVisible, setParticipantsVisible] = useState(false);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [exporting, setExporting] = useState(false);
    const [memories, setMemories] = useState<Message[]>([]);
    const [memoriesVisible, setMemoriesVisible] = useState(false);
    // Только для iOS - Android использует системные диалоги DateTimePickerAndroid напрямую
    // iOS only - Android uses the DateTimePickerAndroid system dialogs directly
    const [iosCapsulePickerVisible, setIosCapsulePickerVisible] = useState(false);
    const [iosCapsuleDate, setIosCapsuleDate] = useState(new Date());

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
    const typingSubscriptionRef = useRef<any>(null);
    const readSubscriptionRef = useRef<any>(null);
    const reactionsSubscriptionRef = useRef<any>(null);
    const typingClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTypingSentRef = useRef(0);
    // Актуальное имя пользователя внутри колбэков вебсокета, подписанных один раз
    // Latest username inside websocket callbacks, subscribed only once
    const currentUsernameRef = useRef('');

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
            markChatRead(roomId).catch(() => {});
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
        if (name) {
            setCurrentUsername(name);
            currentUsernameRef.current = name;
        }
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
                // Раз чат сейчас открыт - сразу отмечаем чужое новое сообщение прочитанным
                // Since the chat is open right now, immediately mark someone else's new message as read
                if (newMessage.sender?.username !== currentUsernameRef.current) {
                    markChatRead(roomId).catch(() => {});
                }
            });
            subscriptionRef.current = sub;

            // Галочки "прочитано" - обновляем свои сообщения, отправленные до readAt
            // Read receipts - update our own messages sent at or before readAt
            const readSub = subscribeToRead(roomId, ({ username, readAt }) => {
                if (username === currentUsernameRef.current) return;
                const readAtTime = new Date(readAt).getTime();
                setMessages(prev => prev.map(m =>
                    (m.sender.username === currentUsernameRef.current && new Date(m.timestamp).getTime() <= readAtTime)
                        ? { ...m, read: true }
                        : m
                ));
            });
            readSubscriptionRef.current = readSub;

            // Реакции на сообщения - обновляем сводку по конкретному сообщению
            // Message reactions - update the summary for the specific message
            const reactionsSub = subscribeToReactions(roomId, ({ messageId, reactions }) => {
                setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, reactions } : m)));
            });
            reactionsSubscriptionRef.current = reactionsSub;

            // Индикатор "печатает" - показываем только для чужих событий
            // Typing indicator - only show it for someone else's events
            const typingSub = subscribeToTyping(roomId, ({ user, typing }) => {
                if (!typing || user === currentUsernameRef.current) return;
                setTypingUser(user);
                if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
                // Бэкенд не шлёт отдельное событие "перестал печатать", поэтому
                // просто гасим индикатор, если новых событий не было 3 секунды
                // The backend doesn't send a separate "stopped typing" event, so
                // just clear the indicator if no new events arrive within 3s
                typingClearTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
            });
            typingSubscriptionRef.current = typingSub;
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
            if (typingSubscriptionRef.current) typingSubscriptionRef.current.unsubscribe();
            if (readSubscriptionRef.current) readSubscriptionRef.current.unsubscribe();
            if (reactionsSubscriptionRef.current) reactionsSubscriptionRef.current.unsubscribe();
            if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
            disconnectWebSocket();
        };
    }, [loadCurrentUser, loadMessages, setupWebSocket]);

    // Лента памяти: подгружаем сообщения этого чата за этот же день в прошлые годы
    // Memory lane: load this chat's messages from this same day in past years
    useEffect(() => {
        getMemories(roomId)
            .then((res) => setMemories(res.data))
            .catch((error) => console.error('Failed to load memories:', error));
    }, [roomId]);

    // Автоматически перезапрашивает историю в момент раскрытия ближайшей капсулы
    // времени, чтобы не ждать ручного обновления экрана. Таймер ограничен сутками,
    // чтобы не упереться в переполнение setTimeout на очень дальних капсулах (в этом
    // случае просто перепланируем через сутки, пока капсула не окажется ближе).
    // Automatically refetches history the moment the nearest time capsule opens, so
    // the user doesn't have to manually refresh. The timer is capped at 24h to avoid
    // setTimeout overflow for far-future capsules (in that case we just reschedule
    // again in 24h, until the capsule is close enough).
    useEffect(() => {
        const MAX_TIMER_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();
        let earliest: number | null = null;
        for (const m of messages) {
            if (m.revealAt) {
                const t = new Date(m.revealAt).getTime();
                if (t > now && (earliest === null || t < earliest)) earliest = t;
            }
        }
        if (earliest === null) return;

        const timeout = setTimeout(() => { loadMessages(); }, Math.min(earliest - now, MAX_TIMER_MS));
        return () => clearTimeout(timeout);
    }, [messages, loadMessages]);

    /**
     * Отправка текстового сообщения через WebSocket
     * Send text message via WebSocket
     */
    const sendTextMessage = useCallback(() => {
        if (!inputText.trim() || !stompClientRef.current) return;
        console.log('Sending message:', { roomId, inputText });
        wsSendMessage(roomId, inputText.trim(), 'TEXT', undefined, replyingTo?.id);
        setInputText('');
        setReplyingTo(null);
        setSending(false);
    }, [inputText, roomId, replyingTo]);

    /**
     * Изменение текста в поле ввода - параллельно шлёт событие "печатает"
     * не чаще раза в 2 секунды, чтобы не спамить сервер на каждый символ
     * Input text change - also sends a "typing" event, throttled to once
     * every 2 seconds so we don't spam the server on every keystroke
     */
    const handleInputChange = useCallback((text: string) => {
        setInputText(text);
        const now = Date.now();
        if (now - lastTypingSentRef.current > 2000) {
            sendTyping(roomId);
            lastTypingSentRef.current = now;
        }
    }, [roomId]);

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
            mediaTypes: ['images', 'videos'],
            // Сервер сам уменьшает размер и пережимает изображение (см. FileService.compressImage),
            // поэтому здесь не нужно агрессивно давить качество - это только портило картинку без экономии места.
            quality: 0.8,
            videoMaxDuration: 60,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            // asset.type может быть null на некоторых Android ContentProvider'ах (см. типы expo-image-picker),
            // поэтому подстраховываемся mimeType и duration (duration задан только у видео)
            // asset.type can be null on some Android ContentProviders (see expo-image-picker's types),
            // so we also check mimeType and duration (duration is only set for videos)
            const isVideo = asset.type === 'video'
                || (!!asset.mimeType && asset.mimeType.startsWith('video/'))
                || asset.duration != null;
            setSending(true);
            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: asset.uri,
                    type: isVideo ? 'video/mp4' : 'image/jpeg',
                    name: isVideo ? 'video.mp4' : 'photo.jpg',
                } as any);
                const uploadRes = await uploadFile(formData, isVideo ? 'video' : 'image');
                const mediaUrl = uploadRes.data.url;
                wsSendMessage(roomId, isVideo ? '🎥 Video' : '📷 Photo', isVideo ? 'VIDEO' : 'IMAGE', mediaUrl);
            } catch (error) {
                Alert.alert(t('error'), isVideo ? 'Failed to send video' : 'Failed to send image');
            } finally {
                setSending(false);
            }
        }
    }, [roomId, t]);

    /**
     * Отправка произвольного файла (документа)
     * Send an arbitrary file (document)
     */
    const sendDocument = useCallback(async () => {
        const result = await DocumentPicker.getDocumentAsync({ multiple: false });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        const mime = asset.mimeType || '';

        // Через этот пикер можно выбрать что угодно, включая видео/фото из "Файлов" -
        // распознаём реальный тип по MIME и шлём как полноценное видео/фото, а не как
        // безликий файл с хэш-именем без плеера
        // This picker can select anything, including video/photos from "Files" - detect
        // the real type from MIME and send it as a proper video/photo, not a faceless
        // file with a hashed name and no player
        let uploadType: 'image' | 'video' | 'file' = 'file';
        let messageType: 'IMAGE' | 'VIDEO' | 'FILE' = 'FILE';
        let messageContent = `📄 ${asset.name}`;
        if (mime.startsWith('video/')) {
            uploadType = 'video';
            messageType = 'VIDEO';
            messageContent = '🎥 Video';
        } else if (mime.startsWith('image/')) {
            uploadType = 'image';
            messageType = 'IMAGE';
            messageContent = '📷 Photo';
        }

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: asset.uri,
                type: mime || 'application/octet-stream',
                name: asset.name,
            } as any);
            const uploadRes = await uploadFile(formData, uploadType);
            const mediaUrl = uploadRes.data.url;
            wsSendMessage(roomId, messageContent, messageType, mediaUrl);
        } catch (error) {
            console.error('Failed to send file:', error);
            Alert.alert(t('error'), 'Failed to send file');
        } finally {
            setSending(false);
        }
    }, [roomId, t]);

    /**
     * Запустить семейный чек-ин настроения - отправляет специальное сообщение,
     * на которое участники отвечают эмодзи настроения (переиспользует уже
     * готовую систему реакций)
     * Start a family mood check-in - sends a special message that participants
     * respond to with mood emoji (reuses the existing reactions system)
     */
    const sendMoodCheckin = useCallback(() => {
        if (!stompClientRef.current) return;
        wsSendMessage(roomId, MOOD_CHECKIN_PROMPT, 'MOOD_CHECKIN');
    }, [roomId]);

    /**
     * Отправить "капсулу времени" на точный момент: текст из поля ввода
     * сохраняется сразу, но его содержимое (и медиа, если было бы) скрыто
     * ото всех, включая отправителя, до выбранного момента - см. маскировку
     * на бэкенде (ChatMessageDto.fromEntity).
     * Send a "time capsule" for an exact moment: the text currently in the
     * input is saved right away, but its content is hidden from everyone,
     * including the sender, until the chosen moment - see the masking on
     * the backend (ChatMessageDto.fromEntity).
     */
    const sendTimeCapsuleAt = useCallback((targetDate: Date) => {
        if (!inputText.trim() || !stompClientRef.current) return;
        wsSendMessage(roomId, inputText.trim(), 'TEXT', undefined, undefined, targetDate.toISOString());
        setInputText('');
    }, [inputText, roomId]);

    const sendTimeCapsuleIn = useCallback((delayMs: number) => {
        sendTimeCapsuleAt(new Date(Date.now() + delayMs));
    }, [sendTimeCapsuleAt]);

    /**
     * Выбор точной даты и времени раскрытия капсулы - на Android через
     * системные диалоги (сначала календарь, потом время), на iOS через
     * модалку с колесом даты+времени (см. рендер ниже).
     * Pick the exact reveal date and time - on Android via the system
     * dialogs (date first, then time), on iOS via a modal with a combined
     * date+time wheel (see the render below).
     */
    const pickCapsuleDateTime = useCallback(() => {
        if (!inputText.trim()) {
            Alert.alert(t('error'), 'Сначала напишите текст в поле ввода / Type a message in the input first');
            return;
        }
        const now = new Date();
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                value: now,
                mode: 'date',
                minimumDate: now,
                onChange: (event, selectedDate) => {
                    if (event.type !== 'set' || !selectedDate) return;
                    DateTimePickerAndroid.open({
                        value: selectedDate,
                        mode: 'time',
                        is24Hour: true,
                        onChange: (event2, selectedTime) => {
                            if (event2.type !== 'set' || !selectedTime) return;
                            const target = new Date(selectedDate);
                            target.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                            sendTimeCapsuleAt(target);
                        },
                    });
                },
            });
        } else {
            setIosCapsuleDate(now);
            setIosCapsulePickerVisible(true);
        }
    }, [inputText, sendTimeCapsuleAt, t]);

    /**
     * Меню дополнительных действий чата: чек-ин настроения и капсула времени
     * Chat extras menu: mood check-in and time capsule
     */
    const openExtrasMenu = useCallback(() => {
        Alert.alert('', '', [
            { text: 'Отмена / Cancel', style: 'cancel' },
            { text: '🙂 Чек-ин настроения / Mood check-in', onPress: sendMoodCheckin },
            {
                text: '🎁 Капсула времени / Time capsule',
                onPress: () => {
                    if (!inputText.trim()) {
                        Alert.alert(t('error'), 'Сначала напишите текст в поле ввода / Type a message in the input first');
                        return;
                    }
                    Alert.alert('Открыть через... / Open in...', '', [
                        { text: 'Отмена / Cancel', style: 'cancel' },
                        { text: '📅 Выбрать дату и время / Pick date & time', onPress: pickCapsuleDateTime },
                        { text: 'Час / An hour', onPress: () => sendTimeCapsuleIn(60 * 60 * 1000) },
                        { text: 'Завтра / Tomorrow', onPress: () => sendTimeCapsuleIn(24 * 60 * 60 * 1000) },
                        { text: 'Неделю / A week', onPress: () => sendTimeCapsuleIn(7 * 24 * 60 * 60 * 1000) },
                        { text: 'Месяц / A month', onPress: () => sendTimeCapsuleIn(30 * 24 * 60 * 60 * 1000) },
                        { text: 'Год / A year', onPress: () => sendTimeCapsuleIn(365 * 24 * 60 * 60 * 1000) },
                    ]);
                },
            },
        ]);
    }, [sendMoodCheckin, sendTimeCapsuleIn, pickCapsuleDateTime, inputText, t]);

    /**
     * Описание содержимого сообщения одной строкой для текстового экспорта
     * One-line description of a message's content for the text export
     */
    const describeMessageForExport = (m: Message): string => {
        if (m.deleted) return '[Сообщение удалено / Message deleted]';
        switch (m.type) {
            case 'IMAGE': return `[Фото / Photo] ${m.mediaUrl || ''}`;
            case 'VOICE': return `[Голосовое сообщение / Voice message] ${m.mediaUrl || ''}`;
            case 'VIDEO': return `[Видео / Video] ${m.mediaUrl || ''}`;
            case 'FILE': return `[Файл / File] ${m.content} ${m.mediaUrl || ''}`;
            default: return m.content;
        }
    };

    /**
     * Экспорт всей переписки в текстовый файл и открытие системного диалога "Поделиться"
     * Export the full chat history to a text file and open the system share sheet
     */
    const exportChat = useCallback(async () => {
        setExporting(true);
        try {
            const size = 100;
            let page = 0;
            let all: Message[] = [];
            // Постранично забираем всю историю (page=0 - самые новые), пока страницы не кончатся
            // Fetch the whole history page by page (page=0 - newest), until pages run out
            while (true) {
                const res = await fetchMessages(roomId, page, size);
                if (!res.data.length) break;
                all = all.concat(res.data);
                if (res.data.length < size) break;
                page++;
            }
            all.reverse(); // от старых к новым / oldest to newest

            const lines = all.map((m) => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender.username}: ${describeMessageForExport(m)}`);
            const text = `${roomName}\n${'='.repeat(roomName.length)}\n\n${lines.join('\n')}\n`;

            const fileName = `chat_${roomId}_${Date.now()}.txt`;
            const file = new File(Paths.cache, fileName);
            if (file.exists) file.delete();
            file.create();
            file.write(text);

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Export chat' });
            } else {
                Alert.alert(t('error'), 'Sharing is not available on this device');
            }
        } catch (error) {
            console.error('Failed to export chat:', error);
            Alert.alert(t('error'), 'Не удалось экспортировать чат / Could not export chat');
        } finally {
            setExporting(false);
        }
    }, [roomId, roomName, t]);

    /**
 * Начало записи голоса
 * Start voice recording
 */
    const startRecording = useCallback(async () => {
        // Если уже идёт запись – ничего не делаем
        if (recorder.isRecording) {
            console.log('Recording already in progress');
            return;
        }

        try {
            const { granted } = await requestRecordingPermissionsAsync();
            if (!granted) {
                Alert.alert(t('error'), 'Нет доступа к микрофону');
                return;
            }

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            await recorder.prepareToRecordAsync();
            recorder.record();
            setIsRecording(true);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert(t('error'), 'Не удалось начать запись');
        }
    }, [recorder, t]);

    /**
     * Остановка записи и отправка голосового сообщения
     * Stop recording and send voice message
     */
    const stopRecording = useCallback(async () => {
        if (!recorder.isRecording) {
            console.log('No recording to stop');
            setIsRecording(false); // сброс, если запись не активна
            return;
        }

        try {
            setIsRecording(false); // сразу меняем UI
            await recorder.stop();
            const uri = recorder.uri;

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
        }
    }, [recorder, roomId, t]);

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
    /**
     * Поставить/снять/заменить свою реакцию на сообщение
     * Toggle your own reaction on a message
     */
    const handleToggleReaction = useCallback(async (messageId: string, emoji: string) => {
        try {
            await toggleReaction(roomId, messageId, emoji);
        } catch (error) {
            console.error('Failed to toggle reaction:', error);
        }
    }, [roomId]);

    const handleMessageLongPress = useCallback((item: Message) => {
        if (item.deleted) return;

        const isMine = item.sender.username === currentUsername;
        const options: any[] = [];

        const reactionSet = item.type === 'MOOD_CHECKIN' ? MOOD_REACTIONS : QUICK_REACTIONS;
        reactionSet.forEach((emoji) => {
            options.push({
                text: emoji,
                onPress: () => handleToggleReaction(item.id, emoji),
            });
        });

        options.push({
            text: 'Ответить / Reply',
            onPress: () => setReplyingTo(item),
        });

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
    }, [currentUsername, roomId, applyMessageUpdate, handleToggleReaction, t]);

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
    const renderMessage = useCallback(({ item }: { item: Message }) => {
        const isMyMessage = item.sender.username === currentUsername;

        // Ещё не раскрытая капсула времени - бэкенд уже прислал вместо content
        // текст-заглушку "откроется ...", здесь просто рисуем её отдельной карточкой
        // A still-sealed time capsule - the backend already sent a "opens at ..."
        // placeholder as content, here we just render it as a separate card
        const isSealedCapsule = !!item.revealAt && new Date(item.revealAt).getTime() > Date.now();
        if (isSealedCapsule) {
            return (
                <View style={{ alignItems: 'center' }}>
                    <View style={styles.moodCheckinCard}>
                        <Text style={styles.moodCheckinIcon}>🎁</Text>
                        <Text style={styles.moodCheckinText}>{item.content}</Text>
                    </View>
                </View>
            );
        }

        // Чек-ин настроения рисуется отдельной центрированной карточкой, а не обычным
        // облаком - это скорее общее приглашение всему чату, чем чьё-то личное сообщение
        // The mood check-in renders as a separate centered card, not a regular bubble -
        // it's more of a prompt to the whole chat than anyone's personal message
        if (item.type === 'MOOD_CHECKIN' && !item.deleted) {
            return (
                <View>
                    <TouchableOpacity
                        style={styles.moodCheckinCard}
                        onLongPress={() => handleMessageLongPress(item)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.moodCheckinIcon}>🙂</Text>
                        <Text style={styles.moodCheckinText}>{item.content}</Text>
                    </TouchableOpacity>
                    {!!item.reactions?.length && (
                        <View style={[styles.reactionsRow, styles.reactionsRowCenter]}>
                            {item.reactions.map((r) => (
                                <TouchableOpacity
                                    key={r.emoji}
                                    style={[styles.reactionPill, r.usernames.includes(currentUsername) && styles.reactionPillMine]}
                                    onPress={() => handleToggleReaction(item.id, r.emoji)}
                                >
                                    <Text style={styles.reactionPillText}>{r.emoji} {r.count}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            );
        }

        return (
        <View>
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
                    isMyMessage={isMyMessage}
                    type={item.deleted ? 'TEXT' : item.type}
                    mediaUrl={item.deleted ? undefined : item.mediaUrl}
                    grouped={item.grouped}
                    edited={item.edited}
                    deletedPlaceholder={item.deleted}
                    read={item.read}
                    replyTo={item.replyTo}
                    fontScale={fontScale}
                />
            </TouchableOpacity>
            {!!item.reactions?.length && (
                <View style={[styles.reactionsRow, isMyMessage ? styles.reactionsRowMy : styles.reactionsRowTheirs]}>
                    {item.reactions.map((r) => (
                        <TouchableOpacity
                            key={r.emoji}
                            style={[styles.reactionPill, r.usernames.includes(currentUsername) && styles.reactionPillMine]}
                            onPress={() => handleToggleReaction(item.id, r.emoji)}
                        >
                            <Text style={styles.reactionPillText}>{r.emoji} {r.count}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
        );
    }, [currentUsername, handleMessageLongPress, handleToggleReaction, styles, fontScale]);

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
                                    <TouchableOpacity onPress={exportChat} style={styles.iconHeaderButton} disabled={exporting}>
                                        {exporting ? (
                                            <ActivityIndicator size="small" color={colors.primary} />
                                        ) : (
                                            <Text style={styles.iconText}>📤</Text>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={openExtrasMenu} style={styles.iconHeaderButton}>
                                        <Text style={styles.iconText}>✨</Text>
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

                        {memories.length > 0 && (
                            <TouchableOpacity style={styles.memoriesBanner} onPress={() => setMemoriesVisible(true)}>
                                <Text style={styles.memoriesBannerText}>
                                    📅 Год назад в этот день: {memories.length} {memories.length === 1 ? 'воспоминание' : 'воспоминаний'} / A year ago today
                                </Text>
                            </TouchableOpacity>
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

                        {typingUser && <TypingIndicator username={typingUser} />}

                        {/* Панель ввода. Подъём над клавиатурой на обеих платформах
                            делает KeyboardAvoidingView (см. выше). Safe-area отступ
                            снизу нужен только в покое - когда клавиатура открыта,
                            под ней и так нет системной панели жестов, так что этот
                            отступ создавал бы просто лишний зазор. */}
                        {/* Input panel. The lift above the keyboard on both
                            platforms is handled by KeyboardAvoidingView (see
                            above). The bottom safe-area padding is only needed at
                            rest - when the keyboard is open there's no gesture bar
                            underneath it anyway, so this padding would just be an
                            extra gap. */}
                        <View style={[styles.inputWrapper, {
                            paddingBottom: isKeyboardVisible ? 6 : insets.bottom + 6
                        }]}>
                            {replyingTo && (
                                <View style={styles.replyPreviewBar}>
                                    <View style={styles.replyPreviewBarAccent} />
                                    <View style={styles.replyPreviewBarBody}>
                                        <Text style={styles.replyPreviewBarSender}>{replyingTo.sender.username}</Text>
                                        <Text style={styles.replyPreviewBarText} numberOfLines={1}>
                                            {replyingTo.type === 'TEXT' ? replyingTo.content
                                                : replyingTo.type === 'IMAGE' ? '📷 ' + t('photo')
                                                : '🎤 ' + t('voice_message')}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyPreviewBarClose}>
                                        <Text style={styles.replyPreviewBarCloseText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            <View style={styles.inputContainer}>
                                {/* Кнопка фото/видео */}
                                <TouchableOpacity onPress={sendImage} style={styles.iconButton} disabled={sending}>
                                    <Text style={styles.iconText}>📷</Text>
                                </TouchableOpacity>
                                {/* Кнопка произвольного файла */}
                                <TouchableOpacity onPress={sendDocument} style={styles.iconButton} disabled={sending}>
                                    <Text style={styles.iconText}>📎</Text>
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
                                    onChangeText={handleInputChange}
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

                    <Modal
                        visible={memoriesVisible}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setMemoriesVisible(false)}
                    >
                        <View style={styles.editModalOverlay}>
                            <View style={[styles.editModalBox, { maxHeight: '75%' }]}>
                                <Text style={styles.editModalTitle}>📅 Год назад в этот день / A year ago today</Text>
                                <FlatList
                                    data={memories}
                                    keyExtractor={(item) => item.id}
                                    style={{ maxHeight: 420 }}
                                    renderItem={({ item }) => (
                                        <View style={styles.memoryItem}>
                                            <Text style={styles.memoryItemHeader}>
                                                {item.sender.username} · {formatMessageDate(item.timestamp)}
                                            </Text>
                                            {item.type === 'IMAGE' && item.mediaUrl ? (
                                                <Image source={{ uri: item.mediaUrl }} style={styles.memoryItemImage} />
                                            ) : (
                                                <Text style={styles.memoryItemContent} numberOfLines={4}>
                                                    {item.type === 'TEXT' ? item.content
                                                        : item.type === 'VOICE' ? '🎤 Голосовое сообщение / Voice message'
                                                        : item.type === 'VIDEO' ? '🎥 Видео / Video'
                                                        : item.content}
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                />
                                <TouchableOpacity onPress={() => setMemoriesVisible(false)} style={styles.editModalCancelButton}>
                                    <Text style={styles.editModalCancelText}>Закрыть / Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    {Platform.OS === 'ios' && (
                        <Modal
                            visible={iosCapsulePickerVisible}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setIosCapsulePickerVisible(false)}
                        >
                            <View style={styles.editModalOverlay}>
                                <View style={styles.editModalBox}>
                                    <Text style={styles.editModalTitle}>Когда открыть капсулу? / When to open the capsule?</Text>
                                    <DateTimePicker
                                        value={iosCapsuleDate}
                                        mode="datetime"
                                        minimumDate={new Date()}
                                        onChange={(_event, selectedDate) => {
                                            if (selectedDate) setIosCapsuleDate(selectedDate);
                                        }}
                                    />
                                    <View style={styles.editModalButtons}>
                                        <TouchableOpacity onPress={() => setIosCapsulePickerVisible(false)} style={styles.editModalCancelButton}>
                                            <Text style={styles.editModalCancelText}>Отмена / Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setIosCapsulePickerVisible(false);
                                                sendTimeCapsuleAt(iosCapsuleDate);
                                            }}
                                            style={styles.editModalSaveButton}
                                        >
                                            <Text style={styles.editModalSaveText}>Готово / Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Modal>
                    )}
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

/**
 * Стили экрана чата в стиле Bonds
 * Chat screen styles in Bonds style
*/
const createStyles = (colors: AppColors, fontScale: number = 1) => StyleSheet.create({
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
        fontSize: 18 * fontScale,
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
    replyPreviewBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.iconButtonBackground,
        borderRadius: borderRadius.medium,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
    },
    replyPreviewBarAccent: {
        width: 3,
        alignSelf: 'stretch',
        borderRadius: 2,
        backgroundColor: colors.primary,
        marginRight: spacing.sm,
    },
    replyPreviewBarBody: { flex: 1 },
    replyPreviewBarSender: { fontSize: 12, fontWeight: '600', color: colors.primary },
    replyPreviewBarText: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    replyPreviewBarClose: { padding: spacing.xs },
    replyPreviewBarCloseText: { fontSize: 14, color: colors.textSecondary },
    reactionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: -spacing.md,
        marginBottom: spacing.xs,
        paddingHorizontal: spacing.lg,
    },
    reactionsRowMy: { justifyContent: 'flex-end' },
    reactionsRowTheirs: { justifyContent: 'flex-start' },
    reactionsRowCenter: { justifyContent: 'center' },
    moodCheckinCard: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.large,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        marginVertical: spacing.md,
        maxWidth: '85%',
        borderWidth: 1,
        borderColor: colors.accent,
        ...shadows.soft,
    },
    moodCheckinIcon: { fontSize: 22, marginRight: spacing.sm },
    moodCheckinText: { fontSize: 14, fontWeight: '500', color: colors.primary, flexShrink: 1, textAlign: 'center' },
    memoriesBanner: {
        backgroundColor: colors.pillBackground,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        marginHorizontal: spacing.md,
        marginBottom: spacing.xs,
        borderRadius: borderRadius.medium,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    memoriesBannerText: { fontSize: 12, fontWeight: '500', color: colors.primary, textAlign: 'center' },
    memoryItem: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: spacing.md,
    },
    memoryItemHeader: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
    memoryItemContent: { fontSize: 14, color: colors.text },
    memoryItemImage: { width: '100%', height: 180, borderRadius: borderRadius.medium },
    reactionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.iconButtonBackground,
        borderRadius: borderRadius.circle,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reactionPillMine: {
        borderColor: colors.primary,
    },
    reactionPillText: { fontSize: 12, color: colors.text },
    // Иконки — теперь с мягким фоном
    iconButton: {
        padding: spacing.xs,
        backgroundColor: colors.iconButtonBackground,
        borderRadius: borderRadius.circle,
        justifyContent: 'center',
        alignItems: 'center',
        width: 38 * fontScale,
        height: 38 * fontScale,
        ...shadows.soft,
    },
    iconText: {
        fontSize: 18 * fontScale,
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
        fontSize: 15 * fontScale,
        color: colors.text,
        maxHeight: 80 * fontScale,
        minHeight: 38 * fontScale,
        ...shadows.soft,
    },
    // Кнопка отправки — индиго
    sendButton: {
        backgroundColor: colors.primary,
        width: 38 * fontScale,
        height: 38 * fontScale,
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