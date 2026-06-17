/**
 * @file RegisterScreen.tsx
 * @description Экран регистрации нового пользователя с вызовом API бэкенда
 * @description New user registration screen with backend API call
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
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingClouds from '../components/FloatingClouds';
import { useLanguage } from '../context/LanguageContext';
import { register, updateFcmToken } from '../services/api';
import { registerForPushNotificationsAsync } from '../utils/notifications';

const STORAGE_KEYS = {
    TOKEN: '@family_messenger_token',
    USERNAME: '@family_messenger_username',
};

/**
 * Экран регистрации
 * Registration screen component
 * @param navigation - объект навигации
 */
const RegisterScreen: React.FC<any> = ({ navigation }) => {
    const { t, language, setLanguage } = useLanguage();
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();
    }, []);

    /**
     * Валидация формы регистрации
     * Registration form validation
     * @returns true если все поля заполнены корректно
     */
    const validateForm = (): boolean => {
        if (!username || !email || !password || !confirmPassword) {
            Alert.alert(t('error'), 'Заполните все поля / Please fill all fields');
            return false;
        }
        if (username.length < 3) {
            Alert.alert(t('error'), 'Имя пользователя должно содержать минимум 3 символа');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert(t('error'), 'Введите корректный email');
            return false;
        }
        if (password.length < 6) {
            Alert.alert(t('error'), 'Пароль должен содержать минимум 6 символов');
            return false;
        }
        if (password !== confirmPassword) {
            Alert.alert(t('error'), 'Пароли не совпадают');
            return false;
        }
        return true;
    };

    /**
     * Обработчик регистрации – вызывает API и сохраняет токен
     * Registration handler – calls API and stores token
     */
    const handleRegister = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            const response = await register(username, email, password);
            const { token, user } = response.data;
            // await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
            await AsyncStorage.setItem('token', token);
            // await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, user.username);
            await AsyncStorage.setItem('username', user.username);
            console.log('Registration successful');
            const pushToken = await registerForPushNotificationsAsync();
            if (pushToken) {
                await updateFcmToken(pushToken);
            }
            navigation.replace('RoomSelect');
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert(t('error'), 'Не удалось зарегистрироваться / Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => {
        setLanguage(language === 'ru' ? 'en' : 'ru');
    };

    return (
        <LinearGradient colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']} style={styles.container}>
            <FloatingClouds />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.header}>
                            <Text style={styles.emoji}>🕊️✨</Text>
                            <Text style={styles.title}>Присоединяйтесь / Join</Text>
                            <Text style={styles.subtitle}>Создайте новый аккаунт / Create a new account</Text>
                            <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
                                <Text style={styles.langText}>{language === 'ru' ? '🇬🇧 English' : '🇷🇺 Русский'}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.form}>
                            <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" editable={!loading} />
                            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
                            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />
                            <TextInput style={styles.input} placeholder="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry editable={!loading} />
                            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>→</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
                                <Text style={styles.linkText}>Уже есть аккаунт? Войти / Already have an account? Login</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 40 },
    content: { paddingHorizontal: 24 },
    header: { alignItems: 'center', marginBottom: 32 },
    emoji: { fontSize: 56, marginBottom: 16 },
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

export default RegisterScreen;