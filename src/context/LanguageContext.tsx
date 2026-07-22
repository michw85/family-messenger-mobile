/**
 * @file LanguageContext.tsx
 * @description Контекст для управления языком приложения (русский/английский)
 * @description Context for managing app language (Russian/English)
 * 
 * @author Bonds Team
 * @version 1.0.0
 * @license MIT
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Доступные языки / Available languages
 */
export type Language = 'ru' | 'en';

/**
 * Интерфейс контекста языка
 * Language context interface
 */
interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

/**
 * Переводы / Translations
 */
const translations: Record<Language, Record<string, string>> = {
    ru: {
        // Общие / Common
        'app.name': 'Семейные мысли',
        'app.subtitle': 'Мысли парят в воздухе',
        
        // Приветствие / Greeting
        'greeting': 'Привет',
        'friend': 'Друг',
        
        // Выбор чата / Chat selection
        'select_chat': 'Выберите чат',
        'all_chats': 'Все',
        'group_chats': 'Групповые чаты',
        'group_chats_short': 'Группы',
        'private_chats': 'Личное',
        'no_chats': 'Нет чатов в этой категории',
        'soon': 'Скоро появятся!',
        'members': 'участников',
        'sort_recent': 'По активности',
        'sort_alpha': 'По алфавиту',
        
        // Чат / Chat
        'thoughts_float': 'Мысли парят в воздухе',
        'placeholder': 'Пиши...',
        'voice_message': 'Голосовое сообщение',
        'photo': 'Фото',
        
        // Кнопки / Buttons
        'send': 'Отправить',
        'back': 'Назад',
        
        // Ошибки / Errors
        'error': 'Ошибка',
        'no_access': 'Нет доступа к галерее',
    },
    en: {
        // Common
        'app.name': 'Family Thoughts',
        'app.subtitle': 'Thoughts are floating in the air',
        
        // Greeting
        'greeting': 'Hello',
        'friend': 'Friend',
        
        // Chat selection
        'select_chat': 'Select a chat',
        'all_chats': 'All',
        'group_chats': 'Group chats',
        'group_chats_short': 'Groups',
        'private_chats': 'Private',
        'no_chats': 'No chats in this category',
        'soon': 'Coming soon!',
        'members': 'members',
        'sort_recent': 'Recent',
        'sort_alpha': 'A-Z',
        
        // Chat
        'thoughts_float': 'Thoughts are floating in the air',
        'placeholder': 'Write...',
        'voice_message': 'Voice message',
        'photo': 'Photo',
        
        // Buttons
        'send': 'Send',
        'back': 'Back',
        
        // Errors
        'error': 'Error',
        'no_access': 'No gallery access',
    },
};

/**
 * Контекст языка
 * Language context
 */
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Провайдер языка
 * Language provider component
 */
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('ru');

    useEffect(() => {
        // Загрузка сохранённого языка / Load saved language
        const loadLanguage = async () => {
            const saved = await AsyncStorage.getItem('language');
            if (saved === 'en' || saved === 'ru') {
                setLanguage(saved);
            }
        };
        loadLanguage();
    }, []);

    const handleSetLanguage = async (lang: Language) => {
        setLanguage(lang);
        await AsyncStorage.setItem('language', lang);
    };

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

/**
 * Хук для использования языка
 * Hook for using language
 */
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};