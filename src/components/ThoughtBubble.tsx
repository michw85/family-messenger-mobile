/**
 * @file ThoughtBubble.tsx
 * @description Компонент "облако мысли" - основная единица сообщения в чате
 * @description "Thought bubble" component - main unit of chat message
 * 
 * @author Family Messenger Team
 * @version 3.2.0
 * @license MIT
 */

import React, { useEffect, useRef, useMemo } from 'react';
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
    content: string;           // Текст сообщения / Message text
    sender: string;            // Имя отправителя / Sender name
    timestamp: string;         // Время отправки / Timestamp
    isMyMessage: boolean;      // Флаг своего сообщения / Is my message flag
    type?: 'TEXT' | 'IMAGE' | 'VOICE'; // Тип сообщения / Message type
    mediaUrl?: string;         // URL медиафайла / Media file URL
    userColor?: string;        // Цвет текущего пользователя / Current user color
}

/**
 * Генерация уникального цвета для пользователя на основе его имени
 * Generate unique color for user based on their name
 * @param name - Имя пользователя / User name
 * @returns Цвет в формате HEX / Color in HEX format
 */
const getUserColor = (name: string): string => {
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
 * SVG-форма облака для своих сообщений (справа)
 * Cloud shape for my messages (right side)
 */
const MyCloudShape: React.FC<{ width: number; height: number; color: string }> = ({ width, height, color }) => (
    <Svg width={width + 30} height={height + 30} viewBox={`0 0 ${width + 30} ${height + 30}`}>
        <Defs>
            <LinearGradient id="myGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={color} stopOpacity="0.95" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.8" />
            </LinearGradient>
        </Defs>
        
        <Path
            d={`
                M 20 15
                Q 10 15 10 25
                Q 10 35 20 40
                Q 15 50 25 55
                Q 30 70 60 65
                Q 80 85 120 80
                Q 150 95 ${width - 20} 85
                Q ${width + 5} 75 ${width} 60
                Q ${width + 10} 45 ${width} 35
                Q ${width - 5} 20 ${width - 25} 15
                Z
            `}
            fill="url(#myGradient)"
        />
        
        <Circle cx={width - 15} cy={height - 5} r="6" fill={color} opacity="0.8" />
        <Circle cx={width - 8} cy={height} r="4" fill={color} opacity="0.6" />
        <Circle cx={width - 3} cy={height + 4} r="2.5" fill={color} opacity="0.4" />
    </Svg>
);

/**
 * SVG-форма облака для чужих сообщений (слева)
 * Cloud shape for others' messages (left side)
 */
const TheirCloudShape: React.FC<{ width: number; height: number; color: string }> = ({ width, height, color }) => (
    <Svg width={width + 30} height={height + 30} viewBox={`0 0 ${width + 30} ${height + 30}`}>
        <Defs>
            <LinearGradient id="theirGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.08" />
            </LinearGradient>
        </Defs>
        
        <Path
            d={`
                M ${width - 20} 15
                Q ${width - 10} 15 ${width - 10} 25
                Q ${width - 10} 35 ${width - 20} 40
                Q ${width - 15} 50 ${width - 25} 55
                Q ${width - 30} 70 ${width - 60} 65
                Q ${width - 80} 85 ${width - 120} 80
                Q ${width - 150} 95 20 85
                Q 5 75 10 60
                Q 0 45 10 35
                Q 15 20 35 15
                Z
            `}
            fill="url(#theirGradient)"
            stroke={color}
            strokeWidth="1"
            strokeOpacity="0.2"
        />
        
        <Circle cx={25} cy={height - 5} r="6" fill="#FFFFFF" opacity="0.8" stroke={color} strokeWidth="1" strokeOpacity="0.2" />
        <Circle cx={18} cy={height} r="4" fill="#FFFFFF" opacity="0.6" />
        <Circle cx={13} cy={height + 4} r="2.5" fill="#FFFFFF" opacity="0.4" />
    </Svg>
);

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
    userColor,
}) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, tension: 70, friction: 7, useNativeDriver: true }),
        ]).start();
    }, []);

    const bubbleColor = useMemo(() => {
        if (isMyMessage) return userColor || '#6C5CE7';
        return getUserColor(sender);
    }, [isMyMessage, sender, userColor]);

    const dimensions = useMemo(() => {
        if (type === 'IMAGE') return { width: 260, height: 240 };
        if (type === 'VOICE') return { width: 200, height: 70 };
        
        const maxWidth = Math.min(screenWidth * 0.75, 280);
        const charWidth = 6.5;
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
        const textHeight = Math.max(50, lineCount * 22 + 30);
        const textWidth = Math.min(maxWidth, Math.max(...lines.map(l => l.length * charWidth), 80));
        
        return { width: textWidth + 45, height: textHeight };
    }, [content, type]);

    return (
        <Animated.View
            style={[
                styles.wrapper,
                isMyMessage ? styles.myWrapper : styles.theirWrapper,
                {
                    opacity: opacityAnim,
                    transform: [{ scale: scaleAnim }, { translateY: translateY }],
                },
            ]}
        >
            <View style={styles.svgContainer} pointerEvents="none">
                {isMyMessage ? (
                    <MyCloudShape width={dimensions.width} height={dimensions.height} color={bubbleColor} />
                ) : (
                    <TheirCloudShape width={dimensions.width} height={dimensions.height} color={bubbleColor} />
                )}
            </View>

            <View
                style={[
                    styles.contentOverlay,
                    {
                        width: dimensions.width - 25,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                    },
                    isMyMessage ? styles.myContentAlign : styles.theirContentAlign,
                ]}
            >
                {!isMyMessage && (
                    <Text style={[styles.senderName, { color: bubbleColor }]}>
                        {sender || 'Семья'}
                    </Text>
                )}

                {type === 'IMAGE' && mediaUrl ? (
                    <Image source={{ uri: mediaUrl }} style={styles.image} />
                ) : type === 'VOICE' ? (
                    <View style={styles.voiceRow}>
                        <Text style={styles.voiceIcon}>🎙️</Text>
                        <Text style={[styles.voiceText, isMyMessage && styles.myText]}>
                            Голосовое сообщение
                        </Text>
                    </View>
                ) : (
                    <Text style={[styles.messageText, isMyMessage && styles.myText]}>
                        {content}
                    </Text>
                )}
            </View>
            
            <Text style={[styles.timestamp, isMyMessage ? styles.timestampRight : styles.timestampLeft]}>
                {timestamp}
            </Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: { marginBottom: 24, position: 'relative' },
    myWrapper: { alignSelf: 'flex-end', marginRight: 8 },
    theirWrapper: { alignSelf: 'flex-start', marginLeft: 8 },
    svgContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    contentOverlay: { zIndex: 2 },
    myContentAlign: { alignItems: 'flex-end' },
    theirContentAlign: { alignItems: 'flex-start' },
    senderName: { fontSize: 11, fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 },
    messageText: { fontSize: 15, lineHeight: 22, color: '#2C3E50', letterSpacing: 0.2, flexShrink: 1, flexWrap: 'wrap' },
    myText: { color: '#FFFFFF' },
    timestamp: { fontSize: 10, fontWeight: '500', marginTop: 4, color: '#1A252F', letterSpacing: 0.2 },
    timestampLeft: { marginLeft: 36 },
    timestampRight: { marginRight: 36, textAlign: 'right' },
    image: { width: 220, height: 220, borderRadius: 16, marginVertical: 4 },
    voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    voiceIcon: { fontSize: 22 },
    voiceText: { fontSize: 14, color: '#7F8C8D' },
});

export default ThoughtBubble;