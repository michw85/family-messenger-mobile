/**
 * @file RenameChatModal.tsx
 * @description Модальное окно для переименования существующего чата
 * @description Modal dialog for renaming an existing chat
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { colors, spacing, borderRadius, shadows } from '../styles/theme';

interface RenameChatModalProps {
    visible: boolean;
    currentName: string;
    onClose: () => void;
    onRename: (name: string) => void;
}

const RenameChatModal: React.FC<RenameChatModalProps> = ({ visible, currentName, onClose, onRename }) => {
    const { t } = useLanguage();
    const [name, setName] = useState(currentName);

    // Модалка переиспользуется для разных чатов - без этого при повторном
    // открытии оставалось бы значение, введённое в предыдущий раз
    // The modal is reused across different chats - without this, reopening it
    // would keep whatever value was typed the previous time
    useEffect(() => {
        if (visible) setName(currentName);
    }, [visible, currentName]);

    const handleSave = (): void => {
        const trimmed = name.trim();
        if (!trimmed) return;
        onRename(trimmed);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>✏️ {t('rename_chat_title')}</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Text style={styles.closeText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={styles.input}
                                placeholder={t('chat_name_placeholder')}
                                placeholderTextColor="#95A5A6"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                                selectTextOnFocus
                            />

                            <TouchableOpacity
                                style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                disabled={!name.trim()}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.saveButtonText}>{t('save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
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
    },
    modalContent: {
        backgroundColor: colors.backgroundLight,
        borderRadius: borderRadius.large,
        padding: spacing.xl,
        ...shadows.large,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    modalTitle: {
        fontSize: 20,
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
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xlarge,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: 'rgba(255,255,255,0.9)',
        fontSize: 16,
        color: colors.text,
        marginBottom: spacing.lg,
        ...shadows.soft,
    },
    saveButton: {
        backgroundColor: colors.primary, borderRadius: borderRadius.xlarge, paddingVertical: spacing.md, alignItems: 'center', ...shadows.medium,
    },
    saveButtonDisabled: {
        backgroundColor: colors.textMuted, opacity: 0.7,
    },
    saveButtonText: {
        color: colors.textLight,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default RenameChatModal;
