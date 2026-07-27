import React from 'react';
import { render } from '@testing-library/react-native';
import ThoughtBubble from '../ThoughtBubble';

// ThoughtBubble вызывает useAudioPlayer/useVideoPlayer безусловно на каждом
// рендере (не только для VOICE/VIDEO-сообщений), так что их нужно замокать
// для любого теста этого компонента, а не только тех, что касаются медиа.
// ThoughtBubble calls useAudioPlayer/useVideoPlayer unconditionally on every
// render (not just for VOICE/VIDEO messages), so they must be mocked for any
// test of this component, not only the media-specific ones.
jest.mock('expo-audio', () => ({
    useAudioPlayer: () => ({ playing: false, pause: jest.fn(), seekTo: jest.fn(), play: jest.fn() }),
    useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false }),
    setAudioModeAsync: jest.fn(),
}));

jest.mock('expo-video', () => ({
    VideoView: () => null,
    useVideoPlayer: (_source: unknown, configure?: (player: any) => void) => {
        const player = { playing: false, pause: jest.fn(), play: jest.fn() };
        configure?.(player);
        return player;
    },
}));

jest.mock('expo', () => ({
    useEvent: (_player: unknown, _eventName: string, initial: unknown) => initial,
}));

jest.mock('../../context/ThemeContext', () => ({
    useTheme: () => ({ colors: require('../../styles/theme').lightColors, theme: 'light' }),
}));

jest.mock('../../context/LanguageContext', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

/**
 * Регрессионный набор на реальный баг из этой сессии: сообщение, чей content
 * пришёл null с бэкенда (запечатанная капсула времени, из-за рассинхрона
 * проверки на экране чата), падало в ThoughtBubble с "Cannot read property
 * 'split' of null" внутри LinkifiedText. Проверяем, что рендер не падает для
 * content=null во всех типах сообщений, где это в принципе может случиться.
 *
 * render() в этой версии @testing-library/react-native асинхронный (Promise) -
 * поэтому await, а не expect(() => render(...)).not.toThrow(), которое просто
 * проверило бы, что синхронный вызов не бросает исключение немедленно и
 * пропустило бы падение внутри самого рендера.
 *
 * Regression suite for a real bug from this session: a message whose content
 * arrived null from the backend (a sealed time capsule, due to a mismatch in
 * the chat screen's check) crashed ThoughtBubble with "Cannot read property
 * 'split' of null" inside LinkifiedText. Verifies rendering doesn't throw for
 * content=null across every message type where that can happen.
 *
 * render() is async (Promise) in this version of @testing-library/react-native -
 * hence await, rather than expect(() => render(...)).not.toThrow(), which would
 * only check that the synchronous call doesn't throw immediately and would miss
 * a failure inside the render itself.
 */
describe('ThoughtBubble - null content regression', () => {
    const baseProps = {
        sender: 'alice',
        timestamp: '2026-07-26T12:00:00',
        isMyMessage: false,
    };

    const types = ['TEXT', 'RICH_TEXT', 'CHECKLIST', 'CALL_MISSED', 'CALL_DECLINED', 'CALL_CANCELLED'] as const;

    it.each(types)('does not throw when a %s message has content=null', async (type) => {
        await render(<ThoughtBubble {...baseProps} content={null as any} type={type} />);
    });

    it('does not throw for a CALL_ANSWERED message with content=null (duration JSON is normally expected)', async () => {
        await render(<ThoughtBubble {...baseProps} content={null as any} type="CALL_ANSWERED" />);
    });

    it('does not throw for a deleted-placeholder message with content=null', async () => {
        await render(<ThoughtBubble {...baseProps} content={null as any} type="TEXT" deletedPlaceholder />);
    });

    it('still renders the actual text for a normal TEXT message (sanity check, not just null-safety)', async () => {
        const { getByText } = await render(
            <ThoughtBubble {...baseProps} content="hello world" type="TEXT" />
        );

        expect(getByText('hello world')).toBeTruthy();
    });

    it('renders a link inside a TEXT message as tappable, separate from plain text', async () => {
        const { getByText } = await render(
            <ThoughtBubble {...baseProps} content="check this out https://example.com please" type="TEXT" />
        );

        expect(getByText('https://example.com')).toBeTruthy();
    });
});
