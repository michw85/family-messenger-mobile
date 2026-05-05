import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ChatListScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat Rooms</Text>
      
      <TouchableOpacity 
        style={styles.roomButton}
        onPress={() => navigation.navigate('ChatRoom', { roomId: 'family-chat' })}
      >
        <Text style={styles.roomName}>🏠 Family Chat</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.roomButton}
        onPress={() => navigation.navigate('ChatRoom', { roomId: 'friends-chat' })}
      >
        <Text style={styles.roomName}>👥 Friends Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  roomButton: { padding: 16, backgroundColor: '#f0f0f0', borderRadius: 12, marginBottom: 12 },
  roomName: { fontSize: 18 },
});