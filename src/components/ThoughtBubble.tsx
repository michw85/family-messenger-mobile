/**
 * @file ThoughtBubble.tsx
 * @description Компонент "облако мысли" с поддержкой фото и голоса
 * @description "Thought bubble" component with photo and voice support
 * 
 * @author Bonds Team
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
    Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, spacing, borderRadius, shadows, typography } from '../styles/theme';

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
    /**
     * true, если предыдущее сообщение в чате от того же отправителя и отправлено
     * недавно - тогда отступ сверху меньше (группировка сообщений подряд)
     * true if the previous message in the chat is from the same sender and was
     * sent recently - reduces the top margin (groups consecutive messages)
     */
    grouped?: boolean;
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
 * Радиус "шишечек" по контуру облака
 * Radius of the bumps around the cloud outline
 */
const CLOUD_BUMP = 17.5;

/**
 * Строит рваный ("облачный") контур: скруглённый прямоугольник со случайными
 * шишечками по периметру. Портировано из Kotlin-версии (алгоритм scallop),
 * но пересчитывается под любой размер, а не захардкожено под конкретный текст.
 * Builds a scalloped "cloud" outline: a rounded rect with bumps around the
 * perimeter. Ported from the Kotlin version's scallop algorithm, but
 * recomputed for any size instead of being hardcoded for specific text.
 */
const buildCloudPath = (width: number, height: number, bump: number): string => {
    const tl = { x: bump, y: bump };
    const tr = { x: width - bump, y: bump };
    const br = { x: width - bump, y: height - bump };
    const bl = { x: bump, y: height - bump };

    const scallop = (from: { x: number; y: number }, to: { x: number; y: number }, nx: number, ny: number) => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        const count = Math.max(1, Math.round(len / (bump * 2)));
        let segment = '';
        for (let i = 1; i <= count; i++) {
            const t0 = (i - 1) / count;
            const t1 = i / count;
            const sx = from.x + dx * t0;
            const sy = from.y + dy * t0;
            const ex = from.x + dx * t1;
            const ey = from.y + dy * t1;
            const mx = (sx + ex) / 2 + nx * bump;
            const my = (sy + ey) / 2 + ny * bump;
            segment += `Q ${mx} ${my} ${ex} ${ey} `;
        }
        return segment;
    };

    return (
        `M ${tl.x} ${tl.y} ` +
        scallop(tl, tr, 0, -1) +
        scallop(tr, br, 1, 0) +
        scallop(br, bl, 0, 1) +
        scallop(bl, tl, -1, 0) +
        'Z'
    );
};

/**
 * Облачный пузырь: своим сообщениям — бежевый градиент, чужим — светлый
 * (те же цвета, что в Kotlin-версии/остальном приложении)
 * Cloud bubble: beige gradient for my messages, light gradient for others'
 * (same colors as the Kotlin version / rest of the app)
 */
const CloudShape: React.FC<{ width: number; height: number; isMyMessage: boolean }> = ({ width, height, isMyMessage }) => {
    const w = width + CLOUD_BUMP * 2;
    const h = height + CLOUD_BUMP * 2;
    const path = useMemo(() => buildCloudPath(w, h, CLOUD_BUMP), [w, h]);
    const gradientId = isMyMessage ? 'myGradient' : 'theirGradient';
    const gradientFrom = isMyMessage ? '#F5E6CA' : '#FFFFFF';
    const gradientTo = isMyMessage ? '#E8D5B8' : '#F5E6CA';

    return (
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <Defs>
                <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={gradientFrom} stopOpacity="1" />
                    <Stop offset="100%" stopColor={gradientTo} stopOpacity="1" />
                </LinearGradient>
            </Defs>
            <Path d={path} fill="rgba(0,0,0,0.06)" transform={`translate(${isMyMessage ? 2 : -2}, 3)`} />
            <Path d={path} fill={`url(#${gradientId})`} stroke="#E8E8E8" strokeWidth={0.6} />
        </Svg>
    );
};

/**
 * Хвостик из трёх уменьшающихся кружков под последним сообщением группы
 * (вместо наплывов, встроенных в контур облака)
 * Tail of three shrinking dots under the last message of a group
 * (instead of bumps baked into the cloud outline)
 */
const TailDots: React.FC<{ isMyMessage: boolean }> = ({ isMyMessage }) => {
    const sizes = isMyMessage ? [9, 6, 3] : [3, 6, 9];
    return (
        <View style={[styles.tailRow, isMyMessage ? styles.tailRowMine : styles.tailRowTheirs]}>
            {sizes.map((s, i) => (
                <View
                    key={i}
                    style={{
                        width: s,
                        height: s,
                        borderRadius: s / 2,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 0.6,
                        borderColor: '#E8E8E8',
                        marginLeft: i === 0 ? 0 : 3,
                    }}
                />
            ))}
        </View>
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
    userColor,
    grouped = false,
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
        <Animated.View style={[
            styles.wrapper,
            isMyMessage ? styles.myWrapper : styles.theirWrapper,
            { marginTop: grouped ? 2 : spacing.xl, opacity, transform: [{ scale }, { translateY }] },
        ]}>
            <View style={styles.svgContainer} pointerEvents="none">
                <CloudShape width={dimensions.width} height={dimensions.height} isMyMessage={isMyMessage} />
            </View>
            <View style={[styles.contentOverlay, {
                width: dimensions.width - 25,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
            }]}>
                {!isMyMessage && !grouped && <Text style={[styles.senderName, { color: accentColor }]}>{sender}</Text>}
                {type === 'IMAGE' && mediaUrl ? (
                    // Открытие по нажатию обрабатывает родитель (ChatRoomScreen) - показывает
                    // картинку во встроенном просмотрщике, а не в системном браузере
                    // Tap is handled by the parent (ChatRoomScreen) - opens the image in the
                    // built-in viewer instead of the system browser
                    <Image source={{ uri: mediaUrl }} style={styles.image} />
                ) : type === 'VOICE' ? (
                    <TouchableOpacity onPress={() => playVoice(mediaUrl || '')} style={styles.voiceRow} disabled={!mediaUrl}>
                        <Text style={styles.voiceIcon}>{isPlaying ? '⏹️' : '▶️'}</Text>
                        <Text style={[styles.voiceText, isMyMessage && styles.voiceTextMy]}>
                            {isPlaying ? 'Остановить' : 'Голосовое сообщение'}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={[styles.messageText, isMyMessage && styles.myText]}>{content}</Text>
                )}
            </View>
            <TailDots isMyMessage={isMyMessage} />
            <Text style={[styles.timestamp, isMyMessage ? styles.timestampRight : styles.timestampLeft]}>{timestamp}</Text>
        </Animated.View>
    );
};

/**
 * Стили компонента ThoughtBubble
 * ThoughtBubble component styles
 * Все цвета текста тёмные, так как фон облаков светлый
 */
const styles = StyleSheet.create({
    wrapper: { position: 'relative' },
    myWrapper: { alignSelf: 'flex-end', marginRight: spacing.sm },
    theirWrapper: { alignSelf: 'flex-start', marginLeft: spacing.sm },
    svgContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    contentOverlay: { zIndex: 2 },
    senderName: { fontSize: 11, fontWeight: '700', marginBottom: spacing.xs, letterSpacing: 0.3 },
    /**
     * Основной текст сообщения — тёмный для всех
     * Main message text — dark for all
     */
    messageText: { fontSize: 15, lineHeight: 22, color: '#2C3E50', letterSpacing: 0.2, flexShrink: 1, flexWrap: 'wrap' },
    /**
     * Текст для своих сообщений — такой же тёмный
     * Text for my messages — same dark color
     */
    myText: { color: '#2C3E50' },
    /**
     * Время отправки — тёмно-серый для всех
     * Timestamp — dark gray for all
     */
    timestamp: { fontSize: 11, fontWeight: '500', marginTop: spacing.xs, color: '#6B7A8A' },
    timestampLeft: { marginLeft: 20 },
    timestampRight: { marginRight: 20, textAlign: 'right' },
    tailRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: -4 },
    tailRowMine: { alignSelf: 'flex-end', marginRight: 14 },
    tailRowTheirs: { alignSelf: 'flex-start', marginLeft: 14 },
    image: { width: 200, height: 200, borderRadius: borderRadius.medium, marginVertical: spacing.xs },
    voiceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    voiceIcon: { fontSize: 22 },
    voiceText: { fontSize: 14, color: '#2C3E50' },
    voiceTextMy: { color: '#2C3E50' },
});

export default ThoughtBubble;