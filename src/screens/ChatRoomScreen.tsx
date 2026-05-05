import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL } from '../services/api';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}

export default function ChatRoomScreen({ route }: any) {
  const { roomId } = route.params || { roomId: 'family-chat' };
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      onConnect: () => {
        console.log('WebSocket Connected');
        setConnected(true);
        
        // Подписка на комнату
        client.subscribe(`/topic/room/${roomId}`, (message) => {
          const newMessage = JSON.parse(message.body);
          setMessages(prev => [...prev, newMessage]);
        });
      },
      onDisconnect: () => {
        console.log('WebSocket Disconnected');
        setConnected(false);
      },
    });
    
    client.activate();
    setStompClient(client);
    
    return () => {
      if (client) client.deactivate();
    };
  }, [roomId]);

  const sendMessage = () => {
    if (!inputText.trim() || !stompClient || !connected) return;
    
    stompClient.publish({
      destination: `/app/chat.send/${roomId}`,
      body: JSON.stringify({
        content: inputText,
        type: 'CHAT',
      }),
    });
    
    setInputText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Room: {roomId}</Text>
        <Text style={styles.status}>{connected ? '🟢 Connected' : '🔴 Disconnected'}</Text>
      </View>
      
      <FlatList
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
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, backgroundColor: '#007AFF', flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  status: { color: 'white' },
  messageList: { flex: 1, padding: 16 },
  messageBubble: { backgroundColor: '#e1e1e1', padding: 12, borderRadius: 8, marginBottom: 8 },
  sender: { fontWeight: 'bold', marginBottom: 4 },
  time: { fontSize: 10, color: '#666', marginTop: 4 },
  inputContainer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#ddd' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginRight: 8 },
  sendButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, justifyContent: 'center' },
  sendButtonText: { color: 'white', fontWeight: 'bold' },
});