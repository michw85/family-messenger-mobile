/**
 * @file RegisterScreen.tsx
 * @description Экран регистрации нового пользователя с валидацией
 * @description New user registration screen with validation
 * 
 * @author Family Messenger Team
 * @version 2.2.0
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

/**
 * Ключи для хранения данных в AsyncStorage
 * Storage keys for AsyncStorage
 */
const STORAGE_KEYS = {
  TOKEN: '@family_messenger_token',
  USERNAME: '@family_messenger_username',
};

/**
 * Экран регистрации
 * Registration screen component
 * @param navigation - Навигация React Navigation / React Navigation
 */
const RegisterScreen: React.FC<any> = ({ navigation }) => {
  // Хук для переводов / Translation hook
  const { t, language, setLanguage } = useLanguage();

  // Состояния формы / Form states
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Анимации / Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  /**
   * Эффект при монтировании компонента - запускает анимацию появления
   * Effect on component mount - starts appearance animation
   */
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
    // Проверка заполнения всех полей / Check all fields are filled
    if (!username || !password || !confirmPassword) {
      Alert.alert(
        t('error'),
        'Заполните все поля / Please fill all fields'
      );
      return false;
    }

    // Проверка длины имени пользователя / Username length validation
    if (username.length < 3) {
      Alert.alert(
        t('error'),
        'Имя пользователя должно содержать минимум 3 символа / Username must be at least 3 characters'
      );
      return false;
    }

    // Проверка длины пароля / Password length validation
    if (password.length < 6) {
      Alert.alert(
        t('error'),
        'Пароль должен содержать минимум 6 символов / Password must be at least 6 characters'
      );
      return false;
    }

    // Проверка совпадения паролей / Password match validation
    if (password !== confirmPassword) {
      Alert.alert(
        t('error'),
        'Пароли не совпадают / Passwords do not match'
      );
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
      // Сохраняем токен и имя пользователя / Save token and username
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, 'mock-token-' + Date.now());
      await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, username);

      console.log('Registration successful - Token saved, Username saved:', username);

      navigation.replace('RoomSelect');
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(t('error'), 'Не удалось зарегистрироваться / Registration failed');
    } finally {
      setLoading(false);
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
    <LinearGradient
      colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']}
      style={styles.container}
    >
      {/* Декоративные парящие облака / Decorative floating clouds */}
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
              <Text style={styles.title}>
                Присоединяйтесь / Join
              </Text>
              <Text style={styles.subtitle}>
                Создайте новый аккаунт / Create a new account
              </Text>

              {/* Кнопка переключения языка / Language toggle button */}
              <TouchableOpacity
                onPress={toggleLanguage}
                style={styles.langButton}
              >
                <Text style={styles.langText}>
                  {language === 'ru' ? '🇬🇧 English' : '🇷🇺 Русский'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Форма регистрации / Registration form */}
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

              <TextInput
                style={styles.input}
                placeholder="Confirm password"
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
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>→</Text>
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
    paddingVertical: 40,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  langButton: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
  },
  langText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C5CE7',
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
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 24,
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