/**
 * @file FloatingClouds.tsx
 * @description Компонент декоративных парящих облаков для фона всех экранов
 * @description Decorative floating clouds component for background of all screens
 * 
 * @author Bonds Team
 * @version 1.1.0
 * @license MIT
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Компонент FloatingClouds с тёплыми (на светлой теме) или холодными
 * индиго-полупрозрачными (на тёмной) декоративными облаками
 * FloatingClouds component with warm (light theme) or cool indigo-tinted
 * translucent (dark theme) decorative clouds
 * @returns React элемент с декоративными облаками / React element with decorative clouds
 */
const FloatingClouds: React.FC = () => {
    const { theme } = useTheme();
    // На тёмном фоне насыщенный индиго был слишком заметен и выглядел как
    // случайные пятна - берём тон, совсем немного отличающийся от фона, и
    // снижаем непрозрачность в несколько раз
    // On the dark background, a saturated indigo stood out too much and
    // looked like random blobs - use a tone only slightly different from the
    // background and cut the opacity down several times over
    const cloudColor = theme === 'dark' ? '#2A2F4A' : '#F5E6CA';
    const opacityScale = theme === 'dark' ? 0.35 : 1;

    return (
        <View style={styles.container} pointerEvents="none">
            {/* Облако вверху слева / Cloud at top left */}
            <View style={[styles.cloud, { top: 80, left: -30, opacity: 0.15 * opacityScale, backgroundColor: cloudColor }]} />

            {/* Облако справа в середине / Cloud at middle right */}
            <View style={[styles.cloud, { top: 250, right: -20, opacity: 0.1 * opacityScale, width: 120, height: 70, backgroundColor: cloudColor }]} />

            {/* Облако снизу слева / Cloud at bottom left */}
            <View style={[styles.cloud, { bottom: 150, left: 20, opacity: 0.1 * opacityScale, backgroundColor: cloudColor }]} />

            {/* Маленькое облако справа вверху / Small cloud at top right */}
            <View style={[styles.cloud, { top: 450, right: '10%', opacity: 0.08 * opacityScale, width: 80, height: 50, backgroundColor: cloudColor }]} />

            {/* Ещё одно облако снизу справа / Another cloud at bottom right */}
            <View style={[styles.cloud, { bottom: 300, right: '15%', opacity: 0.1 * opacityScale, width: 90, height: 55, backgroundColor: cloudColor }]} />
        </View>
    );
};

/**
 * Стили компонента
 * Component styles
 */
const styles = StyleSheet.create({
    // Основной контейнер для облаков / Main container for clouds
    container: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    // Стиль одного облака / Single cloud style
    cloud: {
        position: 'absolute',
        width: 100,
        height: 60,
        // backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 50,
    },
});

export default FloatingClouds;