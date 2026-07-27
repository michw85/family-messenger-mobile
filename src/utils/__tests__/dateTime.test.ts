import { formatMessageDate, formatMessageTime } from '../dateTime';

const t = (key: string) => {
    const labels: Record<string, string> = {
        date_locale: 'en-US',
        today: 'Today',
        yesterday: 'Yesterday',
    };
    return labels[key] ?? key;
};

describe('formatMessageTime', () => {
    it('formats a zone-less server timestamp as HH:MM', () => {
        const result = formatMessageTime('2026-07-26T18:23:41.674550', t);

        expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('does not throw for a timestamp that already has a Z suffix', () => {
        expect(() => formatMessageTime('2026-07-26T18:23:41.674Z', t)).not.toThrow();
    });

    it('does not throw for a timestamp with an explicit offset', () => {
        expect(() => formatMessageTime('2026-07-26T18:23:41+02:00', t)).not.toThrow();
    });
});

describe('formatMessageDate', () => {
    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-07-26T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('labels a message sent today as "Today"', () => {
        expect(formatMessageDate('2026-07-26T08:00:00', t)).toBe('Today');
    });

    it('labels a message sent yesterday as "Yesterday"', () => {
        expect(formatMessageDate('2026-07-25T08:00:00', t)).toBe('Yesterday');
    });

    it('labels a message from 3 days ago with a weekday name, not Today/Yesterday', () => {
        const result = formatMessageDate('2026-07-23T08:00:00', t);

        expect(result).not.toBe('Today');
        expect(result).not.toBe('Yesterday');
        expect(result.length).toBeGreaterThan(0);
    });

    it('labels a message from over a week ago with a full date, not a bare weekday', () => {
        const result = formatMessageDate('2026-06-01T08:00:00', t);

        expect(result).toContain('2026');
    });
});
