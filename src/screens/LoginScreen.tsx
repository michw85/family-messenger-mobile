/**
 * @file LoginScreen.tsx
 * @description Экран входа с сохранением данных пользователя и вызовом API бэкенда
 * @description Login screen with user data persistence and backend API call
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FloatingClouds from '../components/FloatingClouds';
import { useLanguage, useLanguagePicker, LANGUAGE_META } from '../context/LanguageContext';
import { login } from '../services/api'; // Импорт реального API
import { colors, spacing, borderRadius, shadows, typography } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const insets = useSafeAreaInsets();
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
            Alert.alert(t('error'), t('fill_all_fields'));
            return;
        }

        setLoading(true);
        try {
            // Реальный вызов бэкенда / Actual backend call
            const response = await login(username, password);

            // Пароль верный - бэкенд отправил код подтверждения на email (2FA)
            // Password is correct - backend sent a verification code to email (2FA)
            if (response.data?.otpRequired) {
                navigation.navigate('OtpVerify', { username });
            }
        } catch (error: any) {
            console.error('Login error:', error);
            if (error?.response?.status === 429) {
                Alert.alert(t('error'), t('too_many_login_attempts'));
            } else if (error?.response?.status === 403) {
                // Аккаунт заблокирован или ещё не подтверждён суперадмином - сервер
                // уже даёт конкретное сообщение, показываем его, а не общее "неверный пароль"
                // Account is blocked or not yet approved by a superadmin - the server
                // already gives a specific message, show it instead of a generic
                // "wrong password"
                Alert.alert(t('error'), error.response.data || t('invalid_credentials'));
            } else {
                Alert.alert(t('error'), t('invalid_credentials'));
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Переключение языка приложения
     * Toggle application language
     */
    const openLanguagePicker = useLanguagePicker();

    return (
        /**
         * Тёплый градиент вместо холодного
         * Warm gradient instead of cold
         */
        <LinearGradient
            colors={['#FDF8F0', '#F5E6CA', '#E8D5B8']}
            style={styles.container}
        >
            <FloatingClouds />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.keyboardView, { paddingTop: insets.top }]}
            >
                <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.header}>
                        <Text style={styles.emoji}>⚡</Text>
                        <Text style={styles.title}>Bonds</Text>
                        <Text style={styles.subtitle}>
                            {t('login_tagline')}
                        </Text>
                        <TouchableOpacity onPress={openLanguagePicker} style={styles.langButton}>
                            <Text style={styles.langText}>{LANGUAGE_META[language].flag} {language.toUpperCase()}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder={t('username_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            editable={!loading}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder={t('password_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            editable={!loading}
                        />

                        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>→</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.linkButton}>
                            <Text style={styles.linkText}>{t('forgot_password_link')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
                            <Text style={styles.linkText}>{t('create_account_link')}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

/**
 * Стили с использованием новой темы
 * Styles using new theme
 */
const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
    header: { alignItems: 'center', marginBottom: spacing.xxxl },
    emoji: { fontSize: 64, marginBottom: spacing.md },
    title: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 1.5,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    langButton: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: borderRadius.medium,
        ...shadows.soft,
    },
    langText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.primary,
        letterSpacing: 0.5,
    },
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
    buttonText: {
        color: colors.textLight,
        fontSize: 24,
        fontWeight: '600',
    },
    linkButton: {
        alignItems: 'center',
        marginTop: spacing.md,
    },
    linkText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
});

export default LoginScreen;