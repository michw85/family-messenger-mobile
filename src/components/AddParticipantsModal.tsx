/**
 * @file AddParticipantsModal.tsx
 * @description Модальное окно для добавления участников в чат
 * @description Modal for adding participants to chat
 * 
 * @author Bonds Team
 * @version 1.0.0
 * @license MIT
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { searchUsers, addParticipants } from '../services/api';
import { colors, spacing, borderRadius, shadows } from '../styles/theme';

/**
 * Интерфейс пользователя
 * User interface
 */
interface User {
    id: number;
    username: string;
    email: string;
    avatarUrl?: string;
}

/**
 * Интерфейс пропсов
 * Props interface
 */
interface AddParticipantsModalProps {
    visible: boolean;
    onClose: () => void;
    chatId: string;
    onParticipantsAdded: () => void;
}

/**
 * Модальное окно добавления участников
 * Add participants modal
 */
const AddParticipantsModal: React.FC<AddParticipantsModalProps> = ({
    visible,
    onClose,
    chatId,
    onParticipantsAdded,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    /**
     * Поиск пользователей
     * Search users
     */
    const searchUsersHandler = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setUsers([]);
            return;
        }

        setSearching(true);
        try {
            const response = await searchUsers(query);
            // Исключаем уже добавленных / Exclude already added
            setUsers(response.data);
        } catch (error) {
            console.error('Search users error:', error);
        } finally {
            setSearching(false);
        }
    };

    /**
     * Выбор/отмена выбора пользователя
     * Toggle user selection
     */
    const toggleUser = (user: User) => {
        const exists = selectedUsers.find(u => u.id === user.id);
        if (exists) {
            setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    /**
     * Добавление выбранных пользователей
     * Add selected users
     */
    const handleAdd = async () => {
        if (selectedUsers.length === 0) {
            Alert.alert('Ошибка', 'Выберите хотя бы одного пользователя');
            return;
        }

        setLoading(true);
        try {
            const userIds = selectedUsers.map(u => u.id);
            await addParticipants(chatId, userIds);
            onParticipantsAdded();
            onClose();
            setSelectedUsers([]);
            setSearchQuery('');
            setUsers([]);
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось добавить участников');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Рендер элемента пользователя
     * Render user item
     */
    const renderUser = ({ item }: { item: User }) => {
        const isSelected = selectedUsers.some(u => u.id === item.id);
        return (
            <TouchableOpacity
                style={[styles.userItem, isSelected && styles.userItemSelected]}
                onPress={() => toggleUser(item)}
                activeOpacity={0.7}
            >
                <View style={styles.avatar}>
                    {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {item.username.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.username}>{item.username}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContent}>
                    {/* Заголовок / Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Добавить участников</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Поиск / Search */}
                    <TextInput
                        style={styles.input}
                        placeholder="Поиск по имени или email..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={searchUsersHandler}
                        autoCapitalize="none"
                    />

                    {/* Список найденных пользователей / Found users list */}
                    {searching ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={users}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderUser}
                            style={styles.userList}
                            ListEmptyComponent={
                                searchQuery.length >= 2 ? (
                                    <Text style={styles.emptyText}>
                                        Пользователи не найдены
                                    </Text>
                                ) : null
                            }
                        />
                    )}

                    {/* Выбранные пользователи / Selected users count */}
                    <View style={styles.footer}>
                        <Text style={styles.selectedCount}>
                            Выбрано: {selectedUsers.length}
                        </Text>
                        <TouchableOpacity
                            style={[styles.addButton, selectedUsers.length === 0 && styles.addButtonDisabled]}
                            onPress={handleAdd}
                            disabled={selectedUsers.length === 0 || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.addButtonText}>Добавить</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

/**
 * Стили компонента
 * Component styles
 */
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
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
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
    },
    closeButton: {
        padding: spacing.sm,
        borderRadius: borderRadius.circle,
        backgroundColor: '#F0F0F0',
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
        backgroundColor: '#F8F8F8',
        fontSize: 16,
        color: colors.text,
        marginBottom: spacing.md,
    },
    userList: {
        maxHeight: 300,
        marginBottom: spacing.md,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.medium,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    userItemSelected: {
        backgroundColor: 'rgba(44, 62, 122, 0.08)',
        borderColor: colors.primary,
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
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    email: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    center: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        paddingVertical: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.md,
    },
    selectedCount: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    addButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.xlarge,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        ...shadows.medium,
    },
    addButtonDisabled: {
        backgroundColor: colors.textMuted,
        opacity: 0.6,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default AddParticipantsModal;