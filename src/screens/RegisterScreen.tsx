/**
 * @file RegisterScreen.tsx
 * @description Экран регистрации нового пользователя с вызовом API бэкенда
 * @description New user registration screen with backend API call
 * 
 * @author Bonds Team
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
import { isPasswordStrong, PASSWORD_RULES_MESSAGE } from '../utils/password';
import { colors, spacing, borderRadius, shadows } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const insets = useSafeAreaInsets();
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
        if (!isPasswordStrong(password)) {
            Alert.alert(t('error'), PASSWORD_RULES_MESSAGE);
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
            const { token, refreshToken, user } = response.data;
            // await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
            await AsyncStorage.setItem('token', token);
            if (refreshToken) {
                await AsyncStorage.setItem('refreshToken', refreshToken);
            }
            // await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, user.username);
            await AsyncStorage.setItem('username', user.username);
            console.log('Registration successful');
            /* try {
                 const pushToken = await registerForPushNotificationsAsync();
                 if (pushToken) {
                     await updateFcmToken(pushToken);
                 }
             } catch (e) {
                 console.warn('FCM token registration skipped:', e);
             }*/
            navigation.replace('RoomSelect');
        } catch (error: any) {
            console.error('Registration error:', error);
            const serverMessage = typeof error?.response?.data === 'string' ? error.response.data : null;
            Alert.alert(t('error'), serverMessage || 'Не удалось зарегистрироваться / Registration failed');
        } finally {
            setLoading(false);
        }

        try {
            const pushToken = await registerForPushNotificationsAsync();
            if (pushToken) await updateFcmToken(pushToken);
        } catch (e) {
            console.warn('FCM skipped:', e);
        }
    };

    const toggleLanguage = () => {
        setLanguage(language === 'ru' ? 'en' : 'ru');
    };

    return (
        <LinearGradient
            colors={['#FDF8F0', '#F5E6CA', '#E8D5B8']}
            style={styles.container}
        >
            <FloatingClouds />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.keyboardView, { paddingTop: insets.top }]}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.header}>
                            <Text style={styles.emoji}>🕊️</Text>
                            <Text style={styles.title}>Присоединяйтесь / Join</Text>
                            <Text style={styles.subtitle}>Создайте новый аккаунт / Create a new account</Text>
                            <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
                                <Text style={styles.langText}>{language === 'ru' ? '🇬🇧 EN' : '🇷🇺 RU'}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.form}>
                            <TextInput style={styles.input} placeholder="Username" placeholderTextColor={colors.placeholder} value={username} onChangeText={setUsername} autoCapitalize="none" editable={!loading} />
                            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.placeholder} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
                            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.placeholder} value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />
                            <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor={colors.placeholder} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry editable={!loading} />
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
    content: { paddingHorizontal: spacing.xl },
    header: { alignItems: 'center', marginBottom: spacing.xxxl },
    emoji: { fontSize: 56, marginBottom: spacing.md },
    title: { fontSize: 28, fontWeight: '700', color: colors.primary, letterSpacing: 0.5, marginBottom: spacing.sm },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    langButton: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: borderRadius.medium,
        ...shadows.soft,
    },
    langText: { fontSize: 12, fontWeight: '500', color: colors.primary, letterSpacing: 0.5 },
    form: { gap: spacing.lg },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xlarge,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: 'rgba(255,255,255,0.85)',
        fontSize: 16,
        color: colors.text,
        ...shadows.soft,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.xlarge,
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginTop: spacing.sm,
        ...shadows.medium,
    },
    buttonText: { color: colors.textLight, fontSize: 24, fontWeight: '600' },
    linkButton: { alignItems: 'center', marginTop: spacing.md },
    linkText: { color: colors.primary, fontSize: 14, fontWeight: '500', letterSpacing: 0.3 },
});

export default RegisterScreen;