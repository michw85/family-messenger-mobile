/**
 * @file theme.ts
 * @description Общие стили и тема для всего приложения
 * @description Common styles and theme for the entire application
 * 
 * @author Family Messenger Team
 * @version 1.1.0
 */

import { StyleSheet, Platform, Dimensions } from 'react-native';
import { LinearGradientProps } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

/**
 * Основные цвета приложения
 * Main application colors
 */
export const colors = {
    // Основные цвета / Primary colors
    primary: '#6C5CE7' as const,
    primaryLight: '#8B7EEC' as const,
    primaryDark: '#5A4BD1' as const,
    
    // Фоновые цвета / Background colors
    background: '#E8F4F8' as const,
    backgroundLight: '#F5F0EB' as const,
    backgroundGradient: ['#E8F4F8', '#D1E9F2', '#F5F0EB'] as const,
    
    // Цвета сообщений / Message colors
    myMessage: '#6C5CE7' as const,
    theirMessage: '#FFFFFF' as const,
    
    // Текст / Text colors
    text: '#2C3E50' as const,
    textLight: '#FFFFFF' as const,
    textSecondary: '#8A9AAA' as const,
    textMuted: '#95A5A6' as const,
    
    // Статусы / Status colors
    online: '#4CD964' as const,
    offline: '#FF4444' as const,
    typing: '#6C5CE7' as const,
    
    // Границы и разделители / Borders and dividers
    border: 'rgba(0,0,0,0.05)' as const,
    borderLight: '#E8E8E8' as const,
    
    // Эффекты / Effects
    shadow: 'rgba(0,0,0,0.1)' as const,
    shadowLight: 'rgba(0,0,0,0.05)' as const,
    
    // Пузырьки / Bubbles
    bubbleTrail: 'rgba(108,92,231,0.3)' as const,
};

/**
 * Размеры и отступы
 * Sizes and spacings
 */
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

/**
 * Тени для разных уровней
 * Shadows for different levels
 */
export const shadows = {
    small: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    medium: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    large: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
};

/**
 * Общие стили
 * Common styles
 */
export const commonStyles = StyleSheet.create({
    // Контейнеры / Containers
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeContainer: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'ios' ? 44 : 0,
    },
    
    // Центрирование / Centering
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Кнопки / Buttons
    button: {
        backgroundColor: colors.primary,
        borderRadius: 30,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        ...shadows.medium,
    },
    buttonText: {
        color: colors.textLight,
        fontSize: 16,
        fontWeight: '600',
    },
    
    // Карточки / Cards
    card: {
        backgroundColor: colors.theirMessage,
        borderRadius: 20,
        padding: spacing.lg,
        ...shadows.small,
    },
    
    // Ввод текста / Text input
    input: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 30,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.theirMessage,
        fontSize: 16,
        color: colors.text,
        ...shadows.small,
    },
    
    // Заголовки / Headers
    header: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.lg,
    },
    subheader: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
    },
});

export default {
    colors,
    spacing,
    shadows,
    commonStyles,
};