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
    Image,
} from 'react-native';
import {
    getParticipants, removeParticipant,
    promoteGroupAdmin, demoteGroupAdmin, promoteEditor, demoteEditor, blacklistUser,
} from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useActionSheet } from './ActionSheet';
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
    /** ID создателя чата - см. задачу #61 (роли) / Chat creator's ID - see task #61 (roles) */
    createdBy?: number;
    /** Тип чата - роли админа/редактора группы имеют смысл только в GROUP /
     * Chat type - group admin/editor roles only make sense for GROUP */
    chatType?: string;
    /** ID участников-админов группы / IDs of the group's admin participants */
    groupAdminUserIds?: number[];
    /** ID участников-редакторов группы / IDs of the group's editor participants */
    editorUserIds?: number[];
    /** Суперадмин ли текущий (просматривающий) пользователь / Whether the current (viewing) user is a superadmin */
    isSuperadmin?: boolean;
    /** Вызывается после назначения/снятия роли - родитель должен обновить свои
     * createdBy/groupAdminUserIds/editorUserIds (badges тут иначе не обновятся) /
     * Called after promoting/demoting a role - the parent should refresh its
     * createdBy/groupAdminUserIds/editorUserIds (badges won't otherwise update) */
    onRolesChanged?: () => void;
    /** Нажатие на "Добавить участников" - родитель откроет AddParticipantsModal /
     * Tapping "Add participants" - the parent opens AddParticipantsModal */
    onAddPress: () => void;
}

/**
 * Список участников группового чата с ролями (задача #61): создатель/админ
 * группы могут назначать админов и редакторов и кикать кого угодно; редактор
 * может только кикать; суперадмин может всё это в любом чате. Обычный
 * участник видит только себя без действий (или может выйти сам - см.
 * handleChatLongPress в RoomSelectScreen).
 * Group chat participants list with roles (task #61): the creator/a group
 * admin can promote admins/editors and kick anyone; an editor can only kick;
 * a superadmin can do all of this in any chat. A regular participant sees
 * no actions on themself (self-removal happens via handleChatLongPress in
 * RoomSelectScreen instead).
 */
const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
    visible,
    onClose,
    chatId,
    currentUsername,
    createdBy,
    chatType,
    groupAdminUserIds = [],
    editorUserIds = [],
    isSuperadmin = false,
    onRolesChanged,
    onAddPress,
}) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const showActionSheet = useActionSheet();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    const loadParticipants = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getParticipants(chatId);
            setParticipants(response.data);
        } catch (error) {
            console.error('Failed to load participants:', error);
            Alert.alert(t('error'), t('could_not_load_participants'));
        } finally {
            setLoading(false);
        }
    }, [chatId]);

    useEffect(() => {
        if (visible) loadParticipants();
    }, [visible, loadParticipants]);

    const myId = participants.find((p) => p.username === currentUsername)?.id;
    const iAmCreator = myId !== undefined && myId === createdBy;
    const iAmGroupAdmin = myId !== undefined && groupAdminUserIds.includes(myId);
    const iAmEditor = myId !== undefined && editorUserIds.includes(myId);
    // Роли админа/редактора группы имеют смысл только в групповых чатах -
    // в личном (DIRECT) чате "назначить админом группы" бессмысленно и
    // сбивает с толку (нет самой группы, которой можно администрировать)
    // Group admin/editor roles only make sense in group chats - "make group
    // admin" in a personal (DIRECT) chat is meaningless and confusing (there
    // is no group to administer)
    const isGroupChat = chatType === 'GROUP';
    const canManageAdmins = isGroupChat && (iAmCreator || isSuperadmin);
    const canManageEditors = isGroupChat && (iAmCreator || iAmGroupAdmin || isSuperadmin);
    const canKick = iAmCreator || iAmGroupAdmin || iAmEditor || isSuperadmin;

    const handleRemove = (participant: Participant) => {
        Alert.alert(
            t('remove_participant_confirm'),
            t('remove_participant_message').replace('{name}', participant.username),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('remove'),
                    style: 'destructive',
                    onPress: async () => {
                        setBusyId(participant.id);
                        try {
                            await removeParticipant(chatId, participant.id);
                            setParticipants(prev => prev.filter(p => p.id !== participant.id));
                        } catch (error: any) {
                            const data = error?.response?.data;
                            const message = typeof data === 'string' ? data : null;
                            Alert.alert(t('error'), message || t('could_not_remove_participant'));
                        } finally {
                            setBusyId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleBlacklist = (participant: Participant) => {
        Alert.alert(
            t('blacklist_confirm_title'),
            t('blacklist_confirm_message').replace('{name}', participant.username),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('blacklist_action'),
                    style: 'destructive',
                    onPress: async () => {
                        setBusyId(participant.id);
                        try {
                            await blacklistUser(participant.id);
                            Alert.alert(t('blacklist_done'));
                        } catch (error) {
                            console.error('Failed to blacklist user:', error);
                            Alert.alert(t('error'), t('could_not_blacklist'));
                        } finally {
                            setBusyId(null);
                        }
                    },
                },
            ]
        );
    };

    const runRoleChange = async (participantId: number, action: () => Promise<any>) => {
        setBusyId(participantId);
        try {
            await action();
            onRolesChanged?.();
        } catch (error) {
            console.error('Failed to change role:', error);
            Alert.alert(t('error'), t('could_not_change_role'));
        } finally {
            setBusyId(null);
        }
    };

    const openActionsFor = (participant: Participant) => {
        const isAdminRow = groupAdminUserIds.includes(participant.id);
        const isEditorRow = editorUserIds.includes(participant.id);
        const options: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [];

        if (canManageAdmins) {
            options.push(isAdminRow
                ? { text: t('demote_admin'), onPress: () => runRoleChange(participant.id, () => demoteGroupAdmin(chatId, participant.id)) }
                : { text: t('promote_admin'), onPress: () => runRoleChange(participant.id, () => promoteGroupAdmin(chatId, participant.id)) });
        }
        if (canManageEditors) {
            options.push(isEditorRow
                ? { text: t('demote_editor'), onPress: () => runRoleChange(participant.id, () => demoteEditor(chatId, participant.id)) }
                : { text: t('promote_editor'), onPress: () => runRoleChange(participant.id, () => promoteEditor(chatId, participant.id)) });
        }
        if (canKick) {
            options.push({ text: t('remove'), style: 'destructive', onPress: () => handleRemove(participant) });
        }
        if (isSuperadmin) {
            options.push({ text: t('blacklist_action'), style: 'destructive', onPress: () => handleBlacklist(participant) });
        }
        if (options.length === 0) return;
        options.push({ text: t('cancel'), style: 'cancel' });
        showActionSheet(participant.username, options);
    };

    const renderParticipant = ({ item }: { item: Participant }) => {
        const isMe = item.username === currentUsername;
        const isOnline = item.status === 'ONLINE';
        const isCreatorRow = item.id === createdBy;
        const isAdminRow = groupAdminUserIds.includes(item.id);
        const isEditorRow = editorUserIds.includes(item.id);
        const canActOnThisRow = !isMe && (canManageAdmins || canManageEditors || canKick || isSuperadmin);
        return (
            <View style={styles.row}>
                <View style={styles.avatar}>
                    {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
                    )}
                    <View style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.username}>
                        {item.username}{isMe ? ` ${t('you_suffix')}` : ''}
                        {isCreatorRow ? ' 👑' : isAdminRow ? ' 🛡️' : isEditorRow ? ' ✏️' : ''}
                    </Text>
                    <Text style={styles.email}>{item.email}</Text>
                </View>
                {canActOnThisRow && (
                    <TouchableOpacity
                        onPress={() => openActionsFor(item)}
                        style={styles.removeButton}
                        disabled={busyId === item.id}
                    >
                        {busyId === item.id ? (
                            <ActivityIndicator size="small" color={colors.textMuted} />
                        ) : (
                            <Text style={styles.removeText}>⋯</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                {/* Отступ снизу под системную панель жестов Android (задача #85) /
                    Bottom padding for Android's gesture nav bar (task #85) */}
                <View style={[styles.modalContent, { paddingBottom: spacing.xl + insets.bottom }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('participants_title')}</Text>
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
                        <Text style={styles.addButtonText}>+ {t('add_participants_button')}</Text>
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
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
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
        fontSize: 18,
        color: colors.textMuted,
        fontWeight: '700',
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
