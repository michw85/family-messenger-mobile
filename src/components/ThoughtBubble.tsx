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
    Linking,
    ActivityIndicator,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { File, Paths } from 'expo-file-system';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { spacing, borderRadius, shadows, typography, AppColors } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { formatMessageDate, formatMessageTime } from '../utils/dateTime';
import { buildRichTextSegments, RichSpan } from '../utils/richText';

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
    type?: 'TEXT' | 'IMAGE' | 'VOICE' | 'VIDEO' | 'FILE' | 'MOOD_CHECKIN' | 'CALL_MISSED' | 'CALL_DECLINED' | 'CALL_ANSWERED' | 'CALL_CANCELLED' | 'RICH_TEXT' | 'CHECKLIST';
    mediaUrl?: string;
    userColor?: string;
    /** Тап по пункту чек-листа (CHECKLIST) - переключает done / Tap on a checklist (CHECKLIST) item - toggles done */
    onToggleChecklistItem?: (itemId: string) => void;
    /**
     * true, если предыдущее сообщение в чате от того же отправителя и отправлено
     * недавно - тогда отступ сверху меньше (группировка сообщений подряд)
     * true if the previous message in the chat is from the same sender and was
     * sent recently - reduces the top margin (groups consecutive messages)
     */
    grouped?: boolean;
    /** Было ли сообщение отредактировано / Whether the message was edited */
    edited?: boolean;
    /** Отрисовать как плейсхолдер удалённого сообщения / Render as a deleted-message placeholder */
    deletedPlaceholder?: boolean;
    /** Текст плейсхолдера для VIDEO/FILE, у которых истёк срок хранения на сервере (mediaUrl уже null) /
     * Placeholder text for VIDEO/FILE whose server retention window has passed (mediaUrl already null) */
    mediaExpiredPlaceholder?: string;
    /** Короткий текст "истекает через N дней" для VIDEO/FILE близко к удалению - не плейсхолдер, показывается рядом с самим медиа /
     * Short "expires in N days" text for VIDEO/FILE close to removal - not a placeholder, shown alongside the media itself */
    expiryBadgeText?: string;
    /** Прочитано ли всеми остальными участниками (галочка, только для своих сообщений) /
     * Whether it's been read by every other participant (checkmark, own messages only) */
    read?: boolean;
    /** Сообщение, на которое отвечает это (превью-цитата сверху) /
     * The message this one replies to (preview quote on top) */
    replyTo?: {
        senderUsername: string;
        content: string;
        type: 'TEXT' | 'IMAGE' | 'VOICE' | 'VIDEO' | 'FILE' | 'MOOD_CHECKIN' | 'CALL_MISSED' | 'CALL_DECLINED' | 'CALL_ANSWERED' | 'CALL_CANCELLED' | 'RICH_TEXT' | 'CHECKLIST';
        deleted: boolean;
        revealAt?: string | null;
    } | null;
    /** Множитель размера шрифта для упрощённого режима интерфейса (по умолчанию 1) /
     * Font-size multiplier for the simplified UI mode (defaults to 1) */
    fontScale?: number;
}

/**
 * Находит URL в тексте и делает их кликабельными (синий цвет, открытие в браузере)
 * Finds URLs in text and makes them clickable (blue color, opens in browser)
 */
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const LinkifiedText: React.FC<{ text: string; textStyle: any; linkStyle: any }> = ({ text, textStyle, linkStyle }) => {
    const parts = text.split(URL_REGEX);
    return (
        <Text style={textStyle}>
            {parts.map((part, i) =>
                /^https?:\/\//.test(part) ? (
                    <Text key={i} style={linkStyle} onPress={() => Linking.openURL(part)}>
                        {part}
                    </Text>
                ) : (
                    <Text key={i}>{part}</Text>
                )
            )}
        </Text>
    );
};

/**
 * Разбирает content вида {"durationSeconds":42} у сообщения CALL_ANSWERED
 * и форматирует как "0:42"
 * Parses the {"durationSeconds":42} content of a CALL_ANSWERED message and
 * formats it as "0:42"
 */
const formatCallDuration = (content: string | null): string => {
    try {
        const seconds = content ? JSON.parse(content).durationSeconds ?? 0 : 0;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    } catch {
        return '0:00';
    }
};

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
const CloudShape: React.FC<{ width: number; height: number; isMyMessage: boolean; colors: AppColors }> = ({ width, height, isMyMessage, colors }) => {
    const w = width + CLOUD_BUMP * 2;
    const h = height + CLOUD_BUMP * 2;
    const path = useMemo(() => buildCloudPath(w, h, CLOUD_BUMP), [w, h]);
    const gradientId = isMyMessage ? 'myGradient' : 'theirGradient';
    const [gradientFrom, gradientTo] = isMyMessage ? colors.myBubbleGradient : colors.theirBubbleGradient;

    return (
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <Defs>
                <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={gradientFrom} stopOpacity="1" />
                    <Stop offset="100%" stopColor={gradientTo} stopOpacity="1" />
                </LinearGradient>
            </Defs>
            <Path d={path} fill="rgba(0,0,0,0.06)" transform={`translate(${isMyMessage ? 2 : -2}, 3)`} />
            <Path d={path} fill={`url(#${gradientId})`} stroke={colors.border} strokeWidth={0.6} />
        </Svg>
    );
};

/**
 * Хвостик из трёх уменьшающихся кружков под последним сообщением группы
 * (вместо наплывов, встроенных в контур облака)
 * Tail of three shrinking dots under the last message of a group
 * (instead of bumps baked into the cloud outline)
 */
const TailDots: React.FC<{ isMyMessage: boolean; colors: AppColors }> = ({ isMyMessage, colors }) => {
    const sizes = isMyMessage ? [9, 6, 3] : [3, 6, 9];
    return (
        <View style={[layoutStyles.tailRow, isMyMessage ? layoutStyles.tailRowMine : layoutStyles.tailRowTheirs]}>
            {sizes.map((s, i) => (
                <View
                    key={i}
                    style={{
                        width: s,
                        height: s,
                        borderRadius: s / 2,
                        backgroundColor: colors.backgroundLight,
                        borderWidth: 0.6,
                        borderColor: colors.border,
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
    onToggleChecklistItem,
    grouped = false,
    edited = false,
    deletedPlaceholder = false,
    mediaExpiredPlaceholder,
    expiryBadgeText,
    read = false,
    replyTo = null,
    fontScale = 1,
}) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const styles = useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

    const videoPlayer = useVideoPlayer(type === 'VIDEO' ? mediaUrl || null : null, (player) => {
        player.loop = false;
    });
    // Свои play/pause и полноэкранная кнопка вместо nativeControls - плеер
    // встроен в сообщение внутри FlatList, а одиночные тапы по нативным
    // кнопкам ExoPlayer (в отличие от жеста перетаскивания шкалы) не проходят
    // сквозь список: FlatList забирает их себе. Обычные RN-кнопки (ниже)
    // правильно участвуют в системе жестов React Native, поэтому работают.
    // Custom play/pause and fullscreen buttons instead of nativeControls -
    // the player sits inside a message inside a FlatList, and single taps on
    // ExoPlayer's native buttons (unlike the scrub-bar drag gesture) don't
    // make it through the list: FlatList claims them first. Regular RN
    // buttons (below) properly participate in React Native's own gesture
    // system, so they work.
    const videoViewRef = useRef<VideoView>(null);
    const { isPlaying: isVideoPlaying } = useEvent(videoPlayer, 'playingChange', { isPlaying: videoPlayer.playing });

    // Анимации (сохранены из предыдущей версии)
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(30)).current;

    // Состояния для голоса
    const voicePlayer = useAudioPlayer(mediaUrl || null);
    const voicePlayerStatus = useAudioPlayerStatus(voicePlayer);
    const isPlaying = voicePlayerStatus.playing;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, tension: 70, friction: 7, useNativeDriver: true }),
        ]).start();
    }, []);

    // Возврат к началу после завершения воспроизведения (чтобы повтор начинался сначала)
    // Важно: сначала pause(), иначе плеер остаётся в состоянии "playing" и
    // seekTo(0) просто запускает трек заново - получается бесконечный цикл
    useEffect(() => {
        if (voicePlayerStatus.didJustFinish) {
            voicePlayer.pause();
            voicePlayer.seekTo(0);
        }
    }, [voicePlayerStatus.didJustFinish, voicePlayer]);

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
            Alert.alert(t('error'), t('audio_link_missing'));
            return;
        }

        try {
            // Если звук уже играет – останавливаем и сбрасываем на начало
            if (voicePlayer.playing) {
                voicePlayer.pause();
                await voicePlayer.seekTo(0);
                return;
            }

            // Важно: без этого воспроизведение может быть беззвучным (например,
            // если телефон в беззвучном режиме, или аудио-сессия осталась в
            // режиме записи после отправки голосового сообщения) - плеер при
            // этом всё равно репортит isPlaying=true, создавая впечатление,
            // что "ничего не происходит" при нажатии
            // Important: without this, playback can be silent (e.g. if the
            // phone is in silent mode, or the audio session is still in
            // recording mode after sending a voice message) - the player
            // still reports isPlaying=true either way, making it look like
            // "nothing happens" when pressed
            await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

            await voicePlayer.seekTo(0);
            voicePlayer.play();
        } catch (error) {
            console.error('Failed to play voice', error);
            Alert.alert(t('error'), t('could_not_play_voice'));
        }
    };

    /**
     * Транскрипция голосового сообщения на устройстве (без стороннего API) -
     * скачиваем файл локально (распознавание требует локальный URI, не https)
     * и запускаем речевой движок ОС в offline-режиме.
     * On-device voice message transcription (no third-party API) -
     * downloads the file locally first (recognition needs a local URI, not
     * https) and runs the OS speech engine in offline mode.
     */
    const [transcribing, setTranscribing] = useState(false);
    const transcribingRef = useRef(false);

    useSpeechRecognitionEvent('result', (event) => {
        if (!transcribingRef.current || !event.isFinal) return;
        transcribingRef.current = false;
        setTranscribing(false);
        const text = event.results[0]?.transcript;
        Alert.alert(
            t('transcript_title'),
            text || t('no_speech_recognized')
        );
    });

    useSpeechRecognitionEvent('error', (event) => {
        if (!transcribingRef.current) return;
        transcribingRef.current = false;
        setTranscribing(false);
        Alert.alert(t('error'), `${t('could_not_recognize_speech')}: ${event.error}`);
    });

    const transcribeVoice = async () => {
        if (!mediaUrl || transcribingRef.current) return;

        try {
            const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!granted) {
                Alert.alert(t('error'), t('no_speech_access'));
                return;
            }

            transcribingRef.current = true;
            setTranscribing(true);

            const localFile = await File.downloadFileAsync(mediaUrl, Paths.cache, { idempotent: true });

            ExpoSpeechRecognitionModule.start({
                lang: 'ru-RU',
                interimResults: false,
                continuous: false,
                requiresOnDeviceRecognition: true,
                audioSource: { uri: localFile.uri },
            });
        } catch (error) {
            console.error('Failed to transcribe voice message', error);
            transcribingRef.current = false;
            setTranscribing(false);
            Alert.alert(t('error'), t('could_not_recognize_speech'));
        }
    };

    /**
     * Фиксированный размер облака для фото/голоса (для текста размер не
     * угадывается заранее - облако рисуется по реально измеренному размеру
     * блока с текстом, см. ниже cloudSize/onLayout)
     * Fixed cloud size for photo/voice (for text the size isn't guessed
     * ahead of time - the cloud is drawn from the actually measured size of
     * the text block, see cloudSize/onLayout below)
     */
    const fixedDimensions = useMemo(() => {
        const replyExtra = replyTo ? 34 : 0;
        if (type === 'IMAGE' || type === 'VIDEO') return { width: 260, height: 240 + replyExtra };
        if (type === 'VOICE') return { width: 220, height: 80 + replyExtra };
        return null;
    }, [type, replyTo]);

    const maxTextWidth = Math.min(screenWidth * 0.75, 280);

    // Реально измеренный размер контента текстового сообщения. Пока не
    // измерен - контент невидим (opacity 0), чтобы не мелькало облако
    // неправильного размера.
    // Actually measured size of a text message's content. Until measured,
    // the content stays invisible (opacity 0) so a wrong-sized cloud never
    // flashes on screen.
    const [measuredSize, setMeasuredSize] = useState<{ width: number; height: number } | null>(null);

    const handleContentLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
        const { width, height } = e.nativeEvent.layout;
        setMeasuredSize(prev => {
            if (prev && Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5) return prev;
            return { width, height };
        });
    };

    const cloudSize = fixedDimensions || measuredSize;

    // Интерполяция
    const scale = scaleAnim;
    const opacity = opacityAnim;
    const translateYVal = translateY;

    /**
     * Рендер сообщения блокнота с простым форматированием: content хранит
     * {text, spans}, где spans - непересекающиеся стилевые диапазоны поверх
     * plain text. Вложенные <Text> в RN нормально комбинируют стили родителя.
     * Renders a notebook message with simple formatting: content stores
     * {text, spans}, where spans are style ranges over plain text. Nested
     * <Text> in RN correctly combines styles from its parent.
     */
    const renderRichText = (raw: string) => {
        try {
            const parsed = JSON.parse(raw) as { text: string; spans?: RichSpan[] };
            const text = parsed.text ?? '';
            const segments = buildRichTextSegments(text, parsed.spans ?? []);
            if (segments.length === 1 && Object.keys(segments[0].style).length === 0) {
                return <LinkifiedText text={text} textStyle={[styles.messageText, isMyMessage && styles.myText]} linkStyle={styles.linkText} />;
            }
            return (
                <Text style={[styles.messageText, isMyMessage && styles.myText]}>
                    {segments.map(seg => <Text key={seg.key} style={seg.style}>{seg.text}</Text>)}
                </Text>
            );
        } catch {
            return <Text style={[styles.messageText, isMyMessage && styles.myText]}>{raw}</Text>;
        }
    };

    /**
     * Рендер чек-листа блокнота: content хранит {items:[{id,text,done}]},
     * тап по пункту вызывает onToggleChecklistItem - остальное (пересборка
     * content и вызов editMessage) делает родительский экран.
     * Renders a notebook checklist: content stores {items:[{id,text,done}]},
     * tapping an item calls onToggleChecklistItem - rebuilding the content
     * and calling editMessage is handled by the parent screen.
     */
    const renderChecklist = (raw: string) => {
        try {
            const parsed = JSON.parse(raw) as { items: { id: string; text: string; done: boolean }[] };
            return (
                <View>
                    {parsed.items.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.checklistRow}
                            onPress={() => onToggleChecklistItem?.(item.id)}
                        >
                            <Text style={styles.checklistCheckbox}>{item.done ? '☑' : '☐'}</Text>
                            <Text style={[styles.checklistItemText, isMyMessage && styles.myText, item.done && styles.checklistItemDone]}>
                                {item.text}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        } catch {
            return <Text style={[styles.messageText, isMyMessage && styles.myText]}>{raw}</Text>;
        }
    };

    const renderContent = () => (
        <>
            {replyTo && (
                <View style={[styles.replyQuote, isMyMessage && styles.replyQuoteMy]}>
                    <Text style={[styles.replyQuoteSender, isMyMessage && styles.replyQuoteSenderMy]}>
                        {replyTo.senderUsername}
                    </Text>
                    <Text style={[styles.replyQuoteText, isMyMessage && styles.replyQuoteTextMy]} numberOfLines={1}>
                        {replyTo.deleted
                            ? t('message_deleted')
                            : (replyTo.revealAt && new Date(replyTo.revealAt).getTime() > Date.now())
                                ? t('time_capsule_sealed').replace('{date}', `${formatMessageDate(replyTo.revealAt, t)}, ${formatMessageTime(replyTo.revealAt, t)}`)
                                : replyTo.type === 'RICH_TEXT'
                                    ? (() => { try { return JSON.parse(replyTo.content).text ?? ''; } catch { return replyTo.content; } })()
                                : replyTo.type === 'CHECKLIST'
                                    ? (() => { try { return (JSON.parse(replyTo.content).items ?? []).map((i: any) => i.text).join(', '); } catch { return replyTo.content; } })()
                                : replyTo.content}
                    </Text>
                </View>
            )}
            {!isMyMessage && !grouped && <Text style={[styles.senderName, { color: accentColor }]}>{sender}</Text>}
            {type === 'IMAGE' && mediaUrl ? (
                // Открытие по нажатию обрабатывает родитель (ChatRoomScreen) - показывает
                // картинку во встроенном просмотрщике, а не в системном браузере
                // Tap is handled by the parent (ChatRoomScreen) - opens the image in the
                // built-in viewer instead of the system browser
                <Image source={{ uri: mediaUrl }} style={styles.image} />
            ) : type === 'VOICE' ? (
                <View style={styles.voiceRow}>
                    <TouchableOpacity onPress={() => playVoice(mediaUrl || '')} style={styles.voiceRow} disabled={!mediaUrl}>
                        <Text style={styles.voiceIcon}>{isPlaying ? '⏹️' : '▶️'}</Text>
                        <Text style={[styles.voiceText, isMyMessage && styles.voiceTextMy]}>
                            {isPlaying ? 'Остановить' : 'Голосовое сообщение'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={transcribeVoice} disabled={!mediaUrl || transcribing} style={styles.transcribeButton}>
                        {transcribing ? (
                            <ActivityIndicator size="small" color={isMyMessage ? colors.textLight : colors.primary} />
                        ) : (
                            <Text style={styles.voiceIcon}>📝</Text>
                        )}
                    </TouchableOpacity>
                </View>
            ) : type === 'VIDEO' && mediaUrl ? (
                <>
                    <View style={styles.image}>
                        <VideoView
                            ref={videoViewRef}
                            player={videoPlayer}
                            style={styles.videoFill}
                            nativeControls={false}
                            contentFit="cover"
                        />
                        <TouchableOpacity
                            style={styles.videoPlayOverlay}
                            onPress={() => (isVideoPlaying ? videoPlayer.pause() : videoPlayer.play())}
                        >
                            {!isVideoPlaying && (
                                <View style={styles.videoPlayOverlayCircle}>
                                    <Text style={styles.videoPlayOverlayText}>▶️</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.videoFullscreenButton}
                            onPress={() => videoViewRef.current?.enterFullscreen()}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={styles.videoFullscreenButtonText}>⛶</Text>
                        </TouchableOpacity>
                    </View>
                    {!!expiryBadgeText && <Text style={styles.expiryBadge}>{expiryBadgeText}</Text>}
                </>
            ) : type === 'FILE' && mediaUrl ? (
                <>
                    <TouchableOpacity onPress={() => Linking.openURL(mediaUrl)} style={styles.voiceRow}>
                        <Text style={styles.voiceIcon}>📄</Text>
                        <Text style={[styles.voiceText, isMyMessage && styles.voiceTextMy]} numberOfLines={1}>
                            {content.replace(/^📄\s*/, '')}
                        </Text>
                    </TouchableOpacity>
                    {!!expiryBadgeText && <Text style={styles.expiryBadge}>{expiryBadgeText}</Text>}
                </>
            ) : (type === 'VIDEO' || type === 'FILE') && mediaExpiredPlaceholder ? (
                <Text style={styles.deletedText}>{mediaExpiredPlaceholder}</Text>
            ) : deletedPlaceholder ? (
                <Text style={styles.deletedText}>{content}</Text>
            ) : (type === 'CALL_MISSED' || type === 'CALL_DECLINED' || type === 'CALL_ANSWERED' || type === 'CALL_CANCELLED') ? (
                // Записи об итоге звонка приходят с content=null (кроме CALL_ANSWERED,
                // где это JSON с длительностью) - обычный LinkifiedText упал бы на null
                // Call-outcome log entries arrive with content=null (except
                // CALL_ANSWERED, where it's a JSON blob with the duration) -
                // the regular LinkifiedText would crash on null
                <Text style={[styles.messageText, isMyMessage && styles.myText]}>
                    {type === 'CALL_MISSED' ? t('call_log_missed')
                        : type === 'CALL_DECLINED' ? t('call_log_declined')
                        : type === 'CALL_CANCELLED' ? t('call_log_cancelled')
                        : t('call_log_answered').replace('{duration}', formatCallDuration(content))}
                </Text>
            ) : type === 'RICH_TEXT' ? (
                renderRichText(content)
            ) : type === 'CHECKLIST' ? (
                renderChecklist(content)
            ) : (
                <LinkifiedText
                    text={content}
                    textStyle={[styles.messageText, isMyMessage && styles.myText]}
                    linkStyle={styles.linkText}
                />
            )}
        </>
    );

    return (
        <Animated.View style={[
            styles.wrapper,
            isMyMessage ? styles.myWrapper : styles.theirWrapper,
            { marginTop: grouped ? 2 : spacing.xl, opacity, transform: [{ scale }, { translateY }] },
        ]}>
            {cloudSize ? (
                // Облако уже измерено (или размер известен заранее для фото/голоса) -
                // рисуем "хост"-контейнер ровно по размеру SVG (с запасом под шишечки
                // bump с каждой стороны), чтобы он полностью учитывался в потоке разметки
                // и точки/время никогда не наезжали на облако и не обрезали его.
                // The cloud size is now known (measured, or fixed upfront for photo/voice) -
                // draw a "host" container sized exactly to the SVG (including the bump
                // padding on every side) so it's fully accounted for in layout flow and the
                // dots/timestamp never overlap or clip the cloud.
                <View style={{ width: cloudSize.width + CLOUD_BUMP * 2, height: cloudSize.height + CLOUD_BUMP * 2 }}>
                    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                        <CloudShape width={cloudSize.width} height={cloudSize.height} isMyMessage={isMyMessage} colors={colors} />
                    </View>
                    <View style={[styles.contentOverlay, {
                        position: 'absolute',
                        top: CLOUD_BUMP,
                        left: CLOUD_BUMP,
                        width: cloudSize.width,
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                    }]}>
                        {renderContent()}
                    </View>
                </View>
            ) : (
                // Первый проход - невидимый блок только для измерения реального
                // размера текста (см. handleContentLayout)
                // First pass - an invisible block used only to measure the text's
                // real size (see handleContentLayout)
                <View
                    onLayout={handleContentLayout}
                    style={[styles.contentOverlay, {
                        maxWidth: maxTextWidth,
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                        opacity: 0,
                    }]}
                >
                    {renderContent()}
                </View>
            )}
            <TailDots isMyMessage={isMyMessage} colors={colors} />
            <Text style={[styles.timestamp, isMyMessage ? styles.timestampRight : styles.timestampLeft]}>
                {edited && !deletedPlaceholder ? 'изменено · ' : ''}{timestamp}
                {isMyMessage && !deletedPlaceholder && (
                    <Text style={read ? styles.tickRead : styles.tickSent}> {read ? '✓✓' : '✓'}</Text>
                )}
            </Text>
        </Animated.View>
    );
};

/**
 * Стили компонента ThoughtBubble
 * ThoughtBubble component styles
 * Цвет текста берётся из текущей темы (тёмный на светлом облаке, светлый на тёмном)
 * Text color comes from the current theme (dark on a light cloud, light on a dark one)
 */
const createStyles = (colors: AppColors, fontScale: number = 1) => StyleSheet.create({
    wrapper: { position: 'relative' },
    myWrapper: { alignSelf: 'flex-end', marginRight: spacing.sm },
    theirWrapper: { alignSelf: 'flex-start', marginLeft: spacing.sm },
    contentOverlay: { zIndex: 2, alignSelf: 'flex-start' },
    senderName: { fontSize: 11 * fontScale, fontWeight: '700', marginBottom: spacing.xs, letterSpacing: 0.3 },
    /**
     * Основной текст сообщения
     * Main message text
     */
    messageText: { fontSize: 15 * fontScale, lineHeight: 22 * fontScale, color: colors.text, letterSpacing: 0.2, flexShrink: 1, flexWrap: 'wrap' },
    /**
     * Текст для своих сообщений — тот же цвет
     * Text for my messages — same color
     */
    myText: { color: colors.text },
    /**
     * Ссылки в тексте — синие и подчёркнутые, как в обычных мессенджерах
     * Links in text — blue and underlined, like standard messengers
     */
    linkText: { color: '#2563EB', textDecorationLine: 'underline' },
    /**
     * Плейсхолдер удалённого сообщения — курсив, приглушённый цвет
     * Deleted message placeholder — italic, muted color
     */
    deletedText: { fontSize: 15 * fontScale, lineHeight: 22 * fontScale, color: colors.textMuted, fontStyle: 'italic' },
    /**
     * Бейдж "истекает через N дней" на видео/файле, близком к автоудалению
     * "Expires in N days" badge on video/file close to auto-deletion
     */
    expiryBadge: { fontSize: 11 * fontScale, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xs },
    /**
     * Время отправки
     * Timestamp
     */
    timestamp: { fontSize: 11 * fontScale, fontWeight: '500', marginTop: spacing.xs, color: colors.textSecondary },
    timestampLeft: { marginLeft: 20 },
    timestampRight: { marginRight: 20, textAlign: 'right' },
    tickSent: { color: colors.textSecondary },
    tickRead: { color: colors.primary },
    replyQuote: {
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
        backgroundColor: colors.subtleOverlay,
        borderRadius: borderRadius.small,
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
    },
    replyQuoteMy: {
        borderLeftColor: colors.textLight,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    replyQuoteSender: { fontSize: 11, fontWeight: '600', color: colors.primary },
    replyQuoteSenderMy: { color: colors.textLight },
    replyQuoteText: { fontSize: 12, color: colors.textSecondary },
    replyQuoteTextMy: { color: colors.textLight, opacity: 0.85 },
    image: { width: 200, height: 200, borderRadius: borderRadius.medium, marginVertical: spacing.xs },
    voiceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    voiceIcon: { fontSize: 22 },
    transcribeButton: { marginLeft: spacing.xs, width: 22, alignItems: 'center', justifyContent: 'center' },
    voiceText: { fontSize: 14 * fontScale, color: colors.text },
    voiceTextMy: { color: colors.text },
    videoFill: { width: '100%', height: '100%', borderRadius: borderRadius.medium },
    videoPlayOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoPlayOverlayCircle: {
        width: 46,
        height: 46,
        borderRadius: borderRadius.circle,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoPlayOverlayText: {
        fontSize: 20,
    },
    videoFullscreenButton: {
        position: 'absolute',
        bottom: spacing.xs,
        right: spacing.xs,
        width: 30,
        height: 30,
        borderRadius: borderRadius.small,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoFullscreenButtonText: { fontSize: 16, color: '#FFFFFF' },
    checklistRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3 },
    checklistCheckbox: { fontSize: 17 * fontScale, marginRight: spacing.xs, color: colors.primary },
    checklistItemText: { fontSize: 15 * fontScale, lineHeight: 22 * fontScale, color: colors.text, flexShrink: 1, flexWrap: 'wrap' },
    checklistItemDone: { textDecorationLine: 'line-through', color: colors.textMuted },
});

/**
 * Чисто раскладочные (не зависящие от темы) стили хвостика точек - вынесены
 * отдельно, т.к. используются в TailDots, который рендерится до вычисления
 * основных стилей темы
 * Purely layout (theme-independent) styles for the dot tail - kept separate
 * since they're used by TailDots, which renders before the theme-based
 * styles are computed
 */
const layoutStyles = StyleSheet.create({
    tailRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: -4 },
    tailRowMine: { alignSelf: 'flex-end', marginRight: 14 },
    tailRowTheirs: { alignSelf: 'flex-start', marginLeft: 14 },
});

export default ThoughtBubble;