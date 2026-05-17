/**
 * @file App.tsx
 * @description Главный компонент приложения с настройкой навигации
 * @description Main app component with navigation setup
 * 
 * @author Family Messenger Team
 * @version 1.0.0
 * @license MIT
 */

import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import RoomSelectScreen from './src/screens/RoomSelectScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';

const Stack = createNativeStackNavigator();

/**
 * Главный компонент приложения
 * Main app component
 */
export default function App() {
  const [count, setCount] = useState(0); // Хук внутри компонента
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false, // Скрываем заголовок для всех экранов
          animation: 'slide_from_right', // Анимация переходов
        }}
      >
        {/* Экран входа */}
        <Stack.Screen name="Login" component={LoginScreen} />
        
        {/* Экран регистрации */}
        <Stack.Screen name="Register" component={RegisterScreen} />
        
        {/* Экран выбора комнаты */}
        <Stack.Screen name="RoomSelect" component={RoomSelectScreen} />
        
        {/* Экран чата */}
        <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}