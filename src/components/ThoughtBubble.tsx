/**
 * @file ThoughtBubble.tsx
 * @description Компонент "облако мысли" с правильной анимацией пузырьков
 * @description "Thought bubble" component with proper bubble animation
 * 
 * @author Family Messenger Team
 * @version 5.3.0
 * @license MIT
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Animated, 
    Image, 
    Dimensions 
} from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Интерфейс пропсов компонента ThoughtBubble
 * ThoughtBubble component props interface
 */
interface ThoughtBubbleProps {
    content: string;
    sender: string;
    timestamp: string;
    isMyMessage: boolean;
    type?: 'TEXT' | 'IMAGE' | 'VOICE';
    mediaUrl?: string;
    userColor?: string;
}

/**
 * Генерация акцентного цвета для имени отправителя
 * Generate accent color for sender name
 * @param name - Имя пользователя / User name
 * @returns Цвет в формате HEX / Color in HEX format
 */
const getAccentColor = (name: string): string => {
    const colorPalette = [
        '#6C5CE7', '#00CEC9', '#FF7675', '#74B9FF', '#A29BFE',
        '#FD79A8', '#55EFC4', '#0984E3', '#D63031', '#00B894',
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colorPalette[Math.abs(hash) % colorPalette.length];
};

/**
 * Компонент пузырька с анимацией через useState
 * Bubble component with animation via useState
 * Использует простые таймеры для последовательного появления
 * Uses simple timers for sequential appearance
 */
const AnimatedBubble: React.FC<{
    cx: number;
    cy: number;
    r: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    delay: number;
}> = ({ cx, cy, r, fill, stroke, strokeWidth, delay }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    if (!visible) return null;

    return (
        <Circle
            cx={cx}
            cy={cy}
            r={r}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
        />
    );
};

/**
 * Главный компонент облака мысли
 * Main thought bubble component
 */
const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({
    content,
    sender,
    timestamp,
    isMyMessage,
    type = 'TEXT',
    mediaUrl,
}) => {
    // ==================== АНИМАЦИИ / ANIMATIONS ====================
    
    // Основная анимация облака / Main cloud animation
    const mainAnimation = useRef(new Animated.Value(0)).current;
    
    // Анимация мерцания (подсветка после появления)
    // Shimmer animation (highlight after appearance)
    const shimmerAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Основная анимация облака / Main cloud animation
        Animated.spring(mainAnimation, {
            toValue: 1,
            tension: 65,
            friction: 7,
            useNativeDriver: true,
        }).start();

        // Анимация мерцания / Shimmer animation
        Animated.sequence([
            Animated.delay(500),
            Animated.timing(shimmerAnimation, { toValue: 1, duration: 300, useNativeDriver: false }),
            Animated.timing(shimmerAnimation, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ]).start();
    }, []);

    // Интерполяция значений / Value interpolation
    const scale = mainAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
    const opacity = mainAnimation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.7, 1] });
    const translateY = mainAnimation.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
    const rotate = mainAnimation.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '0deg'] });
    
    const shimmerBackground = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0)', 'rgba(255,245,180,0.35)'],
    });

    const accentColor = useMemo(() => getAccentColor(sender), [sender]);

    /**
     * Расчёт размеров облака на основе длины текста
     * Calculate cloud size based on text length
     */
    const dimensions = useMemo(() => {
        if (type === 'IMAGE') return { width: 320, height: 340, contentWidth: 280, contentHeight: 280 };
        if (type === 'VOICE') return { width: 280, height: 110, contentWidth: 240, contentHeight: 70 };
        
        const maxWidth = Math.min(screenWidth * 0.75, 300);
        const charWidth = 7.5;
        const maxCharsPerLine = Math.floor(maxWidth / charWidth);
        
        const wrapText = (text: string, maxLength: number): string[] => {
            const words = text.split(' ');
            const lines: string[] = [];
            let currentLine = '';
            
            for (const word of words) {
                if (word.length > maxLength) {
                    if (currentLine) lines.push(currentLine);
                    for (let i = 0; i < word.length; i += maxLength) {
                        lines.push(word.substr(i, maxLength));
                    }
                    currentLine = '';
                } else if ((currentLine + ' ' + word).length <= maxLength) {
                    currentLine = currentLine ? `${currentLine} ${word}` : word;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            }
            if (currentLine) lines.push(currentLine);
            return lines;
        };
        
        const lines = wrapText(content, maxCharsPerLine);
        const lineCount = Math.max(1, lines.length);
        const textHeight = Math.max(60, lineCount * 24 + 20);
        const textWidth = Math.min(maxWidth, Math.max(...lines.map(l => l.length * charWidth), 80));
        
        return { 
            width: textWidth + 60,
            height: textHeight + 60,
            contentWidth: textWidth + 20,
            contentHeight: textHeight + 10,
        };
    }, [content, type]);

    /**
     * Получение позиций пузырьков хвостика
     * Get bubble trail positions
     */
    const getTrailPositions = () => {
        const { width, height } = dimensions;
        if (isMyMessage) {
            return {
                bubble1: { cx: width - 18, cy: height - 5, r: 11, delay: 0 },
                bubble2: { cx: width - 10, cy: height + 3, r: 8, delay: 100 },
                bubble3: { cx: width - 4, cy: height + 9, r: 5.5, delay: 200 },
                bubble4: { cx: width, cy: height + 14, r: 3.5, delay: 300 },
            };
        } else {
            return {
                bubble1: { cx: 32, cy: height - 5, r: 11, delay: 0 },
                bubble2: { cx: 24, cy: height + 3, r: 8, delay: 100 },
                bubble3: { cx: 18, cy: height + 9, r: 5.5, delay: 200 },
                bubble4: { cx: 14, cy: height + 14, r: 3.5, delay: 300 },
            };
        }
    };

    const trail = getTrailPositions();
    
    /**
     * Получение пути облака
     * Get cloud path
     */
    const getCloudPath = () => {
        const { width, height } = dimensions;
        if (isMyMessage) {
            return `
                M 32 20
                Q 16 20 16 35
                Q 16 52 32 62
                Q 26 78 42 88
                Q 52 108 96 100
                Q 130 125 190 115
                Q 235 135 ${width - 30} 120
                Q ${width + 12} 105 ${width + 8} 85
                Q ${width + 22} 60 ${width + 8} 45
                Q ${width - 12} 25 ${width - 32} 20
                Z
            `;
        } else {
            return `
                M ${width - 32} 20
                Q ${width - 16} 20 ${width - 16} 35
                Q ${width - 16} 52 ${width - 32} 62
                Q ${width - 26} 78 ${width - 42} 88
                Q ${width - 52} 108 ${width - 96} 100
                Q ${width - 130} 125 ${width - 190} 115
                Q ${width - 235} 135 30 120
                Q -12 105 -8 85
                Q -22 60 -8 45
                Q 12 25 32 20
                Z
            `;
        }
    };

    const cloudPath = getCloudPath();
    const gradientId = isMyMessage ? 'myGradient' : 'theirGradient';

    return (
        <Animated.View
            style={[
                styles.wrapper,
                isMyMessage ? styles.myWrapper : styles.theirWrapper,
                {
                    opacity: opacity,
                    transform: [
                        { scale: scale },
                        { translateY: translateY },
                        { rotate: rotate },
                    ],
                },
            ]}
        >
            <Animated.View style={{ backgroundColor: shimmerBackground, borderRadius: 40 }}>
                {/* SVG фон облака / SVG cloud background */}
                <View style={styles.svgWrapper}>
                    <Svg width={dimensions.width + 10} height={dimensions.height + 15} viewBox={`0 0 ${dimensions.width + 10} ${dimensions.height + 15}`}>
                        <Defs>
                            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                                <Stop offset="100%" stopColor="#F5F0EB" stopOpacity="0.95" />
                            </LinearGradient>
                        </Defs>
                        
                        {/* Тень облака / Cloud shadow */}
                        <Path
                            d={cloudPath}
                            fill="rgba(0,0,0,0.06)"
                            transform={`translate(${isMyMessage ? 3 : -3}, 4)`}
                        />
                        
                        {/* Основное облако / Main cloud */}
                        <Path
                            d={cloudPath}
                            fill={`url(#${gradientId})`}
                            stroke="#E8E8E8"
                            strokeWidth="0.8"
                        />
                        
                        {/* Пузырьки хвостика с последовательной анимацией / Trail bubbles with sequential animation */}
                        <AnimatedBubble
                            cx={trail.bubble1.cx}
                            cy={trail.bubble1.cy}
                            r={trail.bubble1.r}
                            fill="#FFFFFF"
                            stroke="#E8E8E8"
                            strokeWidth={0.8}
                            delay={trail.bubble1.delay}
                        />
                        <AnimatedBubble
                            cx={trail.bubble2.cx}
                            cy={trail.bubble2.cy}
                            r={trail.bubble2.r}
                            fill="#FFFFFF"
                            delay={trail.bubble2.delay}
                        />
                        <AnimatedBubble
                            cx={trail.bubble3.cx}
                            cy={trail.bubble3.cy}
                            r={trail.bubble3.r}
                            fill="#FFFFFF"
                            delay={trail.bubble3.delay}
                        />
                        <AnimatedBubble
                            cx={trail.bubble4.cx}
                            cy={trail.bubble4.cy}
                            r={trail.bubble4.r}
                            fill="#FFFFFF"
                            delay={trail.bubble4.delay}
                        />
                    </Svg>
                </View>
                
                {/* Контент поверх SVG (правильно позиционированный) / Content over SVG (properly positioned) */}
                <View style={[
                    styles.contentContainer,
                    {
                        width: dimensions.contentWidth,
                        minHeight: dimensions.contentHeight,
                        marginTop: 18,
                        marginBottom: 12,
                        marginLeft: isMyMessage ? 20 : 25,
                        marginRight: isMyMessage ? 25 : 20,
                    }
                ]}>
                    {/* Имя отправителя (только для чужих сообщений) / Sender name (only for others) */}
                    {!isMyMessage && (
                        <Text style={[styles.senderName, { color: accentColor }]}>
                            {sender || 'Семья / Family'}
                        </Text>
                    )}

                    {/* Контент в зависимости от типа сообщения / Content based on message type */}
                    {type === 'IMAGE' && mediaUrl ? (
                        <Image source={{ uri: mediaUrl }} style={styles.image} />
                    ) : type === 'VOICE' ? (
                        <View style={styles.voiceRow}>
                            <Text style={styles.voiceIcon}>🎙️</Text>
                            <Text style={styles.voiceText}>
                                Голосовое сообщение / Voice message
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.messageText}>
                            {content}
                        </Text>
                    )}
                </View>
            </Animated.View>
            
            {/* Время отправки под облаком / Timestamp under cloud */}
            <Text style={[styles.timestamp, isMyMessage ? styles.timestampRight : styles.timestampLeft]}>
                {timestamp}
            </Text>
        </Animated.View>
    );
};

/**
 * Стили компонента ThoughtBubble
 * ThoughtBubble component styles
 */
const styles = StyleSheet.create({
    // Обёртка сообщения / Message wrapper
    wrapper: {
        marginBottom: 32,
    },
    // Своё сообщение (справа) / My message (right side)
    myWrapper: {
        alignSelf: 'flex-end',
        marginRight: 8,
    },
    // Чужое сообщение (слева) / Their message (left side)
    theirWrapper: {
        alignSelf: 'flex-start',
        marginLeft: 8,
    },
    // Обёртка для SVG / SVG wrapper
    svgWrapper: {
        position: 'relative',
    },
    // Контейнер для контента (поверх SVG) / Content container (over SVG)
    contentContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    // Имя отправителя / Sender name
    senderName: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    // Текст сообщения / Message text
    messageText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#2C3E50',
        letterSpacing: 0.2,
        flexWrap: 'wrap',
    },
    // Время отправки / Timestamp
    timestamp: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 6,
        color: '#7F8C8D',
        letterSpacing: 0.2,
    },
    // Время слева для чужих сообщений / Left timestamp for others
    timestampLeft: {
        marginLeft: 20,
    },
    // Время справа для своих сообщений / Right timestamp for my messages
    timestampRight: {
        marginRight: 20,
        textAlign: 'right',
    },
    // Изображение в сообщении / Image in message
    image: {
        width: 260,
        height: 260,
        borderRadius: 18,
        marginVertical: 4,
    },
    // Контейнер для голосового сообщения / Voice message container
    voiceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    voiceIcon: {
        fontSize: 22,
    },
    voiceText: {
        fontSize: 15,
        color: '#2C3E50',
    },
});

export default ThoughtBubble;