/**
 * @file FloatingClouds.tsx
 * @description Компонент декоративных парящих облаков для фона
 * @description Decorative floating clouds component for background
 * 
 * @author Family Messenger Team
 * @version 1.0.0
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function FloatingClouds() {
    return (
        <View style={styles.container} pointerEvents="none">
            <View style={[styles.cloud, { top: 80, left: -30, opacity: 0.15 }]} />
            <View style={[styles.cloud, { top: 250, right: -20, opacity: 0.1, width: 120, height: 70 }]} />
            <View style={[styles.cloud, { bottom: 150, left: 20, opacity: 0.12 }]} />
            <View style={[styles.cloud, { top: 450, right: '10%', opacity: 0.08, width: 80, height: 50 }]} />
            <View style={[styles.cloud, { bottom: 300, right: '15%', opacity: 0.1, width: 90, height: 55 }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    cloud: {
        position: 'absolute',
        width: 100,
        height: 60,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 50,
    },
});