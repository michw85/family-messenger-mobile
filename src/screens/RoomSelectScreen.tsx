/**
 * @file RoomSelectScreen.tsx
 * @description Экран выбора чат-комнат: семейный чат, группы по интересам, личная переписка
 * @description Chat room selection screen: family chat, interest groups, private messages
 * 
 * @author Family Messenger Team
 * @version 3.1.0
 * @license MIT
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingClouds from '../components/FloatingClouds';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Интерфейс комнаты
 * Room interface
 */
interface Room {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: 'family' | 'interest' | 'private';
    memberCount: number;
    color: string;
}

/**
 * Список доступных комнат
 * List of available rooms
 */
const rooms: Room[] = [
    {
        id: 'family-chat',
        name: 'Семейные мысли',
        description: 'Общий семейный чат, где все делятся новостями',
        icon: '💭',
        type: 'family',
        memberCount: 6,
        color: '#6C5CE7',
    },
    {
        id: 'interests-cooking',
        name: 'Кулинарные рецепты',
        description: 'Делимся любимыми рецептами и секретами готовки',
        icon: '🍳',
        type: 'interest',
        memberCount: 4,
        color: '#FF7675',
    },
    {
        id: 'interests-travel',
        name: 'Путешествия',
        description: 'Планируем поездки и делимся впечатлениями',
        icon: '✈️',
        type: 'interest',
        memberCount: 3,
        color: '#74B9FF',
    },
    {
        id: 'interests-movies',
        name: 'Кинозал',
        description: 'Обсуждаем фильмы и сериалы',
        icon: '🎬',
        type: 'interest',
        memberCount: 5,
        color: '#00CEC9',
    },
    {
        id: 'private-mom',
        name: 'Мама',
        description: 'Личная переписка с мамой',
        icon: '👩',
        type: 'private',
        memberCount: 2,
        color: '#FD79A8',
    },
    {
        id: 'private-dad',
        name: 'Папа',
        description: 'Личная переписка с папой',
        icon: '👨',
        type: 'private',
        memberCount: 2,
        color: '#55EFC4',
    },
];

/**
 * Компонент анимированной карточки комнаты
 * Animated room card component
 * Вынесен в отдельный компонент, чтобы использовать хуки на верхнем уровне
 * Extracted to separate component to use hooks at top level
 */
const AnimatedRoomCard: React.FC<{
    item: Room;
    index: number;
    isSelected: boolean;
    onPress: (room: Room) => void;
}> = ({ item, index, isSelected, onPress }) => {
    // Хуки вызываются на верхнем уровне компонента
    // Hooks are called at the top level of the component
    const translateX = useRef(new Animated.Value(30)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Анимация появления карточки с задержкой
        // Card appearance animation with delay
        Animated.parallel([
            Animated.spring(translateX, {
                toValue: 0,
                tension: 50,
                friction: 7,
                delay: index * 80,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                delay: index * 80,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index]);

    return (
        <Animated.View
            style={[
                styles.roomCardWrapper,
                {
                    opacity: opacity,
                    transform: [{ translateX: translateX }],
                },
            ]}
        >
            <TouchableOpacity
                style={[
                    styles.roomCard,
                    isSelected && styles.roomCardSelected,
                    { borderLeftColor: item.color, borderLeftWidth: 4 }
                ]}
                onPress={() => onPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.roomIconContainer, { backgroundColor: item.color + '20' }]}>
                    <Text style={styles.roomIcon}>{item.icon}</Text>
                </View>
                <View style={styles.roomInfo}>
                    <Text style={styles.roomName}>{item.name}</Text>
                    <Text style={styles.roomDescription}>{item.description}</Text>
                    <View style={styles.membersContainer}>
                        <Text style={styles.membersIcon}>👥</Text>
                        <Text style={styles.roomMembers}>{item.memberCount} участников</Text>
                    </View>
                </View>
                <Text style={[styles.arrow, { color: item.color }]}>→</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

/**
 * Компонент таба для переключения категорий
 * Tab component for category switching
 */
const Tab: React.FC<{
    type: 'family' | 'interest' | 'private';
    label: string;
    icon: string;
    isActive: boolean;
    onPress: () => void;
}> = ({ type, label, icon, isActive, onPress }) => {
    return (
        <TouchableOpacity
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={styles.tabIcon}>{icon}</Text>
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};

/**
 * Экран выбора комнаты
 * Room selection screen component
 */
const RoomSelectScreen: React.FC<any> = ({ navigation }) => {
    // Все хуки на верхнем уровне компонента
    // All hooks at the top level of component
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'family' | 'interest' | 'private'>('family');
    const [currentUsername, setCurrentUsername] = useState<string>('');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Анимация появления всего экрана / Screen appearance animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
        
        // Загрузка имени пользователя / Load username
        const loadUsername = async () => {
            const name = await AsyncStorage.getItem('username');
            if (name) setCurrentUsername(name);
        };
        loadUsername();
    }, []);

    /**
     * Фильтрация комнат по типу
     * Filter rooms by type
     */
    const filteredRooms = rooms.filter(room => room.type === activeTab);

    /**
     * Обработчик выбора комнаты
     * Room selection handler
     */
    const handleRoomSelect = (room: Room) => {
        setSelectedRoom(room.id);
        setTimeout(() => {
            navigation.navigate('ChatRoom', { 
                roomId: room.id, 
                roomName: room.name 
            });
        }, 300);
    };

    /**
     * Рендер карточки комнаты (без хуков внутри!)
     * Render room card (no hooks inside!)
     */
    const renderRoom = ({ item, index }: { item: Room; index: number }) => (
        <AnimatedRoomCard
            item={item}
            index={index}
            isSelected={selectedRoom === item.id}
            onPress={handleRoomSelect}
        />
    );

    /**
     * Рендер таба (без хуков внутри!)
     * Render tab (no hooks inside!)
     */
    const renderTab = (type: 'family' | 'interest' | 'private', label: string, icon: string) => (
        <Tab
            type={type}
            label={label}
            icon={icon}
            isActive={activeTab === type}
            onPress={() => setActiveTab(type)}
        />
    );

    return (
        <LinearGradient
            colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']}
            style={styles.container}
        >
            <FloatingClouds />
            
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Приветствие / Greeting */}
                <View style={styles.header}>
                    <Text style={styles.greeting}>
                        Привет, {currentUsername || 'Друг'}! 👋
                    </Text>
                    <Text style={styles.title}>Выберите комнату</Text>
                    <Text style={styles.subtitle}>Куда отправим мысль?</Text>
                </View>

                {/* Табы для переключения категорий / Tabs for category switching */}
                <View style={styles.tabsContainer}>
                    {renderTab('family', 'Семья', '💭')}
                    {renderTab('interest', 'Интересы', '⭐')}
                    {renderTab('private', 'Личное', '💌')}
                </View>

                {/* Список комнат / Rooms list */}
                <FlatList
                    data={filteredRooms}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRoom}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🕊️</Text>
                            <Text style={styles.emptyText}>Нет комнат в этой категории</Text>
                            <Text style={styles.emptySubtext}>Скоро появятся новые!</Text>
                        </View>
                    }
                />
            </Animated.View>
        </LinearGradient>
    );
};

/**
 * Стили компонента RoomSelectScreen
 * Room selection screen styles
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    header: {
        marginBottom: 24,
    },
    greeting: {
        fontSize: 14,
        color: '#8A9AAA',
        marginBottom: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2C3E50',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#8A9AAA',
    },
    // Стили табов / Tab styles
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 30,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 25,
        gap: 6,
    },
    tabActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tabIcon: {
        fontSize: 16,
    },
    tabText: {
        fontSize: 13,
        color: '#8A9AAA',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#6C5CE7',
        fontWeight: '600',
    },
    // Стили списка / List styles
    listContent: {
        paddingBottom: 40,
    },
    roomCardWrapper: {
        marginBottom: 12,
    },
    roomCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    roomCardSelected: {
        backgroundColor: '#F8F6FF',
    },
    roomIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    roomIcon: {
        fontSize: 28,
    },
    roomInfo: {
        flex: 1,
    },
    roomName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 2,
    },
    roomDescription: {
        fontSize: 12,
        color: '#8A9AAA',
        marginBottom: 4,
    },
    membersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    membersIcon: {
        fontSize: 10,
        color: '#95A5A6',
    },
    roomMembers: {
        fontSize: 10,
        color: '#95A5A6',
    },
    arrow: {
        fontSize: 18,
        marginLeft: 8,
    },
    // Пустое состояние / Empty state
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 16,
        opacity: 0.6,
    },
    emptyText: {
        fontSize: 16,
        color: '#8A9AAA',
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#B0B0B0',
    },
});

export default RoomSelectScreen;