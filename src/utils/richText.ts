/**
 * @file richText.ts
 * @description Общая логика простого форматирования текста в блокноте - один
 * раз строит сегменты {text, style} из {text, spans}, переиспользуется и в
 * отправленном сообщении (ThoughtBubble), и в живом предпросмотре над полем
 * ввода (RichTextPreview), чтобы они всегда выглядели идентично
 * @description Shared notebook simple-formatting logic - builds {text, style}
 * segments from {text, spans} once, reused both by the sent message
 * (ThoughtBubble) and the live preview above the input field
 * (RichTextPreview), so they always render identically
 */

/** Стилевой диапазон простого форматирования блокнота / A notebook simple-formatting style range */
export interface RichSpan {
    start: number;
    end: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
}

export interface RichTextSegment {
    key: number;
    text: string;
    style: {
        fontWeight?: '700';
        fontStyle?: 'italic';
        textDecorationLine?: 'underline';
        color?: string;
    };
}

/**
 * Разбивает text на непересекающиеся сегменты по границам всех spans и
 * считает итоговый стиль каждого сегмента (несколько активных spans на одном
 * участке комбинируются - например, жирный+подчёркнутый одновременно).
 * Splits text into non-overlapping segments at every span boundary and
 * computes each segment's combined style (multiple active spans over the
 * same range combine - e.g. bold+underline at once).
 */
export const buildRichTextSegments = (text: string, spans: RichSpan[]): RichTextSegment[] => {
    const validSpans = spans.filter(s => s.end > s.start);
    if (!validSpans.length) {
        return [{ key: 0, text, style: {} }];
    }

    const boundaries = new Set<number>([0, text.length]);
    validSpans.forEach(s => {
        boundaries.add(Math.max(0, Math.min(s.start, text.length)));
        boundaries.add(Math.max(0, Math.min(s.end, text.length)));
    });
    const points = Array.from(boundaries).sort((a, b) => a - b);

    const segments: RichTextSegment[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const segStart = points[i];
        const segEnd = points[i + 1];
        if (segStart >= segEnd) continue;
        const active = validSpans.filter(s => s.start <= segStart && s.end >= segEnd);
        const style: RichTextSegment['style'] = {};
        active.forEach(s => {
            if (s.bold) style.fontWeight = '700';
            if (s.italic) style.fontStyle = 'italic';
            if (s.underline) style.textDecorationLine = 'underline';
            if (s.color) style.color = s.color;
        });
        segments.push({ key: i, text: text.slice(segStart, segEnd), style });
    }
    return segments;
};
