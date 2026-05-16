/**
 * @file ChatRoomScreen.tsx
 * @description Экран чата с исправленной прокруткой и панелью ввода
 * @description Chat screen with fixed scrolling and input panel
 * 
 * @author Family Messenger Team
 * @version 3.3.0
 * @license MIT
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Keyboard,
    Platform,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WS_URL } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import ThoughtBubble from '../components/ThoughtBubble';
import FloatingClouds from '../components/FloatingClouds';

const { height: screenHeight } = Dimensions.get('window');

interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    type?: 'TEXT' | 'IMAGE' | 'VOICE';
    mediaUrl?: string;
}

export default function ChatRoomScreen({ route }: any) {
    const { roomId } = route.params || { roomId: 'family-chat' };
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [connected, setConnected] = useState(false);
    const [token, setToken] = useState('');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    
    const stompClientRef = useRef<Client | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const insets = useSafeAreaInsets();
    const flyAnim = useRef(new Animated.Value(0)).current;
    const [isFlying, setIsFlying] = useState(false);
    
    // Отслеживание высоты клавиатуры
    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
            // Прокрутка при появлении клавиатуры
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 150);
        });
        
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
            // Прокрутка при скрытии клавиатуры
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
        
        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);
    
    // Загрузка токена
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
    
    // WebSocket подключение
    useEffect(() => {
        if (!token) return;
        
        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
            onConnect: () => {
                setConnected(true);
                
                client.subscribe(`/topic/room/${roomId}`, (message) => {
                    const newMessage = JSON.parse(message.body);
                    setMessages(prev => [...prev, newMessage]);
                    // Принудительная прокрутка при получении сообщения
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                });
                
                client.subscribe(`/topic/room/${roomId}/typing`, (message) => {
                    const data = JSON.parse(message.body);
                    if (data.typing) {
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
    }, [roomId, token]);
    
    // Авто-скролл при добавлении сообщений
    useEffect(() => {
        if (messages.length > 0) {
            const timeoutId = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [messages]);
    
    // Отправка сообщения
    const sendMessage = useCallback(() => {
        if (!inputText.trim() || !connected || isFlying) return;
        
        setIsFlying(true);
        
        Animated.sequence([
            Animated.timing(flyAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(flyAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setIsFlying(false));
        
        const newMessage: Message = {
            id: Date.now().toString(),
            sender: 'You',
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
        
        // Немедленная прокрутка
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
    }, [inputText, connected, isFlying, flyAnim]);
    
    const handleTyping = useCallback(() => {
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
    }, []);
    
    const pickImage = async () => {
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
            Alert.alert('Ошибка', 'Не удалось начать запись');
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
                    content: '🎙️ Голосовое сообщение',
                    type: 'VOICE',
                    mediaUrl: uri,
                }),
            });
        }
        setRecording(null);
    };
    
    const flyTransform = flyAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, -25, 0],
    });
    
    const flyRotate = flyAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['0deg', '-25deg', '0deg'],
    });
    
    const renderMessage = useCallback(({ item }: { item: Message }) => (
        <ThoughtBubble
            content={item.content}
            sender={item.sender}
            timestamp={item.timestamp}
            isMyMessage={item.sender === 'You'}
            type={item.type}
            mediaUrl={item.mediaUrl}
            userColor="#6C5CE7"
        />
    ), []);
    
    const keyExtractor = useCallback((_: Message, index: number) => `${index}-${_.id}`, []);
    
    // Расчёт отступа для панели ввода
    const inputPanelBottom = keyboardHeight > 0 
        ? keyboardHeight - (Platform.OS === 'ios' ? 0 : 20)
        : (Platform.OS === 'ios' ? insets.bottom + 15 : 20);
    
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />
            
            <FloatingClouds />
            
            {typingUser && (
                <View style={styles.typingContainer}>
                    <View style={styles.typingCloud}>
                        <Text style={styles.typingText}>
                            ✍️ {typingUser === 'You' ? 'Кто-то' : typingUser} печатает...
                        </Text>
                    </View>
                </View>
            )}
            
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
            
            {/* Панель ввода с динамическим отступом */}
            <Animated.View 
                style={[
                    styles.inputWrapper,
                    {
                        paddingBottom: inputPanelBottom,
                        paddingTop: 8,
                        transform: [{
                            translateY: keyboardHeight > 0 ? 0 : 0
                        }]
                    }
                ]}
            >
                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
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
                        onChangeText={(text) => {
                            setInputText(text);
                            handleTyping();
                        }}
                        placeholder="Мысль..."
                        placeholderTextColor="#95A5A6"
                        onSubmitEditing={sendMessage}
                        returnKeyType="send"
                        multiline
                    />
                    
                    <TouchableOpacity 
                        style={[styles.sendButton, (!inputText.trim() || isFlying) && styles.sendButtonDisabled]} 
                        onPress={sendMessage}
                        disabled={!inputText.trim() || isFlying}
                    >
                        <Animated.Text 
                            style={[
                                styles.sendButtonText,
                                {
                                    transform: [
                                        { translateY: flyTransform },
                                        { rotate: flyRotate }
                                    ]
                                }
                            ]}
                        >
                            ✈️
                        </Animated.Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    typingContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        zIndex: 1,
    },
    typingCloud: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    typingText: {
        fontSize: 12,
        color: '#8A9AAA',
        fontStyle: 'italic',
    },
    messageList: {
        flex: 1,
    },
    messageListContent: {
        padding: 16,
        paddingBottom: 20,
    },
    inputWrapper: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(255,255,255,0.96)',
    },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        alignItems: 'flex-end',
        gap: 8,
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
        fontSize: 20,
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
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        fontSize: 14,
        color: '#2C3E50',
        maxHeight: 80,
        minHeight: 40,
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
        color: 'white',
        fontSize: 20,
        textAlign: 'center',
    },
});