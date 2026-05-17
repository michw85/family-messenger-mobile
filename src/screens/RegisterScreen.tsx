/**
 * @file RegisterScreen.tsx
 * @description Экран регистрации нового пользователя с валидацией (только username и пароль)
 * @description New user registration screen with validation (username and password only)
 * 
 * @author Family Messenger Team
 * @version 2.1.0
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

/**
 * Экран регистрации
 * Registration screen component
 * @param navigation - Навигация React Navigation / React Navigation
 */
const RegisterScreen: React.FC<any> = ({ navigation }) => {
    // Состояния формы / Form states
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    
    // Анимации / Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    // Запуск анимации при монтировании / Start animation on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    /**
     * Валидация формы регистрации
     * Registration form validation
     * @returns true если форма валидна / true if form is valid
     */
    const validateForm = (): boolean => {
        if (!username || !password || !confirmPassword) {
            Alert.alert('Ошибка / Error', 'Заполните все поля / Please fill all fields');
            return false;
        }

        if (username.length < 3) {
            Alert.alert('Ошибка / Error', 'Имя пользователя должно содержать минимум 3 символа / Username must be at least 3 characters');
            return false;
        }

        if (username.length > 20) {
            Alert.alert('Ошибка / Error', 'Имя пользователя не должно превышать 20 символов / Username cannot exceed 20 characters');
            return false;
        }

        if (password.length < 6) {
            Alert.alert('Ошибка / Error', 'Пароль должен содержать минимум 6 символов / Password must be at least 6 characters');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Ошибка / Error', 'Пароли не совпадают / Passwords do not match');
            return false;
        }

        return true;
    };

    /**
     * Обработчик регистрации
     * Registration handler
     */
    const handleRegister = async (): Promise<void> => {
        if (!validateForm()) return;

        setLoading(true);

        try {
            // TODO: Заменить на реальный API запрос / Replace with actual API request
            // const response = await api.register(username, password);
            // await AsyncStorage.setItem('token', response.token);
            // await AsyncStorage.setItem('username', username);
            
            // Временная заглушка / Temporary mock
            await AsyncStorage.setItem('token', 'mock-token');
            await AsyncStorage.setItem('username', username);
            
            navigation.replace('RoomSelect');
        } catch (error) {
            Alert.alert('Ошибка / Error', 'Не удалось зарегистрироваться / Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']}
            style={styles.container}
        >
            {/* Декоративные облака / Decorative clouds */}
            <FloatingClouds />
            
            {/* Обёртка для клавиатуры с прокруткой / Keyboard wrapper with scroll */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View 
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            }
                        ]}
                    >
                        {/* Заголовок / Header */}
                        <View style={styles.header}>
                            <Text style={styles.emoji}>🕊️✨</Text>
                            <Text style={styles.title}>Присоединяйтесь / Join</Text>
                            <Text style={styles.subtitle}>
                                Создайте новый аккаунт / Create a new account
                            </Text>
                        </View>
                        
                        {/* Форма регистрации / Registration form */}
                        <View style={styles.form}>
                            <TextInput
                                style={styles.input}
                                placeholder="Имя пользователя / Username"
                                placeholderTextColor="#95A5A6"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                editable={!loading}
                            />
                            
                            <TextInput
                                style={styles.input}
                                placeholder="Пароль / Password"
                                placeholderTextColor="#95A5A6"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                editable={!loading}
                            />
                            
                            <TextInput
                                style={styles.input}
                                placeholder="Подтвердите пароль / Confirm password"
                                placeholderTextColor="#95A5A6"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                editable={!loading}
                            />
                            
                            {/* Кнопка регистрации / Register button */}
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleRegister}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Зарегистрироваться / Register →</Text>
                                )}
                            </TouchableOpacity>
                            
                            {/* Ссылка на вход / Login link */}
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Login')}
                                style={styles.linkButton}
                                disabled={loading}
                            >
                                <Text style={styles.linkText}>
                                    Уже есть аккаунт? Войти / Already have an account? Login
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

/**
 * Стили экрана регистрации
 * Registration screen styles
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 32,
    },
    content: {
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    emoji: {
        fontSize: 56,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2C3E50',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#8A9AAA',
        textAlign: 'center',
    },
    form: {
        gap: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E8E8E8',
        borderRadius: 30,
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: 'rgba(255,255,255,0.9)',
        fontSize: 16,
        color: '#2C3E50',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    button: {
        backgroundColor: '#6C5CE7',
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        alignItems: 'center',
        marginTop: 16,
    },
    linkText: {
        color: '#6C5CE7',
        fontSize: 14,
    },
});

export default RegisterScreen;