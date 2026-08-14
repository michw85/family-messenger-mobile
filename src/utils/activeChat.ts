/**
 * Отслеживает roomId чата, открытого на экране прямо сейчас - используется
 * обработчиком пуш-уведомлений (App.tsx), чтобы не показывать alert/звук для
 * сообщения из чата, который пользователь и так читает в этот момент.
 * Tracks the roomId of the chat currently open on screen - used by the push
 * notification handler (App.tsx) to skip the alert/sound for a message from
 * a chat the user is already reading.
 */
let activeChatId: string | null = null;

export const setActiveChatId = (roomId: string | null) => {
    activeChatId = roomId;
};

export const getActiveChatId = (): string | null => activeChatId;
