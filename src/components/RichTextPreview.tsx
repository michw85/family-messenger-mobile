/**
 * @file RichTextPreview.tsx
 * @description Живой предпросмотр форматирования в блокноте - показывает,
 * как будет выглядеть сообщение с применёнными стилями (жирный/курсив/
 * подчёркнутый/цвет) ещё ДО отправки, прямо над обычным текстовым полем ввода.
 * Само поле ввода остаётся обычным plain-text - никакой сторонней rich-text
 * библиотеки не требуется, стили просто рендерятся тем же кодом, что и в уже
 * отправленном сообщении (см. utils/richText.ts).
 * @description Live formatting preview for the notebook - shows how the
 * message will look with its applied styles (bold/italic/underline/color)
 * BEFORE sending, right above the plain-text input field. The input itself
 * stays plain text - no third-party rich-text library needed, styles are
 * just rendered with the same logic already used for a sent message (see
 * utils/richText.ts).
 */

import React, { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { buildRichTextSegments, RichSpan } from '../utils/richText';
import { spacing, borderRadius, AppColors } from '../styles/theme';

interface RichTextPreviewProps {
    text: string;
    spans: RichSpan[];
    fontScale?: number;
}

const RichTextPreview: React.FC<RichTextPreviewProps> = ({ text, spans, fontScale = 1 }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

    if (!text) return null;

    const segments = buildRichTextSegments(text, spans);

    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                {segments.map(seg => <Text key={seg.key} style={seg.style}>{seg.text}</Text>)}
            </Text>
        </View>
    );
};

const createStyles = (colors: AppColors, fontScale: number) => StyleSheet.create({
    container: {
        backgroundColor: colors.backgroundWarm,
        borderRadius: borderRadius.medium,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.xs,
        maxHeight: 100 * fontScale,
        overflow: 'hidden',
    },
    text: {
        fontSize: 15 * fontScale,
        color: colors.text,
    },
});

export default RichTextPreview;
