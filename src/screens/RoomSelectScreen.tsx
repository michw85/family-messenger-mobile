/**
 * @file RoomSelectScreen.tsx
 * @description Экран выбора чата – загружает реальные данные с бэкенда через API
 * @description Chat selection screen – loads real data from backend via API
 * 
 * @author Family Messenger Team
 * @version 6.0.0
 * @license MIT
 */

import React, { useState, useEffect } from 'react';
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
import { fetchChats, createChat, deleteChat } from '../services/api';

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
}

/**
 * Экран выбора чата
 * Chat selection screen
 */
const RoomSelectScreen: React.FC<any> = ({ navigation }) => {
    const { t, language, setLanguage } = useLanguage();
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [currentUsername, setCurrentUsername] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

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
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatType}>
                    {item.type === 'GROUP' ? '👥 ' + t('group_chats') : '👤 ' + t('private_chats')}
                </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
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
                <ActivityIndicator size="large" color="#6C5CE7" />
            </View>
        );
    }

    return (
        <LinearGradient colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']} style={styles.container}>
            <FloatingClouds />
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Text style={styles.greeting}>
                            {t('greeting')}, {currentUsername || t('friend')}! 👋
                        </Text>
                        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
                            <Text style={styles.langText}>{language === 'ru' ? '🇬🇧 EN' : '🇷🇺 RU'}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.title}>{t('select_chat')}</Text>
                </View>

                <FlatList
                    data={chats}
                    keyExtractor={(item) => item.id}
                    renderItem={renderChatItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} />
                    }
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🕊️</Text>
                            <Text style={styles.emptyText}>{t('no_chats')}</Text>
                            <Text style={styles.emptySubtext}>{t('soon')}</Text>
                        </View>
                    }
                />

                {/* Кнопка создания нового чата (FAB) */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {/* открыть модальное окно CreateChatModal */ }}
                    activeOpacity={0.8}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            </View>
            {/* Здесь должен быть компонент CreateChatModal, но он не показан для краткости */}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
    header: { marginBottom: 24 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    greeting: { fontSize: 14, color: '#8A9AAA' },
    langButton: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16 },
    langText: { fontSize: 11, fontWeight: '500', color: '#6C5CE7' },
    title: { fontSize: 28, fontWeight: '700', color: '#2C3E50' },
    listContent: { paddingBottom: 80 },
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E8E0D5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { fontSize: 20, fontWeight: '600', color: '#6C5CE7' },
    chatInfo: { flex: 1 },
    chatName: { fontSize: 16, fontWeight: '600', color: '#2C3E50', marginBottom: 2 },
    chatType: { fontSize: 11, color: '#8A9AAA' },
    arrow: { fontSize: 24, color: '#6C5CE7' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 16, opacity: 0.6 },
    emptyText: { fontSize: 16, color: '#8A9AAA', marginBottom: 4 },
    emptySubtext: { fontSize: 13, color: '#B0B0B0' },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabText: { color: '#FFFFFF', fontSize: 32, fontWeight: '300', marginTop: -2 },
});

export default RoomSelectScreen;