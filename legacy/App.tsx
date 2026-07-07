/**
 * @file App.tsx
 * @description Главный компонент приложения с настройкой навигации, языков и инициализацией данных
 * @description Main app component with navigation, language setup and data initialization
 * 
 * @author Family Messenger Team
 * @version 2.3.0
 * @license MIT
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import RoomSelectScreen from './src/screens/RoomSelectScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import { colors } from './src/styles/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';


const Stack = createNativeStackNavigator();

/**
 * Ключи для хранения данных в AsyncStorage
 * Storage keys for AsyncStorage
 */
const STORAGE_KEYS = {
    TOKEN: '@family_messenger_token',
    USERNAME: '@family_messenger_username',
    CHATS: '@family_messenger_chats',
    LANGUAGE: '@family_messenger_language',
    FIRST_LAUNCH: '@family_messenger_first_launch',
};

/**
 * Начальные чаты по умолчанию
 * Default initial chats
 */
const DEFAULT_CHATS = [
    { id: 'family', name: 'Семья', type: 'group', color: '#6C5CE7', createdAt: Date.now() },
    { id: 'friends', name: 'Друзья', type: 'group', color: '#00CEC9', createdAt: Date.now() },
    { id: 'work', name: 'Работа', type: 'group', color: '#FF7675', createdAt: Date.now() },
    { id: 'private-mom', name: 'Мама', type: 'private', color: '#FD79A8', createdAt: Date.now() },
    { id: 'private-dad', name: 'Папа', type: 'private', color: '#55EFC4', createdAt: Date.now() },
    { id: 'private-brother', name: 'Брат', type: 'private', color: '#74B9FF', createdAt: Date.now() },
];

/**
 * Компонент инициализации данных
 * Data initialization component
 */
const Initializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setLanguage } = useLanguage();

    useEffect(() => {
        const initializeApp = async () => {
            try {
                console.log('Starting app initialization...');

                // Проверяем первый ли запуск / Check if first launch
                const isFirstLaunch = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH);
                console.log('Is first launch:', !isFirstLaunch);

                if (!isFirstLaunch) {
                    // Первый запуск - инициализируем данные / First launch - initialize data
                    console.log('First launch - initializing data...');

                    // Устанавливаем флаг первого запуска / Set first launch flag
                    await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'true');

                    // Инициализируем чаты по умолчанию / Initialize default chats
                    await AsyncStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(DEFAULT_CHATS));
                    console.log('Default chats saved:', DEFAULT_CHATS.length);

                    // НЕ создаём тестового пользователя! Пусть пользователь сам регистрируется
                    // Do NOT create test user! Let user register themselves
                    console.log('Data initialized successfully');
                } else {
                    console.log('App already initialized');

                    // Проверяем, есть ли чаты в хранилище / Check if chats exist in storage
                    const savedChats = await AsyncStorage.getItem(STORAGE_KEYS.CHATS);

                    if (!savedChats) {
                        // Если чатов нет, восстанавливаем стандартные / If no chats, restore defaults
                        console.log('No chats found, restoring defaults...');
                        await AsyncStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(DEFAULT_CHATS));
                    } else {
                        // Проверяем, что чаты - это массив / Verify chats is an array
                        const parsedChats = JSON.parse(savedChats);
                        if (!Array.isArray(parsedChats)) {
                            console.log('Chats is not an array, resetting...');
                            await AsyncStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(DEFAULT_CHATS));
                        } else {
                            console.log('Chats loaded successfully, count:', parsedChats.length);
                        }
                    }
                }

                // Загрузка сохранённого языка / Load saved language
                const savedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
                console.log('Saved language:', savedLanguage);
                if (savedLanguage === 'en' || savedLanguage === 'ru') {
                    setLanguage(savedLanguage);
                }

                setIsReady(true);
                console.log('App initialization complete!');
            } catch (error) {
                console.error('Initialization error:', error);
                setError('Failed to initialize app. Please restart.');
                setIsReady(true);
            }
        };

        initializeApp();
    }, []);

    if (!isReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F4F8' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 16, color: '#8A9AAA' }}>Loading...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F4F8' }}>
                <Text style={{ fontSize: 16, color: '#FF7675', textAlign: 'center', padding: 20 }}>{error}</Text>
                <TouchableOpacity
                    onPress={() => {
                        setError(null);
                        setIsReady(false);
                        // Перезапустить инициализацию / Restart initialization
                        const initializeApp = async () => {
                            // ... логика перезапуска / restart logic
                        };
                    }}
                    style={{ marginTop: 16, padding: 12, backgroundColor: colors.primary, borderRadius: 8 }}
                >
                    <Text style={{ color: '#FFFFFF' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return <>{children}</>;
};

/**
 * Главный компонент навигации
 * Main navigation component
 */
const Navigation = () => {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                setIsChecking(true);
                // const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
                // const username = await AsyncStorage.getItem(STORAGE_KEYS.USERNAME);
                const token = await AsyncStorage.getItem('token');
                const username = await AsyncStorage.getItem('username');

                console.log('Checking login status - Token exists:', !!token);
                console.log('Checking login status - Username exists:', !!username);

                // Пользователь считается авторизованным, если есть и токен, и имя пользователя
                // User is considered authorized if both token and username exist
                const isLoggedInFlag = !!(token && username);
                setIsLoggedIn(isLoggedInFlag);
            } catch (error) {
                console.error('Error checking login status:', error);
                setIsLoggedIn(false);
            } finally {
                setIsChecking(false);
            }
        };

        checkLoginStatus();
    }, []);

    // Показываем индикатор загрузки во время проверки / Show loading indicator during check
    if (isChecking) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F4F8' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 16, color: '#8A9AAA' }}>Checking...</Text>
            </View>
        );
    }

    console.log('Navigation - isLoggedIn:', isLoggedIn);
    console.log('Navigation - initialRoute:', isLoggedIn ? 'RoomSelect' : 'Login');

    return (
        <NavigationContainer>
            <Stack.Navigator
                // initialRouteName="Login"
                initialRouteName={isLoggedIn ? "RoomSelect" : "Login"}
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            >
                {/* Экран входа - всегда должен быть доступен / Login screen - should always be available */}
                <Stack.Screen name="Login" component={LoginScreen} />

                {/* Экран регистрации - всегда должен быть доступен / Register screen - should always be available */}
                <Stack.Screen name="Register" component={RegisterScreen} />

                {/* Экран выбора чата - только для авторизованных / Room select screen - only for authorized */}
                <Stack.Screen name="RoomSelect" component={RoomSelectScreen} />

                {/* Экран чата - только для авторизованных / Chat room screen - only for authorized */}
                <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

/**
 * Главный компонент приложения
 * Main app component
 */
export default function App() {
    return (
        <SafeAreaProvider>
            <LanguageProvider>
                <Initializer>
                    <Navigation />
                </Initializer>
            </LanguageProvider>
        </SafeAreaProvider>
    );
}