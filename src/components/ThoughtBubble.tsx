/**
 * @file ThoughtBubble.tsx
 * @description Компонент "облако мысли" с анимацией появления пузырьков и подсветкой
 * @description "Thought bubble" component with bubble appearance animation and highlight
 * 
 * @author Family Messenger Team
 * @version 3.0.0
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

interface ThoughtBubbleProps {
    content: string;
    sender: string;
    timestamp: string;
    isMyMessage: boolean;
    type?: 'TEXT' | 'IMAGE' | 'VOICE';
    mediaUrl?: string;
    userColor?: string;
}

const getUserColor = (name: string): string => {
    const colors = [
        '#6C5CE7', '#00CEC9', '#FF7675', '#74B9FF', '#A29BFE',
        '#FD79A8', '#55EFC4', '#0984E3', '#D63031', '#00B894',
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const MyCloudShape = ({ width, height, color }: { width: number; height: number; color: string }) => (
    <Svg width={width + 30} height={height + 35} viewBox={`0 0 ${width + 30} ${height + 35}`}>
        <Defs>
            <LinearGradient id="myGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={color} stopOpacity="0.95" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.8" />
            </LinearGradient>
        </Defs>
        
        <Path
            d={`
                M 25 ${height - 10}
                C 10 ${height - 10} 5 ${height - 30} 10 ${height - 50}
                C 5 ${height - 70} 20 ${height - 80} 30 ${height - 90}
                C 25 ${height - 110} 50 ${height - 115} 70 ${height - 105}
                C 80 ${height - 130} 110 ${height - 135} 140 ${height - 120}
                C 160 ${height - 145} 200 ${height - 140} ${width - 30} ${height - 125}
                C ${width + 5} ${height - 115} ${width + 10} ${height - 90} ${width} ${height - 70}
                C ${width + 10} ${height - 50} ${width + 5} ${height - 25} ${width - 20} ${height - 10}
                Z
            `}
            fill="url(#myGradient)"
        />
        
        <Circle cx={width - 15} cy={height + 5} r="8" fill={color} opacity="0.9" />
        <Circle cx={width - 5} cy={height + 16} r="6" fill={color} opacity="0.7" />
        <Circle cx={width + 3} cy={height + 25} r="4" fill={color} opacity="0.5" />
    </Svg>
);

const TheirCloudShape = ({ width, height, color }: { width: number; height: number; color: string }) => (
    <Svg width={width + 30} height={height + 35} viewBox={`0 0 ${width + 30} ${height + 35}`}>
        <Defs>
            <LinearGradient id="theirGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.08" />
            </LinearGradient>
        </Defs>
        
        <Path
            d={`
                M ${width - 25} ${height - 10}
                C ${width - 10} ${height - 10} ${width - 5} ${height - 30} ${width - 10} ${height - 50}
                C ${width - 5} ${height - 70} ${width - 20} ${height - 80} ${width - 30} ${height - 90}
                C ${width - 25} ${height - 110} ${width - 50} ${height - 115} ${width - 70} ${height - 105}
                C ${width - 80} ${height - 130} ${width - 110} ${height - 135} ${width - 140} ${height - 120}
                C ${width - 160} ${height - 145} ${width - 200} ${height - 140} 25 ${height - 125}
                C ${-5} ${height - 115} ${-10} ${height - 90} 0 ${height - 70}
                C ${-10} ${height - 50} ${-5} ${height - 25} 20 ${height - 10}
                Z
            `}
            fill="url(#theirGradient)"
            stroke={color}
            strokeWidth="1.5"
            strokeOpacity="0.3"
        />
        
        <Circle cx={25} cy={height + 5} r="8" fill="#FFFFFF" opacity="0.95" stroke={color} strokeWidth="1.5" strokeOpacity="0.3" />
        <Circle cx={15} cy={height + 16} r="6" fill="#FFFFFF" opacity="0.8" />
        <Circle cx={7} cy={height + 25} r="4" fill="#FFFFFF" opacity="0.6" />
    </Svg>
);

export default function ThoughtBubble({
    content,
    sender,
    timestamp,
    isMyMessage,
    type = 'TEXT',
    mediaUrl,
    userColor,
}: ThoughtBubbleProps) {
    // Анимации / Animations
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(40)).current;
    const highlightAnim = useRef(new Animated.Value(0)).current;
    const [hasHighlighted, setHasHighlighted] = useState(false);
    
    // Анимация для пузырьков хвостика / Animation for trail bubbles
    const bubble1Scale = useRef(new Animated.Value(0)).current;
    const bubble2Scale = useRef(new Animated.Value(0)).current;
    const bubble3Scale = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        // Анимация появления облака / Cloud appearance animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 70,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                tension: 70,
                friction: 7,
                useNativeDriver: true,
            }),
            // Последовательная анимация пузырьков хвостика / Sequential animation of trail bubbles
            Animated.sequence([
                Animated.spring(bubble1Scale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
                Animated.delay(100),
                Animated.spring(bubble2Scale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
                Animated.delay(100),
                Animated.spring(bubble3Scale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
            ]),
        ]).start();
        
        // Подсветка после появления / Highlight after appearance
        setTimeout(() => {
            if (!hasHighlighted) {
                Animated.sequence([
                    Animated.timing(highlightAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: false,
                    }),
                    Animated.timing(highlightAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: false,
                    }),
                ]).start();
                setHasHighlighted(true);
            }
        }, 500);
    }, []);
    
    const bubbleColor = useMemo(() => {
        if (isMyMessage) return userColor || '#6C5CE7';
        return getUserColor(sender);
    }, [isMyMessage, sender, userColor]);
    
    // Подсветка / Highlight effect
    const highlightBackground = highlightAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,165,0.3)'],
    });
    
    const dimensions = useMemo(() => {
        if (type === 'IMAGE') return { width: 260, height: 280 };
        if (type === 'VOICE') return { width: 220, height: 90 };
        
        const maxWidth = Math.min(screenWidth * 0.75, 300);
        const charWidth = 7;
        const maxCharsPerLine = Math.floor(maxWidth / charWidth);
        
        const words = content.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);
        
        const finalLines: string[] = [];
        for (const line of lines) {
            if (line.length > maxCharsPerLine) {
                for (let i = 0; i < line.length; i += maxCharsPerLine) {
                    finalLines.push(line.substr(i, maxCharsPerLine));
                }
            } else {
                finalLines.push(line);
            }
        }
        
        const lineCount = Math.max(1, finalLines.length);
        const textHeight = Math.max(50, lineCount * 24 + 40);
        const textWidth = Math.min(maxWidth, Math.max(...finalLines.map(l => l.length * charWidth), 100));
        
        return {
            width: textWidth + 50,
            height: textHeight,
            lines: finalLines,
        };
    }, [content, type]);
    
    return (
        <Animated.View
            style={[
                styles.wrapper,
                isMyMessage ? styles.myWrapper : styles.theirWrapper,
                {
                    opacity: opacityAnim,
                    transform: [
                        { scale: scaleAnim },
                        { translateY: translateY },
                    ],
                },
            ]}
        >
            <Animated.View style={{ backgroundColor: highlightBackground, borderRadius: 30 }}>
                <View style={styles.svgContainer} pointerEvents="none">
                    {isMyMessage ? (
                        <MyCloudShape width={dimensions.width} height={dimensions.height} color={bubbleColor} />
                    ) : (
                        <TheirCloudShape width={dimensions.width} height={dimensions.height} color={bubbleColor} />
                    )}
                </View>
                
                {/* Анимированные пузырьки хвостика / Animated trail bubbles */}
                <Animated.View style={[styles.animatedBubble, { 
                    position: 'absolute', 
                    bottom: -8, 
                    right: isMyMessage ? 10 : undefined,
                    left: !isMyMessage ? 10 : undefined,
                    transform: [{ scale: bubble1Scale }]
                }]}>
                    <Circle cx={0} cy={0} r="6" fill={bubbleColor} opacity="0.7" />
                </Animated.View>
                <Animated.View style={[styles.animatedBubble, { 
                    position: 'absolute', 
                    bottom: -18, 
                    right: isMyMessage ? 5 : undefined,
                    left: !isMyMessage ? 5 : undefined,
                    transform: [{ scale: bubble2Scale }]
                }]}>
                    <Circle cx={0} cy={0} r="4" fill={bubbleColor} opacity="0.5" />
                </Animated.View>
                <Animated.View style={[styles.animatedBubble, { 
                    position: 'absolute', 
                    bottom: -26, 
                    right: isMyMessage ? 2 : undefined,
                    left: !isMyMessage ? 2 : undefined,
                    transform: [{ scale: bubble3Scale }]
                }]}>
                    <Circle cx={0} cy={0} r="2.5" fill={bubbleColor} opacity="0.3" />
                </Animated.View>
                
                <View
                    style={[
                        styles.contentOverlay,
                        {
                            width: dimensions.width - 25,
                            paddingHorizontal: 18,
                            paddingVertical: 14,
                            paddingBottom: 10,
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
                    
                    {/* Время с отступом снизу / Time with bottom margin */}
                    <Text style={[styles.time, isMyMessage ? styles.myTime : styles.theirTime]}>
                        {timestamp}
                    </Text>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 20,
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
    animatedBubble: {
        position: 'absolute',
        width: 12,
        height: 12,
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
    myText: {
        color: '#FFFFFF',
    },
    time: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 2,
        letterSpacing: 0.2,
    },
    myTime: {
        color: 'rgba(255,255,255,0.9)',
    },
    theirTime: {
        color: '#5A6E7A',
    },
    image: {
        width: 220,
        height: 220,
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
        color: '#7F8C8D',
    },
});