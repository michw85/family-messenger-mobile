import { buildRichTextSegments } from '../richText';

describe('buildRichTextSegments', () => {
    it('returns the whole text as one unstyled segment when there are no spans', () => {
        const segments = buildRichTextSegments('hello world', []);

        expect(segments).toEqual([{ key: 0, text: 'hello world', style: {} }]);
    });

    it('ignores spans where end <= start', () => {
        const segments = buildRichTextSegments('hello', [{ start: 3, end: 3, bold: true }]);

        expect(segments).toEqual([{ key: 0, text: 'hello', style: {} }]);
    });

    it('splits text into styled and unstyled segments around a single span', () => {
        const segments = buildRichTextSegments('hello world', [{ start: 0, end: 5, bold: true }]);

        expect(segments.map(s => s.text)).toEqual(['hello', ' world']);
        expect(segments[0].style).toEqual({ fontWeight: '700' });
        expect(segments[1].style).toEqual({});
    });

    it('combines multiple overlapping styles on the same range', () => {
        const segments = buildRichTextSegments('hello', [
            { start: 0, end: 5, bold: true },
            { start: 0, end: 5, underline: true },
            { start: 0, end: 5, color: '#ff0000' },
        ]);

        expect(segments).toHaveLength(1);
        expect(segments[0].style).toEqual({
            fontWeight: '700',
            textDecorationLine: 'underline',
            color: '#ff0000',
        });
    });

    it('produces three segments for a style applied only to the middle of the text', () => {
        const segments = buildRichTextSegments('one two three', [{ start: 4, end: 7, italic: true }]);

        expect(segments.map(s => s.text)).toEqual(['one ', 'two', ' three']);
        expect(segments[0].style).toEqual({});
        expect(segments[1].style).toEqual({ fontStyle: 'italic' });
        expect(segments[2].style).toEqual({});
    });

    it('clamps a span that runs past the end of the text', () => {
        const segments = buildRichTextSegments('short', [{ start: 2, end: 999, bold: true }]);

        expect(segments.map(s => s.text)).toEqual(['sh', 'ort']);
        expect(segments[1].style).toEqual({ fontWeight: '700' });
    });

    it('handles an empty string without throwing', () => {
        const segments = buildRichTextSegments('', []);

        expect(segments).toEqual([{ key: 0, text: '', style: {} }]);
    });
});
