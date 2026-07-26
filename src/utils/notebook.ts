/**
 * @file notebook.ts
 * @description Общая логика определения блокнот-чата - используется и в
 * RoomSelectScreen (список чатов), и в ChatRoomScreen (внутри самого чата),
 * чтобы обе стороны сходились в одном и том же понимании "что такое блокнот"
 * @description Shared notebook-chat detection logic - used by both
 * RoomSelectScreen (chat list) and ChatRoomScreen (inside the chat itself),
 * so both sides agree on what counts as "the notebook"
 */

/**
 * Служебное (не показываемое напрямую) имя блокнот-чата на сервере - специально
 * НЕ переведённая строка, иначе смена языка интерфейса после создания блокнота
 * ломала бы его определение (chat.name зафиксирован на языке, который был
 * активен в момент создания, а не на текущем). Отображаемый текст ("📓 Блокнот"/
 * "📓 Notebook"/...) строится на клиенте через t('notebook_chat_name').
 * Internal (never directly displayed) name for the notebook chat on the server -
 * deliberately NOT a translated string, otherwise switching the UI language after
 * the notebook was created would break its detection (chat.name is fixed to
 * whatever language was active at creation time, not the current one). The
 * displayed text ("📓 Блокнот"/"📓 Notebook"/...) is built client-side via
 * t('notebook_chat_name').
 */
export const NOTEBOOK_MARKER = '__notebook__';

/**
 * Минимальная форма чата, нужная для определения блокнота - структурно
 * совместима и с ChatRoom (RoomSelectScreen), и с объектом комнаты,
 * приходящим в ChatRoomScreen из /api/chats/{id}
 * Minimal chat shape needed for notebook detection - structurally compatible
 * with both ChatRoom (RoomSelectScreen) and the room object ChatRoomScreen
 * fetches from /api/chats/{id}
 */
interface NotebookCandidateChat {
    type: string;
    name: string;
    participants: Array<unknown>;
}

/**
 * Блокнот - это обычный DIRECT-чат, где единственный участник - сам
 * пользователь (createChat никогда не добавляет никого, кроме создателя).
 * Никакого отдельного RoomType заводить не пришлось.
 *
 * Одного числа участников недостаточно - ЛЮБОЙ личный чат, где второй
 * участник вышел (или не был добавлен, например брошенный тестовый чат),
 * тоже проходит по этому условию. Дополнительно сверяем имя чата с
 * NOTEBOOK_MARKER - иначе такие "осиротевшие" чужие чаты ошибочно
 * подписываются как блокнот.
 * The notebook is just a DIRECT chat with a single participant - the user
 * themselves (createChat never adds anyone but the creator). No separate
 * RoomType was needed.
 *
 * Participant count alone isn't enough - ANY personal chat where the other
 * side left (or was never added, e.g. an abandoned test chat) also matches.
 * We additionally check the chat name against NOTEBOOK_MARKER - otherwise
 * such "orphaned" unrelated chats get mislabeled as the notebook.
 */
export const isNotebookChat = (chat: NotebookCandidateChat): boolean =>
    chat.type !== 'GROUP' && chat.participants.length === 1 && chat.name === NOTEBOOK_MARKER;
