/**
 * @file ThoughtBubble.tsx
 * @description Компонент "облако мысли" с поддержкой фото и голоса
 * @description "Thought bubble" component with photo and voice support
 * 
 * @author Family Messenger Team
 * @version 6.0.0
 * @license MIT
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Animated, 
    Image, 
    Dimensions,
    TouchableOpacity,
    Linking,
    Alert,
} from 'react-native';
import { Audio } from 'expo-av';
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
 * SVG-форма облака для своих сообщений (справа)
 * Cloud shape for my messages (right side)
 */
const MyCloudShape: React.FC<{ width: number; height: number }> = ({ width, height }) => (
    <Svg width={width + 35} height={height + 35} viewBox={`0 0 ${width + 35} ${height + 35}`}>
        <Defs>
            <LinearGradient id="myGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="100%" stopColor="#F5F0EB" stopOpacity="0.95" />
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
                Q 150 95 ${width - 15} 85
                Q ${width + 5} 75 ${width} 60
                Q ${width + 10} 45 ${width} 35
                Q ${width - 5} 20 ${width - 20} 15
                Z
            `}
            fill="rgba(0,0,0,0.06)"
            transform="translate(2, 3)"
        />
        
        <Path
            d={`
                M 20 15
                Q 10 15 10 25
                Q 10 35 20 40
                Q 15 50 25 55
                Q 30 70 60 65
                Q 80 85 120 80
                Q 150 95 ${width - 15} 85
                Q ${width + 5} 75 ${width} 60
                Q ${width + 10} 45 ${width} 35
                Q ${width - 5} 20 ${width - 20} 15
                Z
            `}
            fill="url(#myGradient)"
            stroke="#E8E8E8"
            strokeWidth="0.5"
        />
        
        <Circle cx={width - 12} cy={height - 2} r="7" fill="#FFFFFF" opacity="0.95" stroke="#E8E8E8" strokeWidth="0.5" />
        <Circle cx={width - 5} cy={height + 4} r="5" fill="#FFFFFF" opacity="0.85" />
        <Circle cx={width} cy={height + 9} r="3.5" fill="#FFFFFF" opacity="0.7" />
        <Circle cx={width + 3} cy={height + 13} r="2" fill="#FFFFFF" opacity="0.5" />
    </Svg>
);

/**
 * SVG-форма облака для чужих сообщений (слева)
 * Cloud shape for others' messages (left side)
 */
const TheirCloudShape: React.FC<{ width: number; height: number }> = ({ width, height }) => (
    <Svg width={width + 35} height={height + 35} viewBox={`0 0 ${width + 35} ${height + 35}`}>
        <Defs>
            <LinearGradient id="theirGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="100%" stopColor="#F5F0EB" stopOpacity="0.95" />
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
                Q ${width - 150} 95 15 85
                Q 5 75 10 60
                Q 0 45 10 35
                Q 15 20 20 15
                Z
            `}
            fill="rgba(0,0,0,0.06)"
            transform="translate(-2, 3)"
        />
        
        <Path
            d={`
                M ${width - 20} 15
                Q ${width - 10} 15 ${width - 10} 25
                Q ${width - 10} 35 ${width - 20} 40
                Q ${width - 15} 50 ${width - 25} 55
                Q ${width - 30} 70 ${width - 60} 65
                Q ${width - 80} 85 ${width - 120} 80
                Q ${width - 150} 95 15 85
                Q 5 75 10 60
                Q 0 45 10 35
                Q 15 20 20 15
                Z
            `}
            fill="url(#theirGradient)"
            stroke="#E8E8E8"
            strokeWidth="0.5"
        />
        
        <Circle cx={22} cy={height - 2} r="7" fill="#FFFFFF" opacity="0.95" stroke="#E8E8E8" strokeWidth="0.5" />
        <Circle cx={15} cy={height + 4} r="5" fill="#FFFFFF" opacity="0.85" />
        <Circle cx={10} cy={height + 9} r="3.5" fill="#FFFFFF" opacity="0.7" />
        <Circle cx={7} cy={height + 13} r="2" fill="#FFFFFF" opacity="0.5" />
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
    // Анимации (сохранены из предыдущей версии)
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(30)).current;

    // Состояния для голоса
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, tension: 70, friction: 7, useNativeDriver: true }),
        ]).start();
    }, []);

    // Очистка звука при размонтировании
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const bubbleColor = useMemo(() => {
        if (isMyMessage) return userColor || '#6C5CE7';
        return getAccentColor(sender);
    }, [isMyMessage, sender, userColor]);

    const accentColor = useMemo(() => getAccentColor(sender), [sender]);

    /**
     * Воспроизведение голосового сообщения
     * Play voice message
     */
    const playVoice = async (url: string) => {
        if (!url) {
            Alert.alert('Ошибка', 'Ссылка на аудио отсутствует');
            return;
        }

        try {
            // Если звук уже играет – останавливаем
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
                setIsPlaying(false);
                return;
            }

            // Создаём новый звук
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true }
            );
            setSound(newSound);
            setIsPlaying(true);

            // Следим за окончанием воспроизведения (исправленный блок)
            newSound.setOnPlaybackStatusUpdate((status) => {
                // Проверяем, что статус загружен и воспроизведение завершилось
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                    setSound(null);
                }
            });
        } catch (error) {
            console.error('Failed to play voice', error);
            Alert.alert('Ошибка', 'Не удалось воспроизвести голосовое сообщение');
        }
    };

    /**
     * Расчёт размеров облака
     * Calculate cloud size
     */
    const dimensions = useMemo(() => {
        if (type === 'IMAGE') return { width: 260, height: 240 };
        if (type === 'VOICE') return { width: 220, height: 80 };
        
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

    // Интерполяция
    const scale = scaleAnim;
    const opacity = opacityAnim;
    const translateYVal = translateY;

    return (
        <Animated.View
            style={[
                styles.wrapper,
                isMyMessage ? styles.myWrapper : styles.theirWrapper,
                {
                    opacity: opacity,
                    transform: [
                        { scale: scale },
                        { translateY: translateYVal },
                    ],
                },
            ]}
        >
            <View style={styles.svgContainer} pointerEvents="none">
                {isMyMessage ? (
                    <MyCloudShape width={dimensions.width} height={dimensions.height} />
                ) : (
                    <TheirCloudShape width={dimensions.width} height={dimensions.height} />
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
                    <Text style={[styles.senderName, { color: accentColor }]}>
                        {sender || 'Семья / Family'}
                    </Text>
                )}

                {type === 'IMAGE' && mediaUrl ? (
                    <TouchableOpacity onPress={() => Linking.openURL(mediaUrl)}>
                        <Image source={{ uri: mediaUrl }} style={styles.image} />
                    </TouchableOpacity>
                ) : type === 'VOICE' ? (
                    <TouchableOpacity 
                        onPress={() => playVoice(mediaUrl || '')} 
                        style={styles.voiceRow}
                        activeOpacity={0.7}
                        disabled={!mediaUrl}
                    >
                        <Text style={styles.voiceIcon}>{isPlaying ? '⏹️' : '▶️'}</Text>
                        <Text style={[styles.voiceText, isMyMessage && styles.voiceTextMy]}>
                            {isPlaying ? 'Остановить' : 'Голосовое сообщение'}
                        </Text>
                    </TouchableOpacity>
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

/**
 * Стили компонента ThoughtBubble
 * ThoughtBubble component styles
 */
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
    myText: { color: '#2C3E50' },
    timestamp: { fontSize: 10, fontWeight: '500', marginTop: 6, color: '#7F8C8D', letterSpacing: 0.2 },
    timestampLeft: { marginLeft: 20 },
    timestampRight: { marginRight: 20, textAlign: 'right' },
    image: { width: 200, height: 200, borderRadius: 16, marginVertical: 4 },
    voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    voiceIcon: { fontSize: 22 },
    voiceText: { fontSize: 14, color: '#2C3E50' },
    voiceTextMy: { color: '#2C3E50' },
});

export default ThoughtBubble;