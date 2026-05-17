/**
 * @file ThoughtBubble.tsx
 * @description Компонент "облако мысли" с SVG-формой и анимацией
 * @description "Thought bubble" component with SVG shape and animation
 * 
 * @author Family Messenger Team
 * @version 3.7.0
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

interface ThoughtBubbleProps {
    content: string;
    sender: string;
    timestamp: string;
    isMyMessage: boolean;
    type?: 'TEXT' | 'IMAGE' | 'VOICE';
    mediaUrl?: string;
    userColor?: string;
}

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

const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({
    content,
    sender,
    timestamp,
    isMyMessage,
    type = 'TEXT',
    mediaUrl,
}) => {
    // Создаём анимационные значения
    const animation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Запускаем анимацию при монтировании
        Animated.spring(animation, {
            toValue: 1,
            tension: 70,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, []);

    // Интерполяция значений для различных трансформаций
    const scale = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
    });
    
    const opacity = animation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.7, 1],
    });
    
    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [30, 0],
    });
    
    const rotate = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['-3deg', '0deg'],
    });
    
    // Анимация для пузырьков
    const bubble1Scale = animation.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [0, 0.5, 1],
    });
    
    const bubble2Scale = animation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.6, 1],
    });
    
    const bubble3Scale = animation.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [0, 0.7, 1],
    });
    
    const bubble4Scale = animation.interpolate({
        inputRange: [0, 0.9, 1],
        outputRange: [0, 0.8, 1],
    });

    const accentColor = useMemo(() => getAccentColor(sender), [sender]);

    const dimensions = useMemo(() => {
        if (type === 'IMAGE') return { width: 250, height: 250 };
        if (type === 'VOICE') return { width: 200, height: 70 };
        
        const maxWidth = Math.min(screenWidth * 0.7, 270);
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
        const textHeight = Math.max(55, lineCount * 22 + 25);
        const textWidth = Math.min(maxWidth, Math.max(...lines.map(l => l.length * charWidth), 70));
        
        return { width: textWidth + 35, height: textHeight };
    }, [content, type]);

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
            <View style={styles.svgContainer} pointerEvents="none">
                {isMyMessage ? (
                    <MyCloudShape width={dimensions.width} height={dimensions.height} />
                ) : (
                    <TheirCloudShape width={dimensions.width} height={dimensions.height} />
                )}
            </View>
            
            <Animated.View style={[styles.trailBubble1, isMyMessage ? styles.trailRight1 : styles.trailLeft1, { transform: [{ scale: bubble1Scale }] }]} />
            <Animated.View style={[styles.trailBubble2, isMyMessage ? styles.trailRight2 : styles.trailLeft2, { transform: [{ scale: bubble2Scale }] }]} />
            <Animated.View style={[styles.trailBubble3, isMyMessage ? styles.trailRight3 : styles.trailLeft3, { transform: [{ scale: bubble3Scale }] }]} />
            <Animated.View style={[styles.trailBubble4, isMyMessage ? styles.trailRight4 : styles.trailLeft4, { transform: [{ scale: bubble4Scale }] }]} />

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
            
            <Text style={[styles.timestamp, isMyMessage ? styles.timestampRight : styles.timestampLeft]}>
                {timestamp}
            </Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 24,
        position: 'relative',
    },
    myWrapper: {
        alignSelf: 'flex-end',
        marginRight: 8,
    },
    theirWrapper: {
        alignSelf: 'flex-start',
        marginLeft: 8,
    },
    svgContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    contentOverlay: {
        zIndex: 2,
    },
    myContentAlign: {
        alignItems: 'flex-end',
    },
    theirContentAlign: {
        alignItems: 'flex-start',
    },
    senderName: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#2C3E50',
        letterSpacing: 0.2,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    timestamp: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 6,
        color: '#7F8C8D',
        letterSpacing: 0.2,
    },
    timestampLeft: {
        marginLeft: 20,
    },
    timestampRight: {
        marginRight: 20,
        textAlign: 'right',
    },
    image: {
        width: 200,
        height: 200,
        borderRadius: 16,
        marginVertical: 4,
    },
    voiceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    voiceIcon: {
        fontSize: 22,
    },
    voiceText: {
        fontSize: 14,
        color: '#2C3E50',
    },
    trailBubble1: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 0.5,
        borderColor: '#E8E8E8',
        opacity: 0.95,
    },
    trailBubble2: {
        position: 'absolute',
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: '#FFFFFF',
        opacity: 0.85,
    },
    trailBubble3: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
        opacity: 0.7,
    },
    trailBubble4: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FFFFFF',
        opacity: 0.5,
    },
    trailRight1: { bottom: -8, right: 10 },
    trailRight2: { bottom: -15, right: 5 },
    trailRight3: { bottom: -21, right: 2 },
    trailRight4: { bottom: -26, right: 0 },
    trailLeft1: { bottom: -8, left: 10 },
    trailLeft2: { bottom: -15, left: 5 },
    trailLeft3: { bottom: -21, left: 2 },
    trailLeft4: { bottom: -26, left: 0 },
});

export default ThoughtBubble;