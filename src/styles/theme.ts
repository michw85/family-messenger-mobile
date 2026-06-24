/**
 * @file theme.ts
 * @description Общие стили, цвета и константы для приложения Bonds
 * @description Common styles, colors and constants for the Bonds app
 * 
 * @author Bonds Team
 * @version 3.0.0
 * @license MIT
 */

import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * Цветовая схема приложения Bonds
 * Bonds application color scheme
 * 
 * Основная идея: тёплый дом, уют, доверие, связь (bonds)
 * Main idea: warm home, coziness, trust, connection (bonds)
 */
export const colors = {
    // Основные цвета / Primary colors
    primary: '#2C3E7A' as const,           // Глубокий индиго – символ стабильности и связи / Deep indigo – symbol of stability and connection
    primaryLight: '#4A6FA5' as const,      // Светлый индиго для второстепенных элементов / Light indigo for secondary elements
    primaryDark: '#1A2530' as const,       // Тёмный акцент для текста / Dark accent for text
    
    // Акцентный цвет / Accent color
    accent: '#D4AF37' as const,            // Мягкое золото – теплота и ценность отношений / Soft gold – warmth and value of relationships
    accentLight: '#F0E0B8' as const,       // Светлое золото для фонов и подсветок / Light gold for backgrounds and highlights
    
    // Фоновые цвета / Background colors
    background: '#FDF8F0' as const,        // Тёплый кремовый – основа уюта / Warm cream – foundation of coziness
    backgroundLight: '#FFFFFF' as const,   // Белый для карточек и полей / White for cards and fields
    backgroundWarm: '#F5E6CA' as const,    // Тёплый бежевый для облаков сообщений / Warm beige for message bubbles
    backgroundGradient: ['#FDF8F0', '#F5E6CA', '#E8D5B8'] as const, // Градиент фона / Background gradient
    
    // Цвета сообщений / Message colors
    myMessage: '#2C3E7A' as const,         // Мои сообщения – глубокий синий / My messages – deep blue
    theirMessage: '#F5E6CA' as const,      // Сообщения других – тёплый бежевый / Others' messages – warm beige
    
    // Текст / Text colors
    text: '#1A2530' as const,              // Основной текст – почти чёрный с синевой / Main text – almost black with blue tint
    textLight: '#FFFFFF' as const,         // Светлый текст для тёмных фонов / Light text for dark backgrounds
    textSecondary: '#6B7A8A' as const,     // Второстепенный текст – мягкий серый / Secondary text – soft gray
    textMuted: '#95A5A6' as const,         // Приглушённый текст / Muted text
    textDark: '#0D1B2A' as const,          // Тёмный текст для времени / Dark text for timestamp
    
    // Статусы / Status colors
    online: '#4CAF50' as const,            // Зелёный онлайн / Online green
    offline: '#B0BEC5' as const,           // Серый офлайн / Offline gray
    typing: '#2C3E7A' as const,            // Синий индикатор печати / Blue typing indicator
    
    // Границы и разделители / Borders and dividers
    border: 'rgba(44, 62, 122, 0.08)' as const,  // Полупрозрачный синий для границ / Semi-transparent blue for borders
    borderLight: 'rgba(44, 62, 122, 0.04)' as const, // Очень светлая граница / Very light border
    
    // Эффекты / Effects
    shadow: 'rgba(44, 62, 122, 0.08)' as const,   // Тень с синим оттенком / Shadow with blue tint
    shadowLight: 'rgba(44, 62, 122, 0.04)' as const, // Лёгкая тень / Light shadow
};

/**
 * Отступы и размеры
 * Spacing and sizes
 */
export const spacing = {
    xs: 4 as const,
    sm: 8 as const,
    md: 12 as const,
    lg: 16 as const,
    xl: 20 as const,
    xxl: 24 as const,
    xxxl: 32 as const,
};

/**
 * Скругления для элементов
 * Border radius for elements
 */
export const borderRadius = {
    small: 8 as const,
    medium: 16 as const,
    large: 24 as const,
    xlarge: 32 as const,
    circle: 9999 as const,
};

/**
 * Тени для разных уровней
 * Shadows for different elevation levels
 */
export const shadows = {
    // Очень лёгкая тень / Very light shadow
    soft: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    // Средняя тень / Medium shadow
    medium: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    // Сильная тень для модальных окон / Strong shadow for modals
    large: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
};

/**
 * Типографика / Typography
 */
export const typography = {
    /**
     * Крупный заголовок экрана (32px)
     * Large screen header (32px)
     */
    header: {
        fontSize: 32,
        fontWeight: '700' as const,
        letterSpacing: 0.5,
        color: colors.text,
        lineHeight: 40,
    },
    /**
     * Заголовок второго уровня (22px)
     * Secondary header (22px)
     */
    title: {
        fontSize: 22,
        fontWeight: '600' as const,
        letterSpacing: 0.3,
        color: colors.text,
        lineHeight: 28,
    },
    /**
     * Основной текст (16px)
     * Body text (16px)
     */
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 24,
        color: colors.text,
        letterSpacing: 0.2,
    },
    /**
     * Мелкий текст (13px)
     * Small text (13px)
     */
    caption: {
        fontSize: 13,
        fontWeight: '400' as const,
        color: colors.textSecondary,
        lineHeight: 18,
        letterSpacing: 0.2,
    },
    /**
     * Время сообщения (11px)
     * Message timestamp (11px)
     */
    time: {
        fontSize: 11,
        fontWeight: '500' as const,
        color: colors.textMuted,
        letterSpacing: 0.2,
    },
};

/**
 * Общие стили для переиспользования
 * Common reusable styles
 */
export const commonStyles = StyleSheet.create({
    /**
     * Основной контейнер с фоном
     * Main container with background
     */
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    
    /**
     * Контейнер с градиентом
     * Container with gradient
     */
    gradientContainer: {
        flex: 1,
    },
    
    /**
     * Центрирование контента
     * Content centering
     */
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    /**
     * Основная кнопка с закруглениями и тенью
     * Primary button with rounded corners and shadow
     */
    button: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.xlarge,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.medium,
    },
    
    /**
     * Текст кнопки
     * Button text
     */
    buttonText: {
        color: colors.textLight,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    
    /**
     * Поле ввода с мягкими краями
     * Input field with soft edges
     */
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xlarge,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.backgroundLight,
        fontSize: 16,
        color: colors.text,
        ...shadows.soft,
    },
    
    /**
     * Карточка с тенью и скруглением
     * Card with shadow and rounding
     */
    card: {
        backgroundColor: colors.backgroundLight,
        borderRadius: borderRadius.large,
        padding: spacing.lg,
        ...shadows.soft,
    },
});

export default {
    colors,
    spacing,
    borderRadius,
    shadows,
    typography,
    commonStyles,
    screenWidth,
    screenHeight,
};