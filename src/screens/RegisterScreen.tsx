/**
 * @file RegisterScreen.tsx
 * @description Экран регистрации в едином стиле
 * @description Register screen in unified style
 */

import React, { useState, useRef } from 'react';
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

export default function RegisterScreen({ navigation }: any) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleRegister = async () => {
        if (!username || !email || !password) {
            Alert.alert('Ошибка', 'Заполните все поля');
            return;
        }
        
        if (password.length < 6) {
            Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
            return;
        }
        
        setLoading(true);
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
        
        try {
            // Здесь ваш API запрос
            await AsyncStorage.setItem('token', 'test-token');
            navigation.replace('ChatRoom');
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось зарегистрироваться');
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
            <FloatingClouds />
            
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    <View style={styles.header}>
                        <Text style={styles.emoji}>🕊️✨</Text>
                        <Text style={styles.title}>Присоединяйтесь</Text>
                        <Text style={styles.subtitle}>Создайте новый аккаунт</Text>
                    </View>
                    
                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="Имя пользователя"
                            placeholderTextColor="#95A5A6"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#95A5A6"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Пароль"
                            placeholderTextColor="#95A5A6"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleRegister}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Зарегистрироваться →</Text>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                        
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Login')}
                            style={styles.linkButton}
                        >
                            <Text style={styles.linkText}>
                                Уже есть аккаунт? Войти
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
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