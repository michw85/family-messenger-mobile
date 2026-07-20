/**
 * Сервер хранит LocalDateTime без таймзоны (UTC на DigitalOcean).
 * Добавляем Z, чтобы JS корректно перевёл в локальное время устройства -
 * иначе строка без зоны интерпретируется как уже локальное время, и часы съезжают.
 * The server stores LocalDateTime without a timezone (UTC on DigitalOcean).
 * We append Z so JS correctly converts it to the device's local time -
 * otherwise a zone-less string is interpreted as already-local, shifting the clock.
 */
const parseServerDate = (timestamp: string | Date): Date => {
    if (timestamp instanceof Date) return timestamp;
    if (!timestamp) return new Date();
    if (timestamp.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(timestamp)) {
        return new Date(timestamp);
    }
    return new Date(`${timestamp}Z`);
};

export const formatMessageTime = (timestamp: string | Date): string => {
    return parseServerDate(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // или true для AM/PM
    });
};

export const formatMessageDate = (timestamp: string | Date): string => {
    const date = parseServerDate(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return date.toLocaleDateString('ru-RU', { weekday: 'long' });
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};
