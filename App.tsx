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
import { View, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from './src/services/authStorage';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SimpleModeProvider } from './src/context/SimpleModeContext';
import { ActionSheetProvider } from './src/components/ActionSheet';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OtpVerifyScreen from './src/screens/OtpVerifyScreen';
import RoomSelectScreen from './src/screens/RoomSelectScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import { colors } from './src/styles/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setAuthExpiredHandler, triggerAuthLoggedIn } from './src/utils/authEvents';
import { registerForPushNotificationsAsync } from './src/utils/notifications';
import { updateFcmToken } from './src/services/api';
import { navigationRef } from './src/services/navigationRef';
import { CallProvider, useCall } from './src/context/CallContext';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import InCallScreen from './src/screens/InCallScreen';

// Как показывать уведомление, когда приложение открыто на переднем плане
// How to display a notification while the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});


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
    const [navReady, setNavReady] = useState(false);
    const { isCallActive } = useCall();

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                setIsChecking(true);
                const token = await getToken();
                const username = await AsyncStorage.getItem('username');

                console.log('Checking login status - Token exists:', !!token);
                console.log('Checking login status - Username exists:', !!username);

                // Пользователь считается авторизованным, если есть и токен, и имя пользователя
                // User is considered authorized if both token and username exist
                const isLoggedInFlag = !!(token && username);
                setIsLoggedIn(isLoggedInFlag);
                if (isLoggedInFlag && token) {
                    triggerAuthLoggedIn(token);
                    // Иначе уже залогиненные устройства никогда не пересоздадут
                    // Android-канал уведомлений (registerForPushNotificationsAsync
                    // вызывается только на экранах логина/регистрации) - без
                    // холодного перезапроса они бы застряли на старом канале без
                    // вибрации до выхода из аккаунта и повторного входа.
                    // Otherwise already-logged-in devices would never recreate
                    // the Android notification channel (registerForPushNotificationsAsync
                    // is only called from the login/register screens) - without
                    // this cold-start call they'd be stuck on the old,
                    // vibration-less channel until logging out and back in.
                    //
                    // getExpoPushTokenAsync() может вернуть другой токен при
                    // каждом вызове - без ресинка на бэкенд сервер продолжит
                    // слать пуши на устаревший токен, и они молча перестанут
                    // приходить после первого раза.
                    // getExpoPushTokenAsync() can return a different token on
                    // each call - without re-syncing it to the backend, the
                    // server keeps pushing to a stale token and notifications
                    // silently stop arriving after the first one.
                    registerForPushNotificationsAsync()
                        .then((pushToken) => {
                            if (pushToken) return updateFcmToken(pushToken);
                        })
                        .catch((e) => console.warn('Failed to (re-)register push notifications', e));
                }
            } catch (error) {
                console.error('Error checking login status:', error);
                setIsLoggedIn(false);
            } finally {
                setIsChecking(false);
            }
        };

        checkLoginStatus();
    }, []);

    useEffect(() => {
        // Когда refresh-токен истёк/отозван, api.ts очищает AsyncStorage и вызывает
        // triggerAuthExpired() — здесь сбрасываем навигацию на экран логина.
        // When the refresh token has expired/been revoked, api.ts clears AsyncStorage
        // and calls triggerAuthExpired() — here we reset navigation back to Login.
        setAuthExpiredHandler(() => {
            setIsLoggedIn(false);
            if (navigationRef.isReady()) {
                navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
        });
    }, []);

    useEffect(() => {
        // Ждём, пока навигация будет готова и проверка логина завершится,
        // прежде чем пытаться открыть чат из уведомления
        // Wait for navigation to be ready and the login check to finish
        // before trying to open a chat from a notification
        if (!navReady || isChecking) return;

        const openRoomFromNotification = async (data: any) => {
            const roomId = data?.roomId;
            if (!roomId) return;

            const token = await getToken();
            if (!token) return; // не залогинен - открываем как обычно, без глубокой ссылки

            // Входящий звонок открывает экран звонка, а не сам чат - это тот же
            // пуш-механизм, что и обычные сообщения (см. CallController на бэкенде),
            // просто с другим экраном назначения.
            // An incoming call opens the call screen, not the chat itself - same
            // push mechanism as regular messages (see CallController on the
            // backend), just a different destination screen.
            //
            // Тап может прийти сильно позже (уведомление открыли из шторки
            // спустя время) - к этому моменту звонок мог уже истечь по
            // таймауту или быть отменён. isCallActive проверяет реальное
            // состояние CallContext, а не просто данные из пуша - без этого
            // открывался мёртвый экран звонка с нерабочими кнопками. Если
            // звонок уже неактивен, просто открываем чат, как обычное сообщение.
            // The tap can arrive much later (notification opened from the
            // shade after a delay) - by then the call may have already timed
            // out or been cancelled. isCallActive checks CallContext's real
            // state, not just the push payload - without this, a dead call
            // screen with non-functional buttons would open. If the call is
            // no longer active, just open the chat like a regular message.
            if (data?.type === 'incoming_call' && isCallActive(data.callId)) {
                navigationRef.reset({
                    index: 1,
                    routes: [
                        { name: 'RoomSelect' },
                        {
                            name: 'IncomingCall',
                            params: {
                                callId: data.callId,
                                roomId,
                                roomName: data?.roomName || '',
                                callerUsername: data?.callerUsername || '',
                            },
                        },
                    ],
                });
                return;
            }

            navigationRef.reset({
                index: 1,
                routes: [
                    { name: 'RoomSelect' },
                    { name: 'ChatRoom', params: { roomId, roomName: data?.roomName || '' } },
                ],
            });
        };

        // Приложение было закрыто и запущено нажатием на уведомление
        // The app was closed and launched by tapping a notification
        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (response) {
                openRoomFromNotification(response.notification.request.content.data);
            }
        });

        // Приложение уже открыто (на переднем плане или в фоне) - нажатие на уведомление
        // The app is already open (foreground or background) - notification tap
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            openRoomFromNotification(response.notification.request.content.data);
        });

        return () => subscription.remove();
    }, [navReady, isChecking, isCallActive]);

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
        <NavigationContainer ref={navigationRef} onReady={() => setNavReady(true)}>
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

                {/* Экран сброса пароля - всегда должен быть доступен / Password reset screen - should always be available */}
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

                {/* Экран ввода кода из email (2FA) / Email code entry screen (2FA) */}
                <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />

                {/* Экран выбора чата - только для авторизованных / Room select screen - only for authorized */}
                <Stack.Screen name="RoomSelect" component={RoomSelectScreen} />

                {/* Экран чата - только для авторизованных / Chat room screen - only for authorized */}
                <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />

                {/* Экран профиля - только для авторизованных / Profile screen - only for authorized */}
                <Stack.Screen name="Profile" component={ProfileScreen} />

                {/* Звонки - модальными поверх текущего экрана, независимо от того, где находится пользователь */}
                {/* Calls - as modals on top of the current screen, regardless of where the user is */}
                <Stack.Screen
                    name="IncomingCall"
                    component={IncomingCallScreen}
                    options={{ presentation: 'transparentModal', animation: 'fade' }}
                />
                <Stack.Screen
                    name="InCall"
                    component={InCallScreen}
                    options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

/**
 * Иконки статус-бара (сеть, заряд, часы) должны быть тёмными на светлой теме
 * и светлыми на тёмной, иначе они сливаются с фоном и их не видно. На Android
 * заодно перекрашиваем иконки нижней навигационной панели - сам фон панели
 * там не задаём: приложение собрано с edgeToEdgeEnabled=true, а
 * setBackgroundColorAsync под edge-to-edge не поддерживается (только спамит
 * предупреждением в консоль) - на edge-to-edge фон под панелью и так даёт
 * содержимое экрана (наш градиент), панель прозрачна по умолчанию.
 * Status bar icons (signal, battery, clock) need to be dark on the light
 * theme and light on the dark one, otherwise they blend into the background
 * and become unreadable. On Android we also recolor the bottom navigation
 * bar's icons - we don't set the bar's own background there: the app is
 * built with edgeToEdgeEnabled=true, and setBackgroundColorAsync isn't
 * supported under edge-to-edge (it just spams a console warning) - on
 * edge-to-edge the screen's own content (our gradient) already shows through
 * behind the bar, which is transparent by default.
 */
const ThemedStatusBar: React.FC = () => {
    const { theme } = useTheme();

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark').catch(() => {});
    }, [theme]);

    return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />;
};

/**
 * Главный компонент приложения
 * Main app component
 */
export default function App() {
    return (
        // KeyboardProvider нужен react-native-keyboard-controller, чтобы получать
        // высоту клавиатуры через нативные IME-инсеты, а не через устаревший
        // windowSoftInputMode - это единственный надёжный способ на edge-to-edge
        // Android (edgeToEdgeEnabled=true), где adjustResize/adjustPan/adjustNothing
        // ведут себя непредсказуемо.
        // KeyboardProvider is required by react-native-keyboard-controller to get
        // the keyboard height via native IME insets instead of the legacy
        // windowSoftInputMode - the only reliable way on edge-to-edge Android
        // (edgeToEdgeEnabled=true), where adjustResize/adjustPan/adjustNothing
        // behave unpredictably.
        <KeyboardProvider>
            <SafeAreaProvider>
                <ThemeProvider>
                    <ThemedStatusBar />
                    <ActionSheetProvider>
                        <LanguageProvider>
                            <SimpleModeProvider>
                                <CallProvider>
                                    <Initializer>
                                        <Navigation />
                                    </Initializer>
                                </CallProvider>
                            </SimpleModeProvider>
                        </LanguageProvider>
                    </ActionSheetProvider>
                </ThemeProvider>
            </SafeAreaProvider>
        </KeyboardProvider>
    );
}