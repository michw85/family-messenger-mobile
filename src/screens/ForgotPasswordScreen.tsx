/**
 * @file ForgotPasswordScreen.tsx
 * @description Экран сброса пароля: шаг 1 - email, шаг 2 - код из письма + новый пароль
 * @description Password reset screen: step 1 - email, step 2 - emailed code + new password
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FloatingClouds from '../components/FloatingClouds';
import { useLanguage } from '../context/LanguageContext';
import { forgotPassword, resetPassword } from '../services/api';
import { colors, spacing, borderRadius, shadows } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ForgotPasswordScreen: React.FC<any> = ({ navigation }) => {
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();

    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendCode = async () => {
        if (!email) {
            Alert.alert(t('error'), t('enter_email'));
            return;
        }
        setLoading(true);
        try {
            await forgotPassword(email);
            setStep('reset');
            Alert.alert('', t('reset_code_sent_message'));
        } catch (error) {
            console.error('Forgot password error:', error);
            Alert.alert(t('error'), t('could_not_send_code'));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!code || !newPassword) {
            Alert.alert(t('error'), t('fill_all_fields'));
            return;
        }
        setLoading(true);
        try {
            await resetPassword(email, code, newPassword);
            Alert.alert(
                '',
                t('password_reset_success'),
                [{ text: t('ok'), onPress: () => navigation.replace('Login') }]
            );
        } catch (error: any) {
            const data = error?.response?.data;
            const message = typeof data === 'string' ? data : null;
            Alert.alert(t('error'), message || t('invalid_or_expired_code'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={['#FDF8F0', '#F5E6CA', '#E8D5B8']} style={styles.container}>
            <FloatingClouds />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.keyboardView, { paddingTop: insets.top }]}
            >
                <View style={styles.content}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backText}>‹ {t('back')}</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>
                        {step === 'email' ? t('forgot_password_title') : t('new_password_placeholder')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 'email'
                            ? t('enter_email_registered')
                            : t('enter_code_and_new_password')}
                    </Text>

                    {step === 'email' ? (
                        <View style={styles.form}>
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                            />
                            <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
                                {loading ? (
                                    <ActivityIndicator color={colors.textLight} />
                                ) : (
                                    <Text style={styles.buttonText}>{t('send_code_button')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('code_from_email_placeholder')}
                                placeholderTextColor={colors.textMuted}
                                value={code}
                                onChangeText={setCode}
                                keyboardType="number-pad"
                                editable={!loading}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder={t('new_password_placeholder')}
                                placeholderTextColor={colors.textMuted}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                editable={!loading}
                            />
                            <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
                                {loading ? (
                                    <ActivityIndicator color={colors.textLight} />
                                ) : (
                                    <Text style={styles.buttonText}>{t('save_password_button')}</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setStep('email')} style={styles.linkButton}>
                                <Text style={styles.linkText}>{t('resend_code_link')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
    backButton: { position: 'absolute', top: spacing.xl, left: spacing.xl },
    backText: { fontSize: 15, fontWeight: '500', color: colors.primary },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xxl,
        paddingHorizontal: spacing.md,
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
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
        ...shadows.medium,
    },
    buttonText: {
        color: colors.textLight,
        fontSize: 15,
        fontWeight: '600',
    },
    linkButton: {
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    linkText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
});

export default ForgotPasswordScreen;
