/**
 * @file LoginScreen.tsx
 * @description Экран входа в приложение с валидацией
 * @description Login screen with validation
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingClouds from '../components/FloatingClouds';

/**
 * Экран входа в приложение
 * Login screen component
 * @param navigation - Навигация React Navigation / React Navigation
 */
const LoginScreen: React.FC<any> = ({ navigation }) => {
    // Состояния формы / Form states
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    
    // Анимации / Animations
    const scaleAnim = useRef(new Animated.Value(1)).current;
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
     * Обработчик входа в систему
     * Login handler
     */
    const handleLogin = async (): Promise<void> => {
        // Валидация полей / Field validation
        if (!username || !password) {
            Alert.alert('Ошибка / Error', 'Заполните все поля / Please fill all fields');
            return;
        }

        setLoading(true);
        
        // Анимация нажатия кнопки / Button press animation
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();

        try {
            // TODO: Заменить на реальный API запрос / Replace with actual API request
            // const response = await api.login(username, password);
            // await AsyncStorage.setItem('token', response.token);
            // await AsyncStorage.setItem('username', username);
            
            // Временная заглушка / Temporary mock
            await AsyncStorage.setItem('token', 'mock-token');
            await AsyncStorage.setItem('username', username);
            
            navigation.replace('RoomSelect');
        } catch (error) {
            Alert.alert('Ошибка / Error', 'Не удалось войти / Login failed');
        } finally {
            setLoading(false);
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
            }).start();
        }
    };

    return (
        <LinearGradient
            colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']}
            style={styles.container}
        >
            {/* Декоративные облака / Decorative clouds */}
            <FloatingClouds />
            
            {/* Обёртка для клавиатуры / Keyboard wrapper */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
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
                        <Text style={styles.emoji}>💭✨</Text>
                        <Text style={styles.title}>Family Messenger</Text>
                        <Text style={styles.subtitle}>
                            Семейные мысли парят в воздухе / Family thoughts float in the air
                        </Text>
                    </View>
                    
                    {/* Форма входа / Login form */}
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
                        
                        {/* Кнопка входа с анимацией / Login button with animation */}
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Войти / Login →</Text>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                        
                        {/* Ссылка на регистрацию / Register link */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Register')}
                            style={styles.linkButton}
                            disabled={loading}
                        >
                            <Text style={styles.linkText}>
                                Нет аккаунта? Зарегистрироваться / No account? Register
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    emoji: {
        fontSize: 64,
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

export default LoginScreen;