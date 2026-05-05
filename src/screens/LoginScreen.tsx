import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { api } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
  try {
    console.log('1. Логин начат');
    const data = await api.login(username, password);
    console.log('2. Получен ответ:', data);
    
    if (data.token) {
      console.log('3. Токен получен');
      Alert.alert('Успех', 'Вы вошли в систему!');
      navigation.navigate('ChatList');
    } else {
      console.log('4. Токена нет');
      Alert.alert('Ошибка', data.message || 'Неверные учётные данные');
    }
  } catch (error) {
    console.log('5. Ошибка:', error);
    Alert.alert('Ошибка', 'Не удалось подключиться к серверу');
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Family Messenger</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 16 },
  button: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  link: { textAlign: 'center', marginTop: 16, color: '#007AFF' },
});