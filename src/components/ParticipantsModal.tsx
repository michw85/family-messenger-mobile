/**
 * @file ParticipantsModal.tsx
 * @description Модальное окно со списком текущих участников чата
 * @description Modal showing the chat's current participants
 *
 * @author Bonds Team
 * @version 1.0.0
 * @license MIT
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
import { getParticipants, removeParticipant } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows, AppColors } from '../styles/theme';

interface Participant {
    id: number;
    username: string;
    email: string;
    avatarUrl?: string;
    status?: 'ONLINE' | 'OFFLINE';
}

interface ParticipantsModalProps {
    visible: boolean;
    onClose: () => void;
    chatId: string;
    /** Имя текущего пользователя - чтобы не показывать кнопку удаления для себя /
     * Current user's username - so the remove button isn't shown for yourself */
    currentUsername: string;
    /** Нажатие на "Добавить участников" - родитель откроет AddParticipantsModal /
     * Tapping "Add participants" - the parent opens AddParticipantsModal */
    onAddPress: () => void;
}

/**
 * Список участников группового чата с возможностью удалить (если это
 * разрешит бэкенд - создатель может удалить любого, участник только себя)
 * Group chat participants list with the ability to remove someone (allowed
 * by the backend - the creator can remove anyone, a participant only themself)
 */
const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
    visible,
    onClose,
    chatId,
    currentUsername,
    onAddPress,
}) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);

    const loadParticipants = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getParticipants(chatId);
            setParticipants(response.data);
        } catch (error) {
            console.error('Failed to load participants:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить участников / Could not load participants');
        } finally {
            setLoading(false);
        }
    }, [chatId]);

    useEffect(() => {
        if (visible) loadParticipants();
    }, [visible, loadParticipants]);

    const handleRemove = (participant: Participant) => {
        Alert.alert(
            'Удалить участника? / Remove participant?',
            `Убрать ${participant.username} из чата? / Remove ${participant.username} from this chat?`,
            [
                { text: 'Отмена / Cancel', style: 'cancel' },
                {
                    text: 'Удалить / Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setRemovingId(participant.id);
                        try {
                            await removeParticipant(chatId, participant.id);
                            setParticipants(prev => prev.filter(p => p.id !== participant.id));
                        } catch (error: any) {
                            const data = error?.response?.data;
                            const message = typeof data === 'string' ? data : null;
                            Alert.alert('Ошибка', message || 'Не удалось удалить участника / Could not remove participant');
                        } finally {
                            setRemovingId(null);
                        }
                    },
                },
            ]
        );
    };

    const renderParticipant = ({ item }: { item: Participant }) => {
        const isMe = item.username === currentUsername;
        const isOnline = item.status === 'ONLINE';
        return (
            <View style={styles.row}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
                    <View style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.username}>{item.username}{isMe ? ' (вы / you)' : ''}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                </View>
                {!isMe && (
                    <TouchableOpacity
                        onPress={() => handleRemove(item)}
                        style={styles.removeButton}
                        disabled={removingId === item.id}
                    >
                        {removingId === item.id ? (
                            <ActivityIndicator size="small" color={colors.textMuted} />
                        ) : (
                            <Text style={styles.removeText}>✕</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Участники чата / Participants</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={participants}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderParticipant}
                            style={styles.list}
                        />
                    )}

                    <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
                        <Text style={styles.addButtonText}>+ Добавить участников / Add participants</Text>
                    </TouchableOpacity>
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
        paddingVertical: 20,
        alignItems: 'center',
    },
    list: {
        maxHeight: 340,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        borderRadius: borderRadius.medium,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: colors.backgroundLight,
    },
    statusOnline: {
        backgroundColor: colors.online,
    },
    statusOffline: {
        backgroundColor: colors.offline,
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
    removeButton: {
        padding: spacing.sm,
    },
    removeText: {
        fontSize: 16,
        color: '#d32f2f',
    },
    addButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xlarge,
        backgroundColor: colors.primary,
        alignItems: 'center',
        ...shadows.medium,
    },
    addButtonText: {
        color: colors.textLight,
        fontSize: 15,
        fontWeight: '600',
    },
});

export default ParticipantsModal;
