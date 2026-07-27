/**
 * @file OtpVerifyScreen.tsx
 * @description Экран ввода одноразового кода из email (2FA), второй шаг логина
 * @description One-time email code entry screen (2FA), second step of login
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
import { setToken, setRefreshToken } from '../services/authStorage';
import { triggerAuthLoggedIn } from '../utils/authEvents';
import FloatingClouds from '../components/FloatingClouds';
import { useLanguage } from '../context/LanguageContext';
import { verifyLoginOtp, updateFcmToken } from '../services/api';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { colors, spacing, borderRadius, shadows } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OtpVerifyScreen: React.FC<any> = ({ navigation, route }) => {
    const { username } = route.params;
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);

    const handleVerify = async () => {
        if (code.trim().length !== 6) {
            Alert.alert(t('error'), t('enter_otp_code'));
            return;
        }

        setLoading(true);
        try {
            const response = await verifyLoginOtp(username, code.trim());
            const { token, refreshToken, user } = response.data;

            await setToken(token);
            if (refreshToken) {
                await setRefreshToken(refreshToken);
            }
            await AsyncStorage.setItem('username', user.username);
            // Бэкенд (Jackson) отдаёт это поле как "superadmin", а не "isSuperadmin" -
            // стандартная сериализация boolean-геттера isSuperadmin() без префикса "is"
            // The backend (Jackson) serializes this field as "superadmin", not
            // "isSuperadmin" - standard serialization of a boolean isSuperadmin()
            // getter strips the "is" prefix
            await AsyncStorage.setItem('isSuperadmin', String(!!user.superadmin));
            triggerAuthLoggedIn(token);

            navigation.reset({ index: 0, routes: [{ name: 'RoomSelect' }] });

            try {
                const pushToken = await registerForPushNotificationsAsync();
                if (pushToken) await updateFcmToken(pushToken);
            } catch (e) {
                console.warn('FCM skipped:', e);
            }
        } catch (error: any) {
            console.error('OTP verify error:', error);
            if (error?.response?.status === 429) {
                Alert.alert(t('error'), t('too_many_otp_attempts'));
            } else {
                Alert.alert(t('error'), t('invalid_or_expired_code'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={['#FDF8F0', '#F5E6CA', '#E8D5B8']} style={styles.container}>
            <FloatingClouds />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.keyboardView, { paddingTop: insets.top }]}>
                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    <View style={styles.header}>
                        <Text style={styles.emoji}>✉️</Text>
                        <Text style={styles.title}>{t('verification_code_title')}</Text>
                        <Text style={styles.subtitle}>
                            {t('otp_sent_message')}
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="000000"
                            placeholderTextColor={colors.placeholder}
                            value={code}
                            onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                            keyboardType="number-pad"
                            maxLength={6}
                            editable={!loading}
                            autoFocus
                        />

                        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>→</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkButton}>
                            <Text style={styles.linkText}>{t('back')}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1, justifyContent: 'center' },
    content: { paddingHorizontal: spacing.xl },
    header: { alignItems: 'center', marginBottom: spacing.xxxl },
    emoji: { fontSize: 56, marginBottom: spacing.md },
    title: { fontSize: 22, fontWeight: '700', color: colors.primary, textAlign: 'center', marginBottom: spacing.sm },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    form: { gap: spacing.lg },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xlarge,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: 'rgba(255,255,255,0.85)',
        fontSize: 24,
        letterSpacing: 8,
        textAlign: 'center',
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

export default OtpVerifyScreen;
