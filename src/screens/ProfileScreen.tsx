/**
 * @file ProfileScreen.tsx
 * @description Экран профиля пользователя - просмотр и смена аватара
 * @description User profile screen - view and change avatar
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FloatingClouds from '../components/FloatingClouds';
import PendingApprovalsModal from '../components/PendingApprovalsModal';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getCurrentUser, uploadAvatar } from '../services/api';
import { spacing, borderRadius, shadows, AppColors } from '../styles/theme';
import type { User } from '../types';

const ProfileScreen: React.FC<any> = ({ navigation }) => {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const insets = useSafeAreaInsets();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [pendingApprovalsVisible, setPendingApprovalsVisible] = useState(false);

    const loadUser = useCallback(async () => {
        try {
            const res = await getCurrentUser();
            setUser(res.data);
            if (res.data?.avatarUrl) {
                await AsyncStorage.setItem('avatarUrl', res.data.avatarUrl);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const changeAvatar = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('error'), t('no_access'));
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (result.canceled || !result.assets[0]) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: result.assets[0].uri,
                type: 'image/jpeg',
                name: 'avatar.jpg',
            } as any);
            const res = await uploadAvatar(formData);
            setUser(res.data);
            if (res.data?.avatarUrl) {
                await AsyncStorage.setItem('avatarUrl', res.data.avatarUrl);
            }
        } catch (error) {
            console.error('Failed to upload avatar:', error);
            Alert.alert(t('error'), t('avatar_upload_failed'));
        } finally {
            setUploading(false);
        }
    }, [t]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const initial = (user?.username || '?').charAt(0).toUpperCase();

    return (
        <LinearGradient colors={colors.backgroundGradient as [string, string, string]} style={styles.container}>
            <FloatingClouds />
            <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backText}>‹ {t('back')}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.title}>{t('profile')}</Text>

                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={changeAvatar} disabled={uploading} activeOpacity={0.8}>
                        <View style={[styles.avatar, { borderColor: colors.accent }]}>
                            {user?.avatarUrl ? (
                                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                            ) : (
                                <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
                            )}
                            {uploading && (
                                <View style={styles.avatarOverlay}>
                                    <ActivityIndicator size="small" color={colors.textLight} />
                                </View>
                            )}
                        </View>
                        <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.cameraBadgeText}>📷</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={changeAvatar} disabled={uploading}>
                        <Text style={styles.changeAvatarText}>{t('change_avatar')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>{t('username')}</Text>
                    <Text style={styles.infoValue}>{user?.username}</Text>
                </View>
                <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>{t('email')}</Text>
                    <Text style={styles.infoValue}>{user?.email}</Text>
                </View>

                {user?.superadmin && (
                    <TouchableOpacity
                        style={styles.pendingApprovalsButton}
                        onPress={() => setPendingApprovalsVisible(true)}
                    >
                        <Text style={styles.pendingApprovalsButtonText}>👤 {t('pending_approvals_title')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <PendingApprovalsModal
                visible={pendingApprovalsVisible}
                onClose={() => setPendingApprovalsVisible(false)}
            />
        </LinearGradient>
    );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, paddingHorizontal: spacing.xl },
    headerRow: { flexDirection: 'row', marginBottom: spacing.md },
    backButton: { paddingVertical: spacing.xs, paddingRight: spacing.md },
    backText: { fontSize: 15, fontWeight: '500', color: colors.primary },
    title: { fontSize: 28, fontWeight: '700', color: colors.primary, letterSpacing: 0.5, marginBottom: spacing.xxl },
    avatarSection: { alignItems: 'center', marginBottom: spacing.xxl },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.accentLight,
        overflow: 'hidden',
        ...shadows.medium,
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarInitial: { fontSize: 48, fontWeight: '700' },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.backgroundLight,
    },
    cameraBadgeText: { fontSize: 16 },
    changeAvatarText: {
        marginTop: spacing.md,
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
        textDecorationLine: 'underline',
    },
    infoCard: {
        backgroundColor: colors.backgroundLight,
        borderRadius: borderRadius.medium,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.soft,
    },
    infoLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
    infoValue: { fontSize: 16, fontWeight: '600', color: colors.text },
    pendingApprovalsButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.medium,
        backgroundColor: colors.backgroundLight,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        ...shadows.soft,
    },
    pendingApprovalsButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
});

export default ProfileScreen;
