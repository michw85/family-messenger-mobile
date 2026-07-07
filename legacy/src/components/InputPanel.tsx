/**
 * @file InputPanel.tsx
 * @description Компонент панели ввода сообщений с поддержкой фото, голоса и анимации
 * @description Message input panel component with photo, voice support and animation
 * 
 * @author Bonds Team
 * @version 1.1.0
 * @license MIT
 */

import React, { useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Text,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



/**
 * Интерфейс пропсов компонента InputPanel
 * InputPanel component props interface
 */
interface InputPanelProps {
    inputText: string;
    setInputText: (text: string) => void;
    onSend: () => void;
    onTyping: () => void;
    onPickImage: () => void;
    onStartRecording: () => void;
    onStopRecording: () => void;
    isRecording: boolean;
    isSending: boolean;
    isConnected: boolean;
}

/**
 * Компонент панели ввода с анимированной кнопкой отправки
 * Input panel component with animated send button
 */
const InputPanel: React.FC<InputPanelProps> = ({
    inputText,
    setInputText,
    onSend,
    onTyping,
    onPickImage,
    onStartRecording,
    onStopRecording,
    isRecording,
    isSending,
    isConnected,
}) => {
     const insets = useSafeAreaInsets();
    // Анимация для кнопки отправки / Animation for send button
    const sendButtonScale = useRef(new Animated.Value(1)).current;
    const sendButtonRotate = useRef(new Animated.Value(0)).current;

    /**
     * Обработчик отправки с анимацией
     * Send handler with animation
     */
    const handleSend = () => {
        if (!inputText.trim() || !isConnected || isSending) return;

        Animated.sequence([
            Animated.spring(sendButtonScale, { toValue: 0.8, friction: 3, useNativeDriver: true }),
            Animated.parallel([
                Animated.spring(sendButtonScale, { toValue: 1, friction: 3, useNativeDriver: true }),
                Animated.timing(sendButtonRotate, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]),
        ]).start(() => {
            sendButtonRotate.setValue(0);
        });

        onSend();
    };

    const rotate = sendButtonRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-15deg'],
    });

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <View style={styles.inputContainer}>
                {/* Кнопка выбора фото / Photo picker button */}
                <TouchableOpacity
                    onPress={onPickImage}
                    style={styles.iconButton}
                    activeOpacity={0.7}
                >
                    <Text style={styles.iconText}>📷</Text>
                </TouchableOpacity>

                {/* Кнопка записи голоса / Voice recording button */}
                <TouchableOpacity
                    onPressIn={onStartRecording}
                    onPressOut={onStopRecording}
                    style={[styles.iconButton, isRecording && styles.recordingActive]}
                // activeOpacity={0.7}
                >
                    <Text style={styles.iconText}>{isRecording ? '🔴' : '🎙️'}</Text>
                </TouchableOpacity>

                {/* Поле ввода текста / Text input field */}
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={(text) => {
                        setInputText(text);
                        onTyping();
                    }}
                    placeholder="Мысль..."
                    placeholderTextColor="#95A5A6"
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                    multiline
                    maxLength={500}
                />

                {/* Анимированная кнопка отправки / Animated send button */}
                <Animated.View
                    style={{
                        transform: [
                            { scale: sendButtonScale },
                            { rotate: rotate },
                        ],
                    }}
                >
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!inputText.trim() || !isConnected || isSending) && styles.sendButtonDisabled,
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || !isConnected || isSending}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.sendButtonText}>✈️</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: 'rgba(255,255,255,0.96)',
    },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        alignItems: 'flex-end',
        gap: spacing.sm,
    },
    iconButton: {
        padding: spacing.sm,
        backgroundColor: '#F0F0F5',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        width: 44,
        height: 44,
        ...shadows.soft,
    },
    iconText: {
        fontSize: 20,
    },
    recordingActive: {
        backgroundColor: '#FFE0E0',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xlarge,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.backgroundLight,
        fontSize: 15,
        color: colors.text,
        maxHeight: 80,
        minHeight: 40,
        ...shadows.soft,
    },
    sendButton: {
        backgroundColor: colors.primary,
        padding: spacing.sm,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        width: 44,
        height: 44,
        ...shadows.medium,
    },
    sendButtonDisabled: {
        backgroundColor: '#B0A0D0',
        opacity: 0.7,
    },
    sendButtonText: {
        color: colors.textLight,
        fontSize: 20,
        textAlign: 'center',
    },
});

export default InputPanel;