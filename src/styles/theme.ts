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
 * Цветовая схема приложения Bonds (светлая тема)
 * Bonds application color scheme (light theme)
 *
 * Основная идея: тёплый дом, уют, доверие, связь (bonds)
 * Main idea: warm home, coziness, trust, connection (bonds)
 */
export const lightColors = {
    // Основные цвета / Primary colors
    primary: '#2C3E7A' as const,           // Глубокий индиго – символ стабильности и связи / Deep indigo – symbol of stability and connection
    primaryLight: '#4A6FA5' as const,      // Светлый индиго для второстепенных элементов / Light indigo for secondary elements
    primaryDark: '#1A2530' as const,       // Тёмный акцент для текста / Dark accent for text

    // Акцентный цвет / Accent color
    accent: '#D4AF37' as const,            // Мягкое золото – теплота и ценность отношений / Soft gold – warmth and value of relationships
    accentLight: '#F0E0B8' as const,       // Светлое золото для фонов и подсветок / Light gold for backgrounds and highlights

    // Отдельный цвет для аватарки блокнот-чата - визуально отличается от
    // обычных личных/групповых чатов (тёплое золото), чтобы он выделялся
    // в списке чатов на глаз, а не только иконкой
    // A separate color for the notebook chat's avatar - visually distinct
    // from regular personal/group chats (warm gold), so it stands out in
    // the chat list at a glance, not just via its icon
    notebookAccent: '#4A9B8E' as const,
    notebookAccentLight: '#D6ECE8' as const,

    // Фоновые цвета / Background colors
    background: '#FDF8F0' as const,        // Тёплый кремовый – основа уюта / Warm cream – foundation of coziness
    backgroundLight: '#FFFFFF' as const,   // Белый для карточек и полей / White for cards and fields
    backgroundWarm: '#F5E6CA' as const,    // Тёплый бежевый для облаков сообщений / Warm beige for message bubbles
    backgroundGradient: ['#FDF8F0', '#F5E6CA', '#E8D5B8'] as const, // Градиент фона / Background gradient

    // Облако "моего" сообщения (заметно темнее фона, чтобы не сливалось) /
    // "My message" cloud (noticeably darker than the background so it doesn't blend in)
    myBubbleGradient: ['#EDD9A8', '#D9BF95'] as const,
    // Облако сообщения собеседника / Other person's message cloud
    theirBubbleGradient: ['#FFFFFF', '#F5E6CA'] as const,

    // Цвета сообщений / Message colors
    myMessage: '#2C3E7A' as const,         // Мои сообщения – глубокий синий / My messages – deep blue
    theirMessage: '#44b054' as const,      // Сообщения других – тёплый бежевый / Others' messages – warm beige

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

    placeholder: '#A0B0C0' as const,

    // Полупрозрачные "пилюли" для кнопок поверх градиентного фона /
    // Translucent "pill" backgrounds for buttons over the gradient background
    pillBackground: 'rgba(255, 255, 255, 0.8)' as const,
    subtleOverlay: 'rgba(0, 0, 0, 0.05)' as const,

    // Полупрозрачные панели шапки/инпута поверх градиента чата /
    // Translucent header/input panels over the chat gradient
    panelBackground: 'rgba(255, 248, 240, 0.85)' as const,
    panelBackgroundSolid: 'rgba(255, 248, 240, 0.96)' as const,
    iconButtonBackground: '#F5F0EA' as const,
    recordingActiveBackground: '#FFE8E0' as const,

    statusBarStyle: 'dark' as const,
};

/**
 * Тёмная тема - та же структура, приглушённые тёплые акценты на глубоком
 * тёмно-синем фоне вместо кремового
 * Dark theme - same shape, muted warm accents on a deep navy background
 * instead of cream
 */
export const darkColors = {
    primary: '#8AA0E6' as const,
    primaryLight: '#A9BAF0' as const,
    primaryDark: '#2C3E7A' as const,

    accent: '#E0BE5C' as const,
    accentLight: '#3A3320' as const,

    notebookAccent: '#5FC9BA' as const,
    notebookAccentLight: '#1E3A36' as const,

    background: '#14151F' as const,
    backgroundLight: '#1E2030' as const,
    backgroundWarm: '#242742' as const,
    backgroundGradient: ['#14151F', '#191B2A', '#20233A'] as const,

    myBubbleGradient: ['#31447F', '#212E5C'] as const,
    theirBubbleGradient: ['#2A2D3D', '#20222E'] as const,

    myMessage: '#8AA0E6' as const,
    theirMessage: '#5FBE73' as const,

    text: '#EDEFF5' as const,
    textLight: '#FFFFFF' as const,
    textSecondary: '#A7B0C0' as const,
    textMuted: '#6B7280' as const,
    textDark: '#0D1B2A' as const,

    online: '#4CAF50' as const,
    offline: '#5A6472' as const,
    typing: '#8AA0E6' as const,

    border: 'rgba(255, 255, 255, 0.08)' as const,
    borderLight: 'rgba(255, 255, 255, 0.04)' as const,

    shadow: 'rgba(0, 0, 0, 0.4)' as const,
    shadowLight: 'rgba(0, 0, 0, 0.2)' as const,

    placeholder: '#5C6472' as const,

    pillBackground: 'rgba(255, 255, 255, 0.08)' as const,
    subtleOverlay: 'rgba(255, 255, 255, 0.08)' as const,

    panelBackground: 'rgba(30, 32, 48, 0.85)' as const,
    panelBackgroundSolid: 'rgba(30, 32, 48, 0.96)' as const,
    iconButtonBackground: '#2A2D3D' as const,
    recordingActiveBackground: '#4A2A28' as const,

    statusBarStyle: 'light' as const,
};

/**
 * Общая форма палитры (не строгие литералы, чтобы light/dark можно было
 * взаимозаменять по типу)
 * Common palette shape (widened, not strict literals, so light/dark are
 * interchangeable by type)
 */
export interface AppColors {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    accentLight: string;
    notebookAccent: string;
    notebookAccentLight: string;
    background: string;
    backgroundLight: string;
    backgroundWarm: string;
    backgroundGradient: readonly string[];
    myBubbleGradient: readonly string[];
    theirBubbleGradient: readonly string[];
    myMessage: string;
    theirMessage: string;
    text: string;
    textLight: string;
    textSecondary: string;
    textMuted: string;
    textDark: string;
    online: string;
    offline: string;
    typing: string;
    border: string;
    borderLight: string;
    shadow: string;
    shadowLight: string;
    placeholder: string;
    pillBackground: string;
    subtleOverlay: string;
    panelBackground: string;
    panelBackgroundSolid: string;
    iconButtonBackground: string;
    recordingActiveBackground: string;
    statusBarStyle: 'light' | 'dark';
}

/**
 * Цвета текущей (по умолчанию светлой) темы - для файлов/стилей, ещё не
 * переведённых на useTheme(). Как только экран переходит на useTheme(),
 * он берёт colors оттуда, а не отсюда.
 * Current (default light) theme colors - for files/styles not yet migrated
 * to useTheme(). Once a screen switches to useTheme(), it reads colors from
 * there instead of here.
 */
export const colors = lightColors;

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