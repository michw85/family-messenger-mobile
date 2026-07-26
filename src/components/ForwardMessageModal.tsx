/**
 * @file ForwardMessageModal.tsx
 * @description Модальное окно выбора чата для пересылки сообщения
 * @description Modal dialog for picking a chat to forward a message to
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { colors, spacing, borderRadius, shadows } from '../styles/theme';
import { fetchChats } from '../services/api';
import { isNotebookChat } from '../utils/notebook';

interface ForwardChatOption {
    id: string;
    name: string;
    type: string;
    participants: Array<unknown>;
}

interface ForwardMessageModalProps {
    visible: boolean;
    /** Текущий чат исключается из списка - пересылать уже отправленное сюда некуда /
     * The current chat is excluded from the list - nowhere to forward what's already here */
    excludeChatId: string;
    onClose: () => void;
    onForward: (chatId: string) => void;
}

const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({ visible, excludeChatId, onClose, onForward }) => {
    const { t } = useLanguage();
    const [chats, setChats] = useState<ForwardChatOption[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setLoading(true);
        fetchChats()
            .then((response) => {
                setChats((response.data as ForwardChatOption[]).filter((c) => c.id !== excludeChatId));
            })
            .catch((error) => console.error('Failed to load chats for forwarding:', error))
            .finally(() => setLoading(false));
    }, [visible, excludeChatId]);

    const handlePick = (chatId: string) => {
        onForward(chatId);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>↪️ {t('forward_to_title')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.xl }} />
                        ) : (
                            <FlatList
                                data={chats}
                                keyExtractor={(item) => item.id}
                                style={styles.list}
                                ListEmptyComponent={<Text style={styles.emptyText}>{t('no_other_chats')}</Text>}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.chatRow} onPress={() => handlePick(item.id)}>
                                        <Text style={styles.chatRowText} numberOfLines={1}>
                                            {isNotebookChat(item) ? t('notebook_chat_name') : item.name}
                                        </Text>
                                        <Text style={styles.arrow}>›</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400,
        maxHeight: '70%',
    },
    modalContent: {
        backgroundColor: colors.backgroundLight,
        borderRadius: borderRadius.large,
        padding: spacing.xl,
        ...shadows.large,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F0F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        fontSize: 18,
        color: colors.textSecondary,
    },
    list: { flexGrow: 0 },
    chatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    chatRowText: { fontSize: 16, color: colors.text, flex: 1 },
    arrow: { fontSize: 20, color: colors.accent },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});

export default ForwardMessageModal;
