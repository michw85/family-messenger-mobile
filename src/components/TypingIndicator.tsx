/**
 * @file TypingIndicator.tsx
 * @description Компонент индикатора "пользователь печатает"
 * @description "User is typing" indicator component
 * 
 * @author Family Messenger Team
 * @version 1.1.0
 * @license MIT
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * Интерфейс пропсов компонента
 * Component props interface
 * @property username - Имя пользователя, который печатает / Username of typing user
 */
interface TypingIndicatorProps {
    username: string;
}

/**
 * Компонент индикатора печатания с анимированными точками
 * Typing indicator component with animated dots
 */
const TypingIndicator: React.FC<TypingIndicatorProps> = ({ username }) => {
    // Анимация для трёх точек печати / Animation for three typing dots
    const dot1Opacity = useRef(new Animated.Value(0.3)).current;
    const dot2Opacity = useRef(new Animated.Value(0.3)).current;
    const dot3Opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Создаём бесконечную анимацию пульсации точек / Create infinite pulse animation for dots
        const animateDots = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(dot1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(dot1Opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                    Animated.timing(dot2Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(dot2Opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                    Animated.timing(dot3Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(dot3Opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                ])
            ).start();
        };

        animateDots();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.cloud}>
                <Text style={styles.text}>
                    ✍️ {username || 'Кто-то'} печатает
                </Text>
                <View style={styles.dotsContainer}>
                    <Animated.Text style={[styles.dot, { opacity: dot1Opacity }]}>.</Animated.Text>
                    <Animated.Text style={[styles.dot, { opacity: dot2Opacity }]}>.</Animated.Text>
                    <Animated.Text style={[styles.dot, { opacity: dot3Opacity }]}>.</Animated.Text>
                </View>
            </View>
        </View>
    );
};

/**
 * Стили компонента
 * Component styles
 */
const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        zIndex: 1,
    },
    cloud: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    text: {
        fontSize: 12,
        color: '#8A9AAA',
        fontStyle: 'italic',
    },
    dotsContainer: {
        flexDirection: 'row',
        marginLeft: 2,
    },
    dot: {
        fontSize: 16,
        color: '#8A9AAA',
        marginLeft: -2,
    },
});

export default TypingIndicator;