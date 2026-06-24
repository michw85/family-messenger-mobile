/**
 * @file index.ts
 * @description Глобальные типы и интерфейсы приложения
 * @description Global types and interfaces for the application
 * 
 * @author Bonds Team
 * @version 1.0.0
 */

/**
 * Интерфейс сообщения чата
 * Chat message interface
 * @property id - Уникальный идентификатор сообщения / Unique message identifier
 * @property sender - Имя отправителя / Sender name
 * @property content - Текст сообщения / Message text
 * @property timestamp - Время отправки / Sending time
 * @property type - Тип сообщения (текст/фото/голос) / Message type (text/image/voice)
 * @property mediaUrl - URL медиафайла / Media file URL
 */
export interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    type?: 'TEXT' | 'IMAGE' | 'VOICE';
    mediaUrl?: string;
}

/**
 * Интерфейс комнаты чата
 * Chat room interface
 * @property id - Уникальный идентификатор комнаты / Unique room identifier
 * @property name - Название комнаты / Room name
 * @property description - Описание комнаты / Room description
 * @property icon - Иконка комнаты / Room icon
 * @property members - Количество участников / Number of members
 */
export interface Room {
    id: string;
    name: string;
    description: string;
    icon: string;
    members: number;
}

/**
 * Интерфейс пользователя
 * User interface
 * @property id - ID пользователя / User ID
 * @property username - Имя пользователя / Username
 * @property email - Email пользователя / User email
 * @property avatarUrl - URL аватара / Avatar URL
 * @property status - Статус пользователя / User status
 */
export interface User {
    id: number;
    username: string;
    email: string;
    avatarUrl: string | null;
    status: 'ONLINE' | 'OFFLINE' | 'AWAY';
}