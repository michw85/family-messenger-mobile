/**
 * @file ChatRoomScreen.tsx
 * @description Экран чата с облаками мыслей и исправленной прокруткой
 * @description Chat screen with thought bubbles and fixed scrolling
 * 
 * @author Family Messenger Team
 * @version 3.5.0
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
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import ThoughtBubble from '../components/ThoughtBubble';
import FloatingClouds from '../components/FloatingClouds';

const { height: screenHeight } = Dimensions.get('window');

/**
 * Интерфейс сообщения
 * Message interface
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
 */
const ChatRoomScreen: React.FC<any> = ({ route }) => {
    // Получаем параметры комнаты / Get room parameters
    const { roomId, roomName } = route.params || { 
        roomId: 'family-chat', 
        roomName: 'Семейные мысли / Family Thoughts' 
    };
    
    // Состояния / States
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState<string>('');
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [currentUsername, setCurrentUsername] = useState<string>('You');
    const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
    
    // Refs
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);

    /**
     * Эффект при монтировании
     * Effect on mount
     * Загружает имя пользователя и настраивает клавиатуру
     * Loads username and sets up keyboard
     */
    useEffect(() => {
        const loadUsername = async () => {
            const name = await AsyncStorage.getItem('username');
            if (name) setCurrentUsername(name);
        };
        loadUsername();
        
        // Подписка на события клавиатуры / Keyboard event subscription
        const showSub = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            // Отложенная прокрутка для гарантии / Delayed scroll for guarantee
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 200);
        });
        
        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
        
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    /**
     * Автоматическая прокрутка при добавлении новых сообщений
     * Auto-scroll when new messages are added
     */
    useEffect(() => {
        if (messages.length > 0) {
            const timeoutId = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [messages]);

    /**
     * Отправка текстового сообщения
     * Send text message
     */
    const sendMessage = useCallback(() => {
        if (!inputText.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            sender: currentUsername,
            content: inputText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'TEXT',
        };

        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        
        // Множественные прокрутки для надёжности / Multiple scrolls for reliability
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }, [inputText, currentUsername]);

    /**
     * Выбор и отправка изображения
     * Pick and send image
     */
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Ошибка / Error', 'Нет доступа к галерее / No gallery access');
            return;
        }
        
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });
        
        if (!result.canceled && result.assets[0]) {
            const newMessage: Message = {
                id: Date.now().toString(),
                sender: currentUsername,
                content: '📷 Фото / Photo',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'IMAGE',
                mediaUrl: result.assets[0].uri,
            };
            setMessages(prev => [...prev, newMessage]);
        }
    };

    /**
     * Рендер отдельного сообщения
     * Render individual message
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
     * Генерация ключа для FlatList
     * Key extractor for FlatList
     */
    const keyExtractor = useCallback((_: Message, index: number) => `${index}-${_.id}`, []);

    return (
        <View style={styles.container}>
            {/* Фоновый градиент / Background gradient */}
            <LinearGradient
                colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']}
                style={StyleSheet.absoluteFillObject}
            />
            
            {/* Декоративные парящие облака / Decorative floating clouds */}
            <FloatingClouds />
            
            {/* Заголовок с названием комнаты / Header with room name */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>{roomName}</Text>
                <Text style={styles.headerStatus}>💭 Мысли парят в воздухе / Thoughts are floating in the air</Text>
            </View>
            
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
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
                }}
            />
            
            {/* Панель ввода сообщений / Message input panel */}
            <View style={[
                styles.inputWrapper, 
                { 
                    paddingBottom: keyboardVisible ? 12 : insets.bottom + 15,
                    paddingTop: 8,
                }
            ]}>
                <View style={styles.inputContainer}>
                    {/* Кнопка выбора фото / Photo picker button */}
                    <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
                        <Text style={styles.iconText}>📷</Text>
                    </TouchableOpacity>
                    
                    {/* Кнопка записи голоса / Voice recording button */}
                    <TouchableOpacity 
                        onPressIn={() => setIsRecording(true)}
                        onPressOut={() => setIsRecording(false)}
                        style={[styles.iconButton, isRecording && styles.recordingActive]}
                    >
                        <Text style={styles.iconText}>{isRecording ? '🔴' : '🎙️'}</Text>
                    </TouchableOpacity>
                    
                    {/* Поле ввода текста / Text input field */}
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Пиши... / Write..."
                        placeholderTextColor="#95A5A6"
                        onSubmitEditing={sendMessage}
                        returnKeyType="send"
                        multiline
                    />
                    
                    {/* Кнопка отправки / Send button */}
                    <TouchableOpacity 
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
                        onPress={sendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Text style={styles.sendButtonText}>✈️</Text>
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
    container: { 
        flex: 1, 
        backgroundColor: '#E8F4F8' 
    },
    header: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
    },
    headerStatus: {
        fontSize: 11,
        color: '#8A9AAA',
        marginTop: 2,
    },
    messageList: { 
        flex: 1 
    },
    messageListContent: { 
        paddingHorizontal: 8, 
        paddingVertical: 16, 
        paddingBottom: 24 
    },
    inputWrapper: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(255,255,255,0.96)',
        paddingHorizontal: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
    },
    iconButton: {
        padding: 10,
        backgroundColor: '#F0F0F5',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        width: 44,
        height: 44,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    iconText: { 
        fontSize: 20 
    },
    recordingActive: {
        backgroundColor: '#FFE0E0',
    },
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    sendButton: {
        backgroundColor: '#6C5CE7',
        padding: 10,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        width: 44,
        height: 44,
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    sendButtonDisabled: {
        backgroundColor: '#B0A0D0',
        opacity: 0.7,
    },
    sendButtonText: { 
        color: '#FFFFFF', 
        fontSize: 20, 
        textAlign: 'center' 
    },
});

export default ChatRoomScreen;