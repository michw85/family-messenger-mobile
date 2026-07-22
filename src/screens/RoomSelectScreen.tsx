/**
 * @file RoomSelectScreen.tsx
 * @description Экран выбора чата – загружает реальные данные с бэкенда через API
 * @description Chat selection screen – loads real data from backend via API
 * 
 * @author Bonds Team
 * @version 6.0.0
 * @license MIT
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingClouds from '../components/FloatingClouds';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { fetchChats, createChat, deleteChat } from '../services/api';
import CreateChatModal from '../components/CreateChatModal';
import { spacing, borderRadius, shadows, typography, AppColors } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


/**
 * Интерфейс чата, получаемый с бэкенда
 * Chat interface from backend
 */
interface ChatRoom {
    id: string;
    name: string;
    type: 'GROUP' | 'DIRECT' | 'FAMILY';
    participants: Array<{ username: string }>;
    createdAt: string;
    lastActivityAt: string;
}

/** Фильтр по типу чата на экране выбора / Chat-type filter on the room-select screen */
type ChatFilter = 'ALL' | 'PERSONAL' | 'GROUP';

/**
 * Экран выбора чата
 * Chat selection screen
 */
const RoomSelectScreen: React.FC<any> = ({ navigation }) => {
    const { t, language, setLanguage } = useLanguage();
    const { theme, colors, toggleTheme } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const insets = useSafeAreaInsets();
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [currentUsername, setCurrentUsername] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [filter, setFilter] = useState<ChatFilter>('ALL');
    // По умолчанию - по недавней активности (как бэкенд и отдаёт список), А-Я - по запросу
    // Default is recent activity (matches what the backend already returns), A-Z on request
    const [sortAlpha, setSortAlpha] = useState<boolean>(false);

    /**
     * Загрузка чатов с бэкенда
     * Load chats from backend
     */
    const loadChats = async () => {
        try {
            const response = await fetchChats();
            setChats(response.data);
        } catch (error) {
            console.error('Failed to load chats:', error);
            Alert.alert(t('error'), 'Не удалось загрузить чаты / Failed to load chats');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    /**
     * Загрузка имени текущего пользователя
     * Load current username
     */
    const loadUser = async () => {
        const name = await AsyncStorage.getItem('username');
        if (name) setCurrentUsername(name);
    };

    useEffect(() => {
        loadUser();
        loadChats();
    }, []);

    /**
     * Обработчик "потянуть для обновления"
     * Pull-to-refresh handler
     */
    const onRefresh = () => {
        setRefreshing(true);
        loadChats();
    };

    /**
     * Создание нового чата (группового или личного)
     * Create new chat (group or direct)
     * @param name - название чата
     * @param type - тип чата: 'group' (GROUP) или 'private' (DIRECT)
     */
    const handleCreateChat = async (name: string, type: 'group' | 'private') => {
        // Для личных чатов используем 'FAMILY' (или 'DIRECT', если бэкенд поддерживает)
        const backendType = type === 'group' ? 'GROUP' : 'FAMILY';
        try {
            await createChat(name, backendType);
            await loadChats(); // обновить список
        } catch (error) {
            Alert.alert(t('error'), 'Не удалось создать чат / Could not create chat');
        }
    };

    /**
     * Удаление чата (только для создателя)
     * Delete chat (creator only)
     * @param chatId - идентификатор чата
     * @param chatName - название чата (для сообщения подтверждения)
     */
    const handleDeleteChat = (chatId: string, chatName: string) => {
        Alert.alert(
            'Удалить чат? / Delete chat?',
            `Вы уверены, что хотите удалить "${chatName}"? Это действие нельзя отменить.\n\nAre you sure? This action cannot be undone.`,
            [
                { text: 'Отмена / Cancel', style: 'cancel' },
                {
                    text: 'Удалить / Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteChat(chatId);
                        await loadChats();
                    },
                },
            ]
        );
    };

    /**
     * Список чатов после фильтра (личные/групповые) и сортировки
     * (по активности по умолчанию, либо по алфавиту)
     * Chat list after the personal/group filter and sorting
     * (recent activity by default, or alphabetical)
     */
    const visibleChats = useMemo(() => {
        let list = chats;
        if (filter === 'GROUP') {
            list = list.filter((c) => c.type === 'GROUP');
        } else if (filter === 'PERSONAL') {
            list = list.filter((c) => c.type !== 'GROUP');
        }
        list = [...list];
        if (sortAlpha) {
            list.sort((a, b) => a.name.localeCompare(b.name, language));
        } else {
            list.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
        }
        return list;
    }, [chats, filter, sortAlpha, language]);

    /**
     * Рендер одного элемента чата
     * Render a single chat item
     */
    const renderChatItem = ({ item }: { item: ChatRoom }) => (
        <TouchableOpacity
            style={styles.chatCard}
            onPress={() => navigation.navigate('ChatRoom', { roomId: item.id, roomName: item.name })}
            onLongPress={() => handleDeleteChat(item.id, item.name)}
            delayLongPress={500}
            activeOpacity={0.7}
        >
            <View style={[styles.avatar, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {item.name.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatType}>
                    {item.type === 'GROUP' ? '👥 ' + t('group_chats') : '👤 ' + t('private_chats')}
                </Text>
            </View>
            <Text style={[styles.arrow, { color: colors.accent }]}>›</Text>
        </TouchableOpacity>
    );

    /**
     * Переключение языка
     * Toggle language
     */
    const toggleLanguage = () => {
        setLanguage(language === 'ru' ? 'en' : 'ru');
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    /* Выйти из аккаунта/ Exit */
    const handleLogout = async () => {
        Alert.alert(
            'Выйти из аккаунта?',
            'Вы уверены?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Выйти',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('token');
                        await AsyncStorage.removeItem('username');
                        navigation.replace('Login');
                    }
                }
            ]
        );
    };

    return (
        <LinearGradient colors={colors.backgroundGradient as [string, string, string]} style={styles.container}>
            <FloatingClouds />
            <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Text style={[styles.greeting, { flex: 1 }]}>
                            {t('greeting')}, {currentUsername || t('friend')}! 👋
                        </Text>
                        <TouchableOpacity onPress={toggleTheme} style={styles.langButton}>
                            <Text style={styles.langText}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
                            <Text style={styles.langText}>{language === 'ru' ? 'EN' : 'RU'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <Text style={styles.logoutText}>⎋</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.title}>{t('select_chat')}</Text>

                    <View style={styles.filterRow}>
                        <View style={styles.segmentGroup}>
                            {([
                                ['ALL', t('all_chats')],
                                ['PERSONAL', t('private_chats')],
                                ['GROUP', t('group_chats_short')],
                            ] as [ChatFilter, string][]).map(([key, label]) => (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => setFilter(key)}
                                    style={[styles.segment, filter === key && styles.segmentActive]}
                                >
                                    <Text style={[styles.segmentText, filter === key && styles.segmentTextActive]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity onPress={() => setSortAlpha((prev) => !prev)} style={styles.sortButton}>
                            <Text style={styles.sortButtonText}>{sortAlpha ? t('sort_alpha') : t('sort_recent')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={visibleChats}
                    keyExtractor={(item) => item.id}
                    renderItem={renderChatItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>💛</Text>
                            <Text style={styles.emptyText}>{t('no_chats')}</Text>
                            <Text style={styles.emptySubtext}>{t('soon')}</Text>
                        </View>
                    }
                />

                <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => setModalVisible(true)}>
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            </View>

            <CreateChatModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onCreate={handleCreateChat}
            />
        </LinearGradient>
    );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: 60 },
    header: { marginBottom: spacing.xxl },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm, },
    greeting: { fontSize: 14, color: colors.textSecondary, flexShrink: 1, },
    langButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.pillBackground,
        borderRadius: borderRadius.medium,
        ...shadows.soft,
    },
    langText: { fontSize: 11, fontWeight: '500', color: colors.primary, letterSpacing: 0.3 },
    title: { fontSize: 28, fontWeight: '700', color: colors.primary, letterSpacing: 0.5, marginBottom: spacing.md },
    filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    segmentGroup: {
        flexDirection: 'row',
        backgroundColor: colors.pillBackground,
        borderRadius: borderRadius.medium,
        padding: 3,
        gap: 2,
    },
    segment: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.small,
    },
    segmentActive: {
        backgroundColor: colors.primary,
    },
    segmentText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
    segmentTextActive: { color: colors.textLight },
    sortButton: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    sortButtonText: { fontSize: 12, fontWeight: '500', color: colors.primary, textDecorationLine: 'underline' },
    listContent: { paddingBottom: 80 },
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
        borderRadius: borderRadius.medium,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.soft,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        borderWidth: 2,
    },
    avatarText: { fontSize: 20, fontWeight: '600' },
    chatInfo: { flex: 1 },
    chatName: { fontSize: 16, fontWeight: '600', color: colors.text, letterSpacing: 0.2 },
    chatType: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    arrow: { fontSize: 24, marginLeft: spacing.sm },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: spacing.md, opacity: 0.6 },
    emptyText: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.xs },
    emptySubtext: { fontSize: 13, color: colors.textMuted },
    fab: {
        position: 'absolute',
        // bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.large,
    },
    fabText: { color: colors.textLight, fontSize: 32, fontWeight: '300', marginTop: -2 },
    logoutButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.subtleOverlay, // легкий фон для тактильности
    },
    logoutText: {
        fontSize: 24,
        color: '#d32f2f', // красный, чтобы обозначить выход
        textAlign: 'center',
        lineHeight: 28,
    },
});

export default RoomSelectScreen;