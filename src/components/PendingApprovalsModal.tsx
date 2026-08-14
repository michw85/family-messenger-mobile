/**
 * @file PendingApprovalsModal.tsx
 * @description Список регистраций, ожидающих подтверждения суперадмином -
 * новые аккаунты не могут войти, пока их явно не одобрят (см. задачу про
 * защиту сервера от случайных установок с закрытого трека Google Play).
 * @description List of registrations awaiting superadmin approval - new
 * accounts can't log in until explicitly approved (see the task about
 * protecting the server from random installs off Google Play's closed track).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPendingApprovalUsers, approveUser, rejectUser } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { spacing, borderRadius, shadows, AppColors } from '../styles/theme';

interface PendingUser {
    id: number;
    username: string;
    email: string;
    createdAt?: string;
}

interface PendingApprovalsModalProps {
    visible: boolean;
    onClose: () => void;
}

const PendingApprovalsModal: React.FC<PendingApprovalsModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [pending, setPending] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    const loadPending = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getPendingApprovalUsers();
            setPending(response.data);
        } catch (error) {
            console.error('Failed to load pending approvals:', error);
            Alert.alert(t('error'), t('could_not_load_pending_approvals'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (visible) loadPending();
    }, [visible, loadPending]);

    const handleApprove = async (user: PendingUser) => {
        setBusyId(user.id);
        try {
            await approveUser(user.id);
            setPending(prev => prev.filter(u => u.id !== user.id));
        } catch (error) {
            console.error('Failed to approve user:', error);
            Alert.alert(t('error'), t('could_not_approve_user'));
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = (user: PendingUser) => {
        Alert.alert(
            t('reject_confirm_title'),
            t('reject_confirm_message').replace('{name}', user.username),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('reject_action'),
                    style: 'destructive',
                    onPress: async () => {
                        setBusyId(user.id);
                        try {
                            await rejectUser(user.id);
                            setPending(prev => prev.filter(u => u.id !== user.id));
                        } catch (error) {
                            console.error('Failed to reject user:', error);
                            Alert.alert(t('error'), t('could_not_reject_user'));
                        } finally {
                            setBusyId(null);
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: PendingUser }) => (
        <View style={styles.row}>
            <View style={styles.info}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.email}>{item.email}</Text>
            </View>
            {busyId === item.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
            ) : (
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => handleApprove(item)} style={[styles.actionButton, styles.approveButton]}>
                        <Text style={styles.approveButtonText}>{t('approve_action')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleReject(item)} style={[styles.actionButton, styles.rejectButton]}>
                        <Text style={styles.rejectButtonText}>{t('reject_action')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                {/* Отступ снизу под системную панель жестов Android (задача #85) /
                    Bottom padding for Android's gesture nav bar (task #85) */}
                <View style={[styles.modalContent, { paddingBottom: spacing.xl + insets.bottom }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('pending_approvals_title')}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : pending.length === 0 ? (
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>{t('no_pending_approvals')}</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={pending}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderItem}
                            style={styles.list}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.backgroundLight,
        borderTopLeftRadius: borderRadius.large,
        borderTopRightRadius: borderRadius.large,
        padding: spacing.xl,
        maxHeight: '80%',
        ...shadows.large,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    closeButton: {
        padding: spacing.sm,
        borderRadius: borderRadius.circle,
        backgroundColor: colors.subtleOverlay,
    },
    closeText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    center: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    list: {
        maxHeight: 400,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        borderRadius: borderRadius.medium,
    },
    info: {
        flex: 1,
    },
    username: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
    },
    email: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    actionButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.medium,
    },
    approveButton: {
        backgroundColor: colors.primary,
    },
    approveButtonText: {
        color: colors.textLight,
        fontSize: 13,
        fontWeight: '600',
    },
    rejectButton: {
        backgroundColor: colors.subtleOverlay,
    },
    rejectButtonText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
});

export default PendingApprovalsModal;
