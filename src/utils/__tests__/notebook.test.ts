import { isNotebookChat, NOTEBOOK_MARKER } from '../notebook';

describe('isNotebookChat', () => {
    it('is true for a solo DIRECT chat named with the notebook marker', () => {
        expect(isNotebookChat({ type: 'DIRECT', name: NOTEBOOK_MARKER, participants: [{}] })).toBe(true);
    });

    it('is false for a GROUP chat even with a single participant and the marker name', () => {
        // Маловероятно на практике, но проверяем явно - групповые чаты никогда не блокнот
        // Unlikely in practice, but checked explicitly - group chats are never the notebook
        expect(isNotebookChat({ type: 'GROUP', name: NOTEBOOK_MARKER, participants: [{}] })).toBe(false);
    });

    it('is false for an orphaned personal chat with a single participant but a real name', () => {
        // Второй участник вышел из обычного личного чата - не должно распознаваться как блокнот
        // The other participant left a regular personal chat - must not be mistaken for the notebook
        expect(isNotebookChat({ type: 'DIRECT', name: 'alice-bob', participants: [{}] })).toBe(false);
    });

    it('is false once a second participant is present, even with the marker name', () => {
        expect(isNotebookChat({ type: 'DIRECT', name: NOTEBOOK_MARKER, participants: [{}, {}] })).toBe(false);
    });

    it('is false for an empty participants list', () => {
        expect(isNotebookChat({ type: 'DIRECT', name: NOTEBOOK_MARKER, participants: [] })).toBe(false);
    });
});
