/**
 * @file LoginScreen.tsx
 * @description Экран входа с сохранением данных пользователя и вызовом API бэкенда
 * @description Login screen with user data persistence and backend API call
 * 
 * @author Family Messenger Team
 * @version 3.0.0
 * @license MIT
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingClouds from '../components/FloatingClouds';
import { useLanguage } from '../context/LanguageContext';
import { login, updateFcmToken } from '../services/api'; // Импорт реального API
import { registerForPushNotificationsAsync } from '../utils/notifications';

/**
 * Ключи для хранения данных в AsyncStorage
 * Storage keys for AsyncStorage
 */
const STORAGE_KEYS = {
    TOKEN: '@family_messenger_token',
    USERNAME: '@family_messenger_username',
};

/**
 * Экран входа
 * Login screen component
 * @param navigation - объект навигации React Navigation
 */
const LoginScreen: React.FC<any> = ({ navigation }) => {
    const { t, language, setLanguage } = useLanguage();
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    // Анимации для плавного появления
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // Запуск анимации при монтировании
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();
    }, []);

    /**
     * Обработчик входа
     * Выполняет валидацию, вызывает API логина, сохраняет токен и имя пользователя
     * Login handler – validates input, calls login API, stores token and username
     */
    const handleLogin = async () => {
        // Проверка заполнения полей / Check fields are filled
        if (!username || !password) {
            Alert.alert(t('error'), 'Заполните все поля / Please fill all fields');
            return;
        }

        setLoading(true);
        try {
            // Реальный вызов бэкенда / Actual backend call
            const response = await login(username, password);
            const { token, user } = response.data;

            // Сохраняем полученные данные / Save received data
            // await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
            await AsyncStorage.setItem('token', token);
            // await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, user.username);
            await AsyncStorage.setItem('username', user.username);

            /* const pushToken = await registerForPushNotificationsAsync();
             if (pushToken) {
                 await updateFcmToken(pushToken);
             }*/

            console.log('Login successful – token saved');
            // Переход на экран выбора чатов / Navigate to chat selection
            navigation.replace('RoomSelect');
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert(t('error'), 'Неверное имя пользователя или пароль / Invalid username or password');
        } finally {
            setLoading(false);
        }

        // FCM отдельно, не блокирует логин
        try {
            const pushToken = await registerForPushNotificationsAsync();
            if (pushToken) await updateFcmToken(pushToken);
        } catch (e) {
            console.warn('FCM skipped:', e);
        }
    };

    /**
     * Переключение языка приложения
     * Toggle application language
     */
    const toggleLanguage = () => {
        setLanguage(language === 'ru' ? 'en' : 'ru');
    };

    return (
        <LinearGradient colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']} style={styles.container}>
            <FloatingClouds />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.header}>
                        <Text style={styles.emoji}>💭✨</Text>
                        <Text style={styles.title}>{t('app.name')}</Text>
                        <Text style={styles.subtitle}>{t('app.subtitle')}</Text>

                        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
                            <Text style={styles.langText}>{language === 'ru' ? '🇬🇧 English' : '🇷🇺 Русский'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor="#95A5A6"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            editable={!loading}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#95A5A6"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            editable={!loading}
                        />

                        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>→</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
                            <Text style={styles.linkText}>Create account</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    header: { alignItems: 'center', marginBottom: 48 },
    emoji: { fontSize: 64, marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '700', color: '#2C3E50', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#8A9AAA', textAlign: 'center' },
    langButton: { marginTop: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20 },
    langText: { fontSize: 12, fontWeight: '500', color: '#6C5CE7' },
    form: { gap: 16 },
    input: { borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 30, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.9)', fontSize: 16, color: '#2C3E50' },
    button: { backgroundColor: '#6C5CE7', borderRadius: 30, width: 50, height: 50, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 8 },
    buttonText: { color: '#FFFFFF', fontSize: 24, fontWeight: '600' },
    linkButton: { alignItems: 'center', marginTop: 16 },
    linkText: { color: '#6C5CE7', fontSize: 14 },
});

export default LoginScreen;