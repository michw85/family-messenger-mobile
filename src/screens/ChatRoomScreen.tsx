/**
 * @file ChatRoomScreen.tsx
 * @description Экран чата с облаками мыслей и гарантированной прокруткой при клавиатуре
 * @description Chat screen with thought bubbles and guaranteed keyboard scrolling
 * 
 * @author Family Messenger Team
 * @version 4.3.0
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
    EmitterSubscription,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import ThoughtBubble from '../components/ThoughtBubble';
import FloatingClouds from '../components/FloatingClouds';
import { useLanguage } from '../context/LanguageContext';

const { height: screenHeight } = Dimensions.get('window');

/**
 * Интерфейс сообщения
 * Message interface
 * @property id - Уникальный идентификатор сообщения / Unique message identifier
 * @property sender - Имя отправителя / Sender name
 * @property content - Текст сообщения / Message text
 * @property timestamp - Время отправки / Timestamp
 * @property type - Тип сообщения (текст/фото/голос) / Message type (text/image/voice)
 * @property mediaUrl - URL медиафайла / Media file URL
 */
interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    type?: 'TEXT' | 'IMAGE' | 'VOICE';
    mediaUrl?: string;
}

/**
 * Экран чата
 * Chat screen component
 * @param route - Параметры маршрута с информацией о комнате / Route params with room info
 */
const ChatRoomScreen: React.FC<any> = ({ route }) => {
    // ==================== ПОЛУЧЕНИЕ ПАРАМЕТРОВ КОМНАТЫ ====================
    // Get room parameters from navigation
    const { roomId, roomName } = route.params || {
        roomId: 'family-chat',
        roomName: 'Family Thoughts'
    };

    // ==================== ХУКИ И СОСТОЯНИЯ ====================
    // Hooks and states

    // Хук для работы с переводами / Translation hook
    const { t } = useLanguage();

    // Состояния компонента / Component states
    const [messages, setMessages] = useState<Message[]>([]);        // Список сообщений / Messages list
    const [inputText, setInputText] = useState<string>('');         // Текст в поле ввода / Input text
    const [isRecording, setIsRecording] = useState<boolean>(false); // Флаг записи голоса / Voice recording flag
    const [currentUsername, setCurrentUsername] = useState<string>('You'); // Имя текущего пользователя / Current username
    const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false); // Видимость клавиатуры / Keyboard visibility
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0); // Высота клавиатуры в пикселях / Keyboard height in pixels

    // ==================== REFS ====================
    // Refs for direct DOM access

    const flatListRef = useRef<FlatList>(null);          // Ссылка на список сообщений / Messages list reference
    const insets = useSafeAreaInsets();                   // Отступы для безопасной зоны (нотификация, динамический остров) / Safe area insets (notch, dynamic island)
    const inputRef = useRef<TextInput>(null);             // Ссылка на поле ввода текста / Text input reference

    // Подписки на события клавиатуры / Keyboard event subscriptions
    const keyboardShowListener = useRef<EmitterSubscription | null>(null);
    const keyboardHideListener = useRef<EmitterSubscription | null>(null);

    // ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
    // Helper functions

    /**
     * Функция принудительной прокрутки к последнему сообщению
     * Force scroll to the latest message
     * Вызывается многократно с разными задержками для гарантии прокрутки
     * Called multiple times with different delays to guarantee scrolling
     * @param animated - Использовать анимацию при прокрутке / Use animation when scrolling
     */
    const scrollToEnd = useCallback((animated: boolean = true): void => {
        // Проверяем, что FlatList существует и есть сообщения
        // Check that FlatList exists and there are messages
        if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated });
        }
    }, [messages.length]);

    // ==================== ЭФФЕКТЫ ====================
    // Effects

    /**
     * Эффект при монтировании компонента
     * Effect on component mount
     * Загружает имя пользователя из хранилища и настраивает обработчики клавиатуры
     * Loads username from storage and sets up keyboard handlers
     */
    useEffect(() => {
        /**
         * Асинхронная загрузка имени пользователя
         * Async load username from AsyncStorage
         */
        const loadUsername = async (): Promise<void> => {
            try {
                const name = await AsyncStorage.getItem('username');
                if (name) setCurrentUsername(name);
            } catch (error) {
                console.error('Failed to load username:', error);
            }
        };
        loadUsername();

        /**
         * Обработчик появления клавиатуры
         * Keyboard show handler
         * @param e - Событие клавиатуры с информацией о высоте / Keyboard event with height info
         */
        const handleKeyboardShow = (e: any): void => {
            // Обновляем состояние клавиатуры / Update keyboard state
            setKeyboardVisible(true);
            setKeyboardHeight(e.endCoordinates.height);

            /**
             * КРИТИЧЕСКИ ВАЖНО: Множественные задержки для гарантии прокрутки
             * CRITICAL: Multiple delays to guarantee scrolling
             * 
             * Почему несколько задержек?
             * Why multiple delays?
             * 1. Клавиатура появляется не мгновенно - нужно время на анимацию
             *    Keyboard appears not instantly - need time for animation
             * 2. FlatList может перерендериваться после изменения layout
             *    FlatList may re-render after layout change
             * 3. Разные устройства имеют разную скорость анимации клавиатуры
             *    Different devices have different keyboard animation speeds
             */

            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 350);
            /*
                        // Мгновенная попытка / Instant attempt
                        setTimeout(() => scrollToEnd(true), 50);
                        // После начала анимации клавиатуры / After keyboard animation starts
                        setTimeout(() => scrollToEnd(true), 200);
                        // Во время анимации клавиатуры / During keyboard animation
                        setTimeout(() => scrollToEnd(true), 400);
                        // После завершения анимации клавиатуры / After keyboard animation completes
                        setTimeout(() => scrollToEnd(true), 700);
                        // Максимальная задержка для медленных устройств / Maximum delay for slow devices
                        setTimeout(() => scrollToEnd(true), 1100);
                        // Экстренная попытка для старых устройств / Emergency attempt for older devices
                        setTimeout(() => scrollToEnd(true), 1600);
                        */
        };

        /**
         * Обработчик скрытия клавиатуры
         * Keyboard hide handler
         */
        const handleKeyboardHide = (): void => {
            // Сбрасываем состояние клавиатуры / Reset keyboard state
            setKeyboardVisible(false);
            setKeyboardHeight(0);

            // Прокрутка после скрытия клавиатуры / Scroll after keyboard hides
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            /*
            setTimeout(() => scrollToEnd(true), 100);
            setTimeout(() => scrollToEnd(true), 300);
            setTimeout(() => scrollToEnd(true), 600);
            */
        };

        // Регистрация обработчиков событий клавиатуры / Register keyboard event handlers
        keyboardShowListener.current = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
        keyboardHideListener.current = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

        /**
         * Очистка подписок при размонтировании компонента
         * Cleanup subscriptions on component unmount
         * Важно для предотвращения утечек памяти
         * Important to prevent memory leaks
         */
        return () => {
            if (keyboardShowListener.current) {
                keyboardShowListener.current.remove();
            }
            if (keyboardHideListener.current) {
                keyboardHideListener.current.remove();
            }
        };
    }, [scrollToEnd]); // Зависимость от scrollToEnd / Depend on scrollToEnd

    /**
     * Эффект для автоматической прокрутки при добавлении новых сообщений
     * Effect for auto-scroll when new messages are added
     * Срабатывает каждый раз при изменении списка сообщений
     * Triggers every time the messages list changes
     */
    useEffect(() => {
        if (messages.length > 0) {
            // Несколько таймеров с разными задержками для гарантии прокрутки
            // Multiple timers with different delays to guarantee scrolling
            const timers = [50, 150, 300, 500, 800].map(delay =>
                setTimeout(() => scrollToEnd(true), delay)
            );

            // Очистка таймеров при размонтировании или следующем вызове эффекта
            // Cleanup timers on unmount or next effect call
            return () => timers.forEach(timer => clearTimeout(timer));
        }
    }, [messages, scrollToEnd]);

    // ==================== ОТПРАВКА СООБЩЕНИЙ ====================
    // Message sending functions

    /**
     * Отправка текстового сообщения
     * Send text message
     * Создаёт новое сообщение и добавляет его в список
     * Creates a new message and adds it to the list
     */
    const sendMessage = useCallback((): void => {
        // Проверка: поле ввода не должно быть пустым / Check: input field must not be empty
        if (!inputText.trim()) return;

        /**
         * Создание нового сообщения
         * Create new message
         * id - используем timestamp для уникальности / use timestamp for uniqueness
         * sender - имя текущего пользователя / current username
         * content - текст из поля ввода / text from input field
         * timestamp - текущее время в формате HH:MM / current time in HH:MM format
         */
        const newMessage: Message = {
            id: Date.now().toString(),
            sender: currentUsername,
            content: inputText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'TEXT',
        };

        // Добавление сообщения в список / Add message to list
        setMessages(prev => [...prev, newMessage]);

        // Очистка поля ввода / Clear input field
        setInputText('');

        /**
         * Множественные вызовы прокрутки для гарантии
         * Multiple scroll calls for guarantee
         * Разные задержки обеспечивают прокрутку после:
         * Different delays ensure scrolling after:
         * - Добавления сообщения в стейт / Adding message to state
         * - Рендеринга нового сообщения / New message rendering
         * - Анимации появления сообщения / Message appearance animation
         * - Возможных перерисовок FlatList / Possible FlatList re-renders
         */
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 400);
        /*
        setTimeout(() => scrollToEnd(true), 30);
        setTimeout(() => scrollToEnd(true), 100);
        setTimeout(() => scrollToEnd(true), 250);
        setTimeout(() => scrollToEnd(true), 500);
        setTimeout(() => scrollToEnd(true), 800);*/
    }, [inputText, currentUsername, scrollToEnd]);

    /**
     * Выбор и отправка изображения из галереи
     * Pick and send image from gallery
     * Запрашивает разрешение, открывает галерею, создаёт сообщение с фото
     * Requests permission, opens gallery, creates message with photo
     */
    const pickImage = async (): Promise<void> => {
        // Запрос разрешения на доступ к галерее / Request gallery permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        // Если разрешение не получено - показываем ошибку / If permission denied - show error
        if (status !== 'granted') {
            Alert.alert(t('error'), t('no_access'));
            return;
        }

        /**
         * Открытие галереи / Open gallery
         * mediaTypes: только изображения / Images only
         * quality: 0.8 - хорошее качество при разумном размере / good quality with reasonable size
         */
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        // Если пользователь выбрал изображение (не отменил выбор) / If user selected an image (not cancelled)
        if (!result.canceled && result.assets[0]) {
            // Создание сообщения с фото / Create message with photo
            const newMessage: Message = {
                id: Date.now().toString(),
                sender: currentUsername,
                content: `📷 ${t('photo')}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'IMAGE',
                mediaUrl: result.assets[0].uri,
            };
            setMessages(prev => [...prev, newMessage]);
        }
    };

    /**
     * Начало записи голосового сообщения
     * Start voice message recording
     * (Временно - просто имитирует запись)
     * (Temporary - just simulates recording)
     */
    const startRecording = async (): Promise<void> => {
        try {
            // Запрос разрешения на использование микрофона / Request microphone permission
            await Audio.requestPermissionsAsync();
            // Настройка режима аудио для записи / Setup audio mode for recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            setIsRecording(true);

            // Имитация записи на 3 секунды / Simulate recording for 3 seconds
            setTimeout(() => stopRecording(), 3000);
        } catch (err) {
            Alert.alert('Ошибка / Error', 'Не удалось начать запись / Could not start recording');
        }
    };

    /**
     * Остановка записи и отправка голосового сообщения
     * Stop recording and send voice message
     */
    const stopRecording = async (): Promise<void> => {
        setIsRecording(false);

        // Создание сообщения с голосом / Create voice message
        const newMessage: Message = {
            id: Date.now().toString(),
            sender: currentUsername,
            content: `🎙️ ${t('voice_message')}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'VOICE',
        };
        setMessages(prev => [...prev, newMessage]);
    };

    // ==================== РЕНДЕРИНГ СООБЩЕНИЙ ====================
    // Message rendering

    /**
     * Рендер отдельного сообщения
     * Render individual message
     * @param item - Объект сообщения / Message object
     * @returns JSX компонент ThoughtBubble / ThoughtBubble JSX component
     */
    const renderMessage = useCallback(({ item }: { item: Message }) => (
        <ThoughtBubble
            content={item.content}
            sender={item.sender}
            timestamp={item.timestamp}
            isMyMessage={item.sender === currentUsername}
            type={item.type}
            mediaUrl={item.mediaUrl}
        />
    ), [currentUsername]);

    /**
     * Генерация уникального ключа для элементов FlatList
     * Generate unique key for FlatList items
     * Использует комбинацию индекса и ID для гарантии уникальности
     * Uses combination of index and ID to guarantee uniqueness
     * @param _ - Сообщение (не используется) / Message (unused)
     * @param index - Индекс сообщения в списке / Message index in list
     * @returns Уникальный ключ в формате "индекс-id" / Unique key in format "index-id"
     */
    const keyExtractor = useCallback((_: Message, index: number): string => `${index}-${_.id}`, []);

    // ==================== ОСНОВНОЙ РЕНДЕР ====================
    // Main render

    return (
        <View style={[styles.container, { marginBottom: keyboardHeight }]}>
            {/* Фоновый градиент / Background gradient */}
            {/* Создаёт плавный переход цветов для приятного визуального фона */}
            {/* Creates smooth color transition for pleasant visual background */}
            <LinearGradient
                colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Декоративные парящие облака на фоне / Decorative floating clouds in background */}
            {/* Добавляют атмосферу лёгкости и воздушности */}
            {/* Add atmosphere of lightness and airiness */}
            <FloatingClouds />

            {/* Верхняя панель с названием чата / Header with chat name */}
            {/* Простой и минималистичный заголовок без лишних элементов */}
            {/* Simple and minimalistic header without extra elements */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>{roomName}</Text>
            </View>

            {/* Список сообщений / Messages list */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={keyExtractor}
                renderItem={renderMessage}
                style={styles.messageList}
                contentContainerStyle={[
                    styles.messageListContent,
                    { paddingBottom: keyboardVisible ? keyboardHeight + 24 : 24 }  // ← ключевое изменение
                ]}
                showsVerticalScrollIndicator={false}
                /**
                 * Обработчик изменения размера контента
                 * Content size change handler
                 * Срабатывает при добавлении новых сообщений
                 * Triggers when new messages are added
                 */
                onContentSizeChange={() => { setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 400); }}
                /**
                 * Обработчик завершения первой отрисовки
                 * Layout handler for initial render
                 * Прокрутка к последнему сообщению без анимации для мгновенного отображения
                 * Scroll to last message without animation for instant display
                 */
                onLayout={() => { setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100); }}
            /**
             * Поддержание видимой позиции при изменении контента
             * Maintain visible position when content changes
             * Помогает избежать скачков при добавлении новых сообщений в начало списка
             * Helps avoid jumps when adding new messages to the top of the list
             */

            />

            {/* Нижняя панель ввода сообщений / Message input panel */}
            {/* Содержит все элементы для отправки сообщений */}
            {/* Contains all elements for sending messages */}
            <View style={[
                styles.inputWrapper,
                {
                    // Динамический отступ снизу при появлении клавиатуры
                    // Dynamic bottom padding when keyboard appears
                    // Клавиатура поднимает панель ввода
                    // Keyboard raises input panel
                    paddingBottom: keyboardVisible ? 8 : insets.bottom + 8
                }
            ]}>
                <View style={styles.inputContainer}>
                    {/* Кнопка выбора фото / Photo picker button */}
                    {/* Иконка фотоаппарата - открывает галерею устройства */}
                    {/* Camera icon - opens device gallery */}
                    <TouchableOpacity
                        onPress={pickImage}
                        style={styles.iconButton}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.iconText}>📷</Text>
                    </TouchableOpacity>

                    {/* Кнопка записи голоса / Voice recording button */}
                    {/* Микрофон - при нажатии начинается запись */}
                    {/* Microphone - press and hold to start recording */}
                    <TouchableOpacity
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                        style={[styles.iconButton, isRecording && styles.recordingActive]}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.iconText}>{isRecording ? '🔴' : '🎙️'}</Text>
                    </TouchableOpacity>

                    {/* Поле ввода текста / Text input field */}
                    {/* Основной элемент для набора текста сообщения */}
                    {/* Main element for typing message text */}
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={t('placeholder')}
                        placeholderTextColor="#95A5A6"
                        onSubmitEditing={sendMessage}
                        returnKeyType="send"
                        multiline
                        maxLength={1000}
                    />

                    {/* Кнопка отправки сообщения / Send message button */}
                    {/* Стрелка вверх - символ отправки / Up arrow as send symbol */}
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={!inputText.trim()}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.sendButtonText}>↑</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

/**
 * Стили компонента ChatRoomScreen
 * ChatRoomScreen component styles
 */
const styles = StyleSheet.create({
    // Основной контейнер экрана / Screen main container
    container: {
        flex: 1,
        backgroundColor: '#E8F4F8'
    },

    // Верхняя панель с заголовком / Header panel
    header: {
        backgroundColor: 'rgba(255,255,255,0.85)',  // Полупрозрачный белый / Semi-transparent white
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomLeftRadius: 24,   // Скругление снизу слева / Bottom left rounding
        borderBottomRightRadius: 24,  // Скругление снизу справа / Bottom right rounding
        alignItems: 'center',
        zIndex: 1,                     // Поверх фоновых облаков / Above background clouds
    },

    // Заголовок - название чата / Header title - chat name
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50'
    },

    // Контейнер списка сообщений / Messages list container
    messageList: {
        flex: 1
    },

    // Внутренний контент списка / List content container
    messageListContent: {
        paddingHorizontal: 8,
        paddingVertical: 16,
        paddingBottom: 24
    },

    // Обёртка панели ввода / Input panel wrapper
    inputWrapper: {
        borderTopWidth: 1,                           // Тонкая линия сверху / Thin line at top
        borderTopColor: 'rgba(0,0,0,0.05)',          // Едва заметная граница / Barely visible border
        backgroundColor: 'rgba(255,255,255,0.96)',   // Почти белый с лёгкой прозрачностью / Almost white with slight transparency
        paddingHorizontal: 12,
        paddingVertical: 8,
    },

    // Контейнер для элементов ввода / Input elements container
    inputContainer: {
        flexDirection: 'row',      // Горизонтальное расположение / Horizontal layout
        alignItems: 'flex-end',    // Выравнивание по нижнему краю / Align to bottom
        gap: 10,                   // Расстояние между элементами / Space between elements
    },

    // Стиль кнопок с иконками / Icon buttons style
    iconButton: {
        padding: 10,
        backgroundColor: '#F0F0F5',   // Светло-серый фон / Light gray background
        borderRadius: 30,              // Круглая форма / Circular shape
        justifyContent: 'center',
        alignItems: 'center',
        width: 44,
        height: 44,
    },

    // Текст иконок / Icon text
    iconText: {
        fontSize: 20
    },

    // Активный стиль при записи голоса / Active style during voice recording
    recordingActive: {
        backgroundColor: '#FFE0E0'     // Красноватый оттенок / Reddish tint
    },

    // Поле ввода текста / Text input field
    input: {
        flex: 1,                       // Занимает всё доступное пространство / Takes all available space
        borderWidth: 1,
        borderColor: '#E8E8E8',
        borderRadius: 30,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        fontSize: 15,
        color: '#2C3E50',
        maxHeight: 80,                 // Максимальная высота для многострочного текста / Max height for multiline text
    },

    // Кнопка отправки / Send button
    sendButton: {
        backgroundColor: '#6C5CE7',    // Фиолетовый цвет акцента / Purple accent color
        width: 44,
        height: 44,
        borderRadius: 22,              // Идеально круглая форма / Perfectly circular shape
        justifyContent: 'center',
        alignItems: 'center',
        // Тень для объёма / Shadow for depth
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },

    // Отключённая кнопка отправки / Disabled send button
    sendButtonDisabled: {
        backgroundColor: '#B0A0D0',    // Более светлый фиолетовый / Lighter purple
        opacity: 0.7
    },

    // Текст кнопки отправки / Send button text
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '600',
        marginTop: -2                  // Небольшой сдвиг для визуального центрирования / Slight shift for visual centering
    },
});

export default ChatRoomScreen;