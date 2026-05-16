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
    // KeyboardAwareScrollView,
    Keyboard,
    Platform,
    Alert,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    type?: 'TEXT' | 'IMAGE' | 'VOICE';
    mediaUrl?: string;
}

/**
 * Компонент чата с WebSocket подключением
 * Chat component with WebSocket connection
 */
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

    useEffect(() => {
        if (!token) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            reconnectDelay: 5000,
            onConnect: () => {
                setConnected(true);

                client.subscribe(`/topic/room/${roomId}`, (message) => {
                    const newMessage = JSON.parse(message.body);
                    setMessages(prev => [...prev, newMessage]);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                });

                client.subscribe(`/topic/room/${roomId}/typing`, (message) => {
                    const data = JSON.parse(message.body);
                    if (data.typing) {
                        setTypingUser(data.user);
                        setTimeout(() => setTypingUser(null), 2000);
                    }
                });

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

    useEffect(() => {
        if (messages.length) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    // Слушаем клавиатуру вручную — работает с edgeToEdge
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const sendMessage = () => {
        if (!inputText.trim() || !connected) return;

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
                    content: '📷 Photo',
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
                    content: '🎤 Voice message',
                    type: 'VOICE',
                    mediaUrl: uri,
                }),
            });
        }
        setRecording(null);
    };

    return (
        <View style={[styles.container, { paddingBottom: keyboardHeight || insets.bottom }]}>
            {/* <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            > */}
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}>Room: {roomId}</Text>
                <Text style={[styles.status, connected ? styles.connected : styles.disconnected]}>
                    {connected ? '🟢 Connected' : '🔴 Disconnected'}
                </Text>
            </View>

            {/* Typing indicator */}
            {typingUser && (
                <View style={styles.typingIndicator}>
                    <Text style={styles.typingText}>{typingUser} is typing...</Text>
                </View>
            )}

            {/* Messages list */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                    <View style={[styles.messageBubble, item.sender === 'You' && styles.myMessage]}>
                        <Text style={[styles.sender, item.sender === 'You' && styles.myMessageText]}>
                            {item.sender || 'User'}
                        </Text>
                        {item.type === 'IMAGE' && item.mediaUrl ? (
                            <Image source={{ uri: item.mediaUrl }} style={styles.imageMessage} />
                        ) : (
                            <Text style={item.sender === 'You' && styles.myMessageText}>{item.content}</Text>
                        )}
                        <Text style={[styles.time, item.sender === 'You' && styles.myMessageTime]}>
                            {item.timestamp}
                        </Text>
                    </View>
                )}
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
            />
            {/* Input panel */}
            <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
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

            {/* </KeyboardAvoidingView> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    flex: { flex: 1 },
    header: { padding: 16, backgroundColor: '#007AFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    status: { fontSize: 14 },
    connected: { color: '#4CD964' },
    disconnected: { color: 'white' },
    typingIndicator: { padding: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
    typingText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
    messageList: { flex: 1 },
    messageListContent: { padding: 16, paddingBottom: 20 },
    messageBubble: { backgroundColor: '#e1e1e1', padding: 12, borderRadius: 8, marginBottom: 8, maxWidth: '80%', alignSelf: 'flex-start' },
    myMessage: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
    myMessageText: { color: 'white' },
    myMessageTime: { color: '#cce5ff' },
    sender: { fontWeight: 'bold', marginBottom: 4 },
    time: { fontSize: 10, color: '#666', marginTop: 4 },
    imageMessage: { width: 200, height: 200, borderRadius: 8, marginVertical: 4 },
    inputWrapper: { borderTopWidth: 1, borderTopColor: '#ddd', backgroundColor: '#fff' },
    inputContainer: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: '#fff' },
    iconButton: { padding: 12, backgroundColor: '#e1e1e1', borderRadius: 8, marginRight: 8, justifyContent: 'center', alignItems: 'center', width: 50 },
    iconText: { fontSize: 20 },
    recordingActive: { backgroundColor: '#ff4444' },
    input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginRight: 8, backgroundColor: '#fff', fontSize: 16 },
    sendButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, justifyContent: 'center', minWidth: 70 },
    sendButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
});