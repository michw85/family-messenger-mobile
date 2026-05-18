/**
 * @file RoomSelectScreen.tsx
 * @description Экран выбора чата с возможностью создания и удаления чатов
 * @description Chat selection screen with ability to create and delete chats
 * 
 * @author Family Messenger Team
 * @version 5.3.0
 * @license MIT
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    SectionList,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingClouds from '../components/FloatingClouds';
import CreateChatModal from '../components/CreateChatModal';
import { useLanguage } from '../context/LanguageContext';

/**
 * Интерфейс чата
 * Chat interface
 * @property id - Уникальный идентификатор чата / Unique chat identifier
 * @property name - Название чата / Chat name
 * @property type - Тип чата (групповой или личный) / Chat type (group or private)
 * @property color - Акцентный цвет / Accent color
 * @property createdAt - Дата создания / Creation date
 */
interface Chat {
    id: string;
    name: string;
    type: 'group' | 'private';
    color: string;
    createdAt: number;
}

/**
 * Интерфейс секции для SectionList
 * Section interface for SectionList
 * @property title - Заголовок секции / Section title
 * @property data - Массив чатов в секции / Array of chats in section
 * @property type - Тип секции / Section type
 */
interface Section {
    title: string;
    data: Chat[];
    type: 'group' | 'private';
}

/**
 * Ключ для хранения чатов в AsyncStorage
 * Storage key for AsyncStorage
 */
const CHATS_STORAGE_KEY = '@family_messenger_chats';

/**
 * Цветовая палитра для новых чатов
 * Color palette for new chats
 */
const COLOR_PALETTE = [
    '#6C5CE7', '#00CEC9', '#FF7675', '#74B9FF', '#A29BFE',
    '#FD79A8', '#55EFC4', '#0984E3', '#D63031', '#00B894',
];

/**
 * Начальные чаты по умолчанию
 * Default initial chats
 */
const DEFAULT_CHATS: Chat[] = [
    { id: 'family', name: 'Семья', type: 'group', color: '#6C5CE7', createdAt: Date.now() },
    { id: 'friends', name: 'Друзья', type: 'group', color: '#00CEC9', createdAt: Date.now() },
    { id: 'work', name: 'Работа', type: 'group', color: '#FF7675', createdAt: Date.now() },
    { id: 'private-mom', name: 'Мама', type: 'private', color: '#FD79A8', createdAt: Date.now() },
    { id: 'private-dad', name: 'Папа', type: 'private', color: '#55EFC4', createdAt: Date.now() },
    { id: 'private-brother', name: 'Брат', type: 'private', color: '#74B9FF', createdAt: Date.now() },
];

/**
 * Экран выбора чата
 * Chat selection screen component
 */
const RoomSelectScreen: React.FC<any> = ({ navigation }) => {
    const { t, language, setLanguage } = useLanguage();
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentUsername, setCurrentUsername] = useState<string>('');
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    /**
     * Загрузка чатов из AsyncStorage
     * Load chats from AsyncStorage
     */
    useEffect(() => {
        const loadChats = async () => {
            try {
                const savedChats = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
                if (savedChats) {
                    const parsedChats = JSON.parse(savedChats);
                    if (Array.isArray(parsedChats) && parsedChats.length > 0) {
                        setChats(parsedChats);
                    } else {
                        setChats(DEFAULT_CHATS);
                        await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(DEFAULT_CHATS));
                    }
                } else {
                    setChats(DEFAULT_CHATS);
                    await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(DEFAULT_CHATS));
                }
            } catch (error) {
                console.error('Failed to load chats:', error);
                setChats(DEFAULT_CHATS);
            }
        };
        loadChats();
    }, []);

    /**
     * Анимация появления экрана
     * Screen appearance animation
     */
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
        
        const loadUsername = async () => {
            const name = await AsyncStorage.getItem('username');
            if (name) setCurrentUsername(name);
        };
        loadUsername();
    }, []);

    /**
     * Сохранение чатов в AsyncStorage
     * Save chats to AsyncStorage
     * @param updatedChats - Обновлённый список чатов / Updated chats list
     */
    const saveChats = async (updatedChats: Chat[]): Promise<void> => {
        try {
            await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(updatedChats));
            setChats(updatedChats);
        } catch (error) {
            console.error('Failed to save chats:', error);
            Alert.alert(t('error'), 'Не удалось сохранить чат / Failed to save chat');
        }
    };

    /**
     * Создание нового чата
     * Create new chat
     * @param name - Название чата / Chat name
     * @param type - Тип чата / Chat type
     */
    const handleCreateChat = (name: string, type: 'group' | 'private'): void => {
        // Проверка на существование чата с таким именем / Check if chat with same name exists
        const existingChat = chats.find(chat => chat.name.toLowerCase() === name.toLowerCase());
        if (existingChat) {
            Alert.alert(t('error'), 'Чат с таким именем уже существует / Chat with this name already exists');
            return;
        }

        // Генерация уникального ID / Generate unique ID
        const newId = `${type}-${name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`;
        
        // Выбор случайного цвета из палитры / Pick random color from palette
        const randomColor = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
        
        // Создание нового чата / Create new chat
        const newChat: Chat = {
            id: newId,
            name: name,
            type: type,
            color: randomColor,
            createdAt: Date.now(),
        };
        
        // Добавление в список и сохранение / Add to list and save
        const updatedChats = [...chats, newChat];
        saveChats(updatedChats);
    };

    /**
     * Удаление чата
     * Delete chat
     * @param chatId - ID чата для удаления / Chat ID to delete
     * @param chatName - Название чата для подтверждения / Chat name for confirmation
     */
    const handleDeleteChat = (chatId: string, chatName: string): void => {
        Alert.alert(
            'Удалить чат? / Delete chat?',
            `Вы уверены, что хотите удалить чат "${chatName}"? Это действие нельзя отменить.\n\nAre you sure you want to delete "${chatName}"? This action cannot be undone.`,
            [
                { 
                    text: 'Отмена / Cancel', 
                    style: 'cancel' 
                },
                {
                    text: 'Удалить / Delete',
                    style: 'destructive',
                    onPress: () => {
                        const updatedChats = chats.filter(chat => chat.id !== chatId);
                        saveChats(updatedChats);
                    },
                },
            ]
        );
    };

    /**
     * Разделение чатов по типу для SectionList
     * Split chats by type for SectionList
     */
    const sections: Section[] = [
        {
            title: t('group_chats'),
            data: chats.filter(chat => chat.type === 'group'),
            type: 'group',
        },
        {
            title: t('private_chats'),
            data: chats.filter(chat => chat.type === 'private'),
            type: 'private',
        },
    ];

    /**
     * Рендер заголовка секции
     * Render section header
     * @param section - Объект секции / Section object
     */
    const renderSectionHeader = ({ section }: { section: Section }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
        </View>
    );

    /**
     * Рендер элемента чата с поддержкой удаления
     * Render chat item with delete support
     * @param item - Объект чата / Chat object
     */
    const renderChatItem = ({ item }: { item: Chat }) => (
        <TouchableOpacity
            style={[styles.chatCard, { borderLeftColor: item.color, borderLeftWidth: 4 }]}
            onPress={() => navigation.navigate('ChatRoom', { roomId: item.id, roomName: item.name })}
            onLongPress={() => handleDeleteChat(item.id, item.name)}
            activeOpacity={0.7}
            delayLongPress={500}
        >
            <View style={[styles.avatar, { backgroundColor: item.color + '20' }]}>
                <Text style={[styles.avatarText, { color: item.color }]}>
                    {item.name.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatType}>
                    {item.type === 'group' ? '👥 ' + t('group_chats') : '👤 ' + t('private_chats')}
                </Text>
            </View>
            <View style={styles.rightContainer}>
                <Text style={[styles.arrow, { color: item.color }]}>›</Text>
                <TouchableOpacity 
                    onPress={() => handleDeleteChat(item.id, item.name)}
                    style={styles.deleteButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    /**
     * Переключение языка приложения
     * Toggle application language
     */
    const toggleLanguage = () => {
        setLanguage(language === 'ru' ? 'en' : 'ru');
    };

    return (
        <LinearGradient
            colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']}
            style={styles.container}
        >
            <FloatingClouds />
            
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Верхняя панель с приветствием и кнопками / Header with greeting and buttons */}
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

                {/* Список чатов / Chats list */}
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    renderItem={renderChatItem}
                    renderSectionHeader={renderSectionHeader}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🕊️</Text>
                            <Text style={styles.emptyText}>{t('no_chats')}</Text>
                            <Text style={styles.emptySubtext}>{t('soon')}</Text>
                        </View>
                    }
                />

                {/* Кнопка создания нового чата (FAB) / Create new chat button (FAB) */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Модальное окно создания чата / Create chat modal */}
            <CreateChatModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onCreate={handleCreateChat}
            />
        </LinearGradient>
    );
};

/**
 * Стили компонента RoomSelectScreen
 * Room selection screen styles
 */
const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
    header: { marginBottom: 24 },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    greeting: { fontSize: 14, color: '#8A9AAA' },
    langButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 16,
    },
    langText: { fontSize: 11, fontWeight: '500', color: '#6C5CE7' },
    title: { fontSize: 28, fontWeight: '700', color: '#2C3E50' },
    
    // Секции / Sections
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    sectionHeaderText: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
    sectionCount: { fontSize: 13, color: '#8A9AAA' },
    listContent: { paddingBottom: 80 },
    
    // Карточки чатов / Chat cards
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { fontSize: 20, fontWeight: '600' },
    chatInfo: { flex: 1 },
    chatName: { fontSize: 16, fontWeight: '600', color: '#2C3E50', marginBottom: 2 },
    chatType: { fontSize: 11, color: '#8A9AAA' },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    arrow: { fontSize: 24 },
    deleteButton: {
        padding: 4,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    deleteText: { fontSize: 16, opacity: 0.6 },
    
    // Пустое состояние / Empty state
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 16, opacity: 0.6 },
    emptyText: { fontSize: 16, color: '#8A9AAA', marginBottom: 4 },
    emptySubtext: { fontSize: 13, color: '#B0B0B0' },
    
    // Кнопка создания чата (FAB) / Create chat button (FAB)
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
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    fabText: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '300',
        marginTop: -2,
    },
});

export default RoomSelectScreen;