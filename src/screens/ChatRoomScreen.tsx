import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WS_URL } from '../services/api';

interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
}

export default function ChatRoomScreen({ route }: any) {
    const { roomId, token: routeToken } = route.params || {};
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [connected, setConnected] = useState(false);
    const [token, setToken] = useState(routeToken || '');
    const stompClientRef = useRef<Client | null>(null);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        const loadToken = async () => {
            try {
                const savedToken = await AsyncStorage.getItem('token');
                console.log('Loaded token:', savedToken ? 'Yes' : 'No');
                if (savedToken) {
                    setToken(savedToken);
                } else {
                    console.log('No token found, WebSocket will not connect');
                }
            } catch (error) {
                console.error('Error loading token:', error);
            }
        };
        loadToken();
    }, []);

    useEffect(() => {
        if (!token) return;

        console.log('🔌 Connecting to WebSocket...');

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            debug: (str) => console.log('🐛 DEBUG:', str),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('✅ WebSocket Connected!');
                setConnected(true);

                console.log(`📡 Subscribing to /topic/room/${roomId}`);
                client.subscribe(`/topic/room/${roomId}`, (message) => {
                    console.log('📨 Message received:', message.body);
                    try {
                        const newMessage = JSON.parse(message.body);
                        setMessages(prev => [...prev, newMessage]);
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                });

                // Отправляем приветственное сообщение
                client.publish({
                    destination: `/app/chat.send/${roomId}`,
                    body: JSON.stringify({
                        content: 'User joined the chat',
                        type: 'JOIN',
                    }),
                });
            },
            onDisconnect: () => {
                console.log('❌ WebSocket Disconnected');
                setConnected(false);
            },
            onStompError: (frame) => {
                console.error('STOMP Error:', frame);
                Alert.alert('WebSocket Error', 'Connection failed');
            },
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
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const sendMessage = () => {
        if (!inputText.trim()) return;
        if (!connected || !stompClientRef.current) return;

        // Оптимистичное обновление
        const tempMessage: Message = {
            id: Date.now().toString(),
            sender: 'You',
            content: inputText,
            timestamp: new Date().toLocaleTimeString(),
        };
        setMessages(prev => [...prev, tempMessage]);

        stompClientRef.current.publish({
            destination: `/app/chat.send/${roomId}`,
            body: JSON.stringify({
                content: inputText,
                type: 'CHAT',
            }),
        });

        setInputText('');
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerText}>Room: {roomId}</Text>
                    <Text style={[styles.status, connected ? styles.connected : styles.disconnected]}>
                        {connected ? '🟢 Connected' : '🔴 Disconnected'}
                    </Text>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.messageBubble}>
                            <Text style={styles.sender}>{item.sender || 'User'}</Text>
                            <Text>{item.content}</Text>
                            <Text style={styles.time}>{item.timestamp}</Text>
                        </View>
                    )}
                    style={styles.messageList}
                />

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 16, backgroundColor: '#007AFF', flexDirection: 'row', justifyContent: 'space-between' },
    headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    status: { fontSize: 14 },
    connected: { color: '#4CD964' },
    disconnected: { color: 'white' },
    messageList: { flex: 1, padding: 16 },
    messageBubble: { backgroundColor: '#e1e1e1', padding: 12, borderRadius: 8, marginBottom: 8 },
    sender: { fontWeight: 'bold', marginBottom: 4 },
    time: { fontSize: 10, color: '#666', marginTop: 4 },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginRight: 8,
        backgroundColor: '#fff',
    },
    sendButton: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        minWidth: 70,
    },
    sendButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
});