/**
 * @file RoomSelectScreen.tsx
 * @description Экран выбора чат-комнат в едином стиле
 * @description Room selection screen in unified style
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingClouds from '../components/FloatingClouds';

interface Room {
    id: string;
    name: string;
    description: string;
    icon: string;
    members: number;
}

const rooms: Room[] = [
    { id: 'family-chat', name: 'Семейные мысли', description: 'Общий семейный чат', icon: '💭', members: 5 },
    { id: 'parents', name: 'Родители', description: 'Только для родителей', icon: '👨‍👩‍👧', members: 2 },
    { id: 'kids', name: 'Дети', description: 'Детская комната', icon: '🧒', members: 3 },
    { id: 'planning', name: 'Планы', description: 'Обсуждение планов', icon: '📅', members: 4 },
];

export default function RoomSelectScreen({ navigation }: any) {
    const [loading, setLoading] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleRoomSelect = (room: Room) => {
        setSelectedRoom(room.id);
        setTimeout(() => {
            navigation.navigate('ChatRoom', { roomId: room.id });
        }, 300);
    };

    const renderRoom = ({ item, index }: { item: Room; index: number }) => {
        const translateX = useRef(new Animated.Value(50)).current;
        const opacity = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: 0,
                    tension: 50,
                    friction: 7,
                    delay: index * 100,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 400,
                    delay: index * 100,
                    useNativeDriver: true,
                }),
            ]).start();
        }, []);

        return (
            <Animated.View
                style={[
                    styles.roomCardWrapper,
                    {
                        opacity,
                        transform: [{ translateX }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={[
                        styles.roomCard,
                        selectedRoom === item.id && styles.roomCardSelected,
                    ]}
                    onPress={() => handleRoomSelect(item)}
                >
                    <Text style={styles.roomIcon}>{item.icon}</Text>
                    <View style={styles.roomInfo}>
                        <Text style={styles.roomName}>{item.name}</Text>
                        <Text style={styles.roomDescription}>{item.description}</Text>
                        <Text style={styles.roomMembers}>👥 {item.members} участников</Text>
                    </View>
                    <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <LinearGradient
            colors={['#E8F4F8', '#D1E9F2', '#F5F0EB']}
            style={styles.container}
        >
            <FloatingClouds />
            
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={styles.header}>
                    <Text style={styles.emoji}>🏠✨</Text>
                    <Text style={styles.title}>Выберите комнату</Text>
                    <Text style={styles.subtitle}>Куда отправим мысль?</Text>
                </View>

                <FlatList
                    data={rooms}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRoom}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            </Animated.View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    emoji: {
        fontSize: 56,
        marginBottom: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2C3E50',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#8A9AAA',
        textAlign: 'center',
    },
    listContent: {
        paddingBottom: 40,
    },
    roomCardWrapper: {
        marginBottom: 16,
    },
    roomCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    roomCardSelected: {
        backgroundColor: '#6C5CE7',
        transform: [{ scale: 0.98 }],
    },
    roomIcon: {
        fontSize: 40,
        marginRight: 16,
    },
    roomInfo: {
        flex: 1,
    },
    roomName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 4,
    },
    roomDescription: {
        fontSize: 13,
        color: '#8A9AAA',
        marginBottom: 4,
    },
    roomMembers: {
        fontSize: 11,
        color: '#95A5A6',
    },
    arrow: {
        fontSize: 20,
        color: '#6C5CE7',
    },
});