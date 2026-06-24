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

/**
 * Компонент FloatingClouds с тёплыми полупрозрачными облаками
 * FloatingClouds component with warm semi-transparent clouds
 * @returns React элемент с декоративными облаками / React element with decorative clouds
 */
const FloatingClouds: React.FC = () => {
    return (
        <View style={styles.container} pointerEvents="none">
            {/* Облако вверху слева / Cloud at top left */}
            <View style={[styles.cloud, { top: 80, left: -30, opacity: 0.15, backgroundColor: '#F5E6CA' }]} />
            
            {/* Облако справа в середине / Cloud at middle right */}
            <View style={[styles.cloud, { top: 250, right: -20, opacity: 0.1, width: 120, height: 70, backgroundColor: '#F5E6CA' }]} />
            
            {/* Облако снизу слева / Cloud at bottom left */}
            <View style={[styles.cloud, { bottom: 150, left: 20, opacity: 0.1, backgroundColor: '#F5E6CA' }]} />
            
            {/* Маленькое облако справа вверху / Small cloud at top right */}
            <View style={[styles.cloud, { top: 450, right: '10%', opacity: 0.08, width: 80, height: 50, backgroundColor: '#F5E6CA' }]} />
            
            {/* Ещё одно облако снизу справа / Another cloud at bottom right */}
            <View style={[styles.cloud, { bottom: 300, right: '15%', opacity: 0.1, width: 90, height: 55, backgroundColor: '#F5E6CA' }]} />
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