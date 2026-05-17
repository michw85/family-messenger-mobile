/**
 * @file theme.ts
 * @description Общие стили, цвета и константы для всего приложения
 * @description Common styles, colors and constants for the entire application
 * 
 * @author Family Messenger Team
 * @version 2.0.0
 * @license MIT
 */

import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * Цветовая схема приложения
 * Application color scheme
 */
export const colors = {
    // Основные цвета / Primary colors
    primary: '#6C5CE7' as const,           // Фиолетовый для акцентов / Purple for accents
    primaryLight: '#8B7EEC' as const,      // Светлый фиолетовый / Light purple
    primaryDark: '#5A4BD1' as const,       // Тёмный фиолетовый / Dark purple
    
    // Фоновые цвета / Background colors
    background: '#E8F4F8' as const,        // Основной фон / Main background
    backgroundLight: '#F5F0EB' as const,   // Светлый фон / Light background
    backgroundGradient: ['#E8F4F8', '#D1E9F2', '#F5F0EB'] as const, // Градиент фона / Background gradient
    
    // Цвета сообщений / Message colors
    myMessage: '#6C5CE7' as const,         // Мои сообщения / My messages
    theirMessage: '#FFFFFF' as const,      // Сообщения других / Others' messages
    
    // Текст / Text colors
    text: '#2C3E50' as const,              // Основной текст / Main text
    textLight: '#FFFFFF' as const,         // Светлый текст / Light text
    textSecondary: '#8A9AAA' as const,     // Второстепенный текст / Secondary text
    textMuted: '#95A5A6' as const,         // Приглушённый текст / Muted text
    textDark: '#1A252F' as const,          // Тёмный текст для времени / Dark text for time
    
    // Статусы / Status colors
    online: '#4CD964' as const,            // Онлайн / Online
    offline: '#FF4444' as const,           // Оффлайн / Offline
    typing: '#6C5CE7' as const,            // Печатает / Typing
    
    // Границы и разделители / Borders and dividers
    border: 'rgba(0,0,0,0.05)' as const,   // Прозрачная граница / Transparent border
    borderLight: '#E8E8E8' as const,       // Светлая граница / Light border
    
    // Эффекты / Effects
    shadow: 'rgba(0,0,0,0.1)' as const,    // Тень / Shadow
    shadowLight: 'rgba(0,0,0,0.05)' as const, // Лёгкая тень / Light shadow
};

/**
 * Отступы и размеры
 * Spacing and sizes
 */
export const spacing = {
    xs: 4 as const,   // Очень маленький / Extra small
    sm: 8 as const,   // Маленький / Small
    md: 12 as const,  // Средний / Medium
    lg: 16 as const,  // Большой / Large
    xl: 20 as const,  // Очень большой / Extra large
    xxl: 24 as const, // Двойной большой / Double extra large
    xxxl: 32 as const, // Тройной большой / Triple extra large
};

/**
 * Тени для разных уровней
 * Shadows for different elevation levels
 */
export const shadows = {
    // Лёгкая тень для карточек / Light shadow for cards
    small: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    // Средняя тень для кнопок / Medium shadow for buttons
    medium: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    // Сильная тень для модальных окон / Strong shadow for modals
    large: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
};

/**
 * Общие стили для переиспользования
 * Common reusable styles
 */
export const commonStyles = StyleSheet.create({
    // Основной контейнер / Main container
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    
    // Контейнер с градиентом / Container with gradient
    gradientContainer: {
        flex: 1,
    },
    
    // Центрирование контента / Content centering
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Основная кнопка / Primary button
    button: {
        backgroundColor: colors.primary,
        borderRadius: 30,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        ...shadows.medium,
    },
    
    // Текст кнопки / Button text
    buttonText: {
        color: colors.textLight,
        fontSize: 16,
        fontWeight: '600',
    },
    
    // Поле ввода / Input field
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
    
    // Заголовок экрана / Screen header
    header: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    
    // Подзаголовок / Subheader
    subheader: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    
    // Карточка / Card
    card: {
        backgroundColor: colors.theirMessage,
        borderRadius: 20,
        padding: spacing.lg,
        ...shadows.small,
    },
});

export default {
    colors,
    spacing,
    shadows,
    commonStyles,
    screenWidth,
    screenHeight,
};