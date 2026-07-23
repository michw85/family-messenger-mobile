/**
 * @file LanguageContext.tsx
 * @description Контекст для управления языком приложения (9 языков)
 * @description Context for managing app language (9 languages)
 *
 * @author Bonds Team
 * @version 2.0.0
 * @license MIT
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Доступные языки / Available languages
 */
export type Language = 'ru' | 'en' | 'de' | 'uk' | 'it' | 'nl' | 'fr' | 'es' | 'bg';

/**
 * Метаданные для выбора языка (флаг + название на самом языке)
 * Metadata for the language picker (flag + native name)
 */
export const LANGUAGE_META: Record<Language, { flag: string; label: string }> = {
    ru: { flag: '🇷🇺', label: 'Русский' },
    en: { flag: '🇬🇧', label: 'English' },
    de: { flag: '🇩🇪', label: 'Deutsch' },
    uk: { flag: '🇺🇦', label: 'Українська' },
    it: { flag: '🇮🇹', label: 'Italiano' },
    nl: { flag: '🇳🇱', label: 'Nederlands' },
    fr: { flag: '🇫🇷', label: 'Français' },
    es: { flag: '🇪🇸', label: 'Español' },
    bg: { flag: '🇧🇬', label: 'Български' },
};

const LANGUAGE_ORDER: Language[] = ['ru', 'en', 'de', 'uk', 'it', 'nl', 'fr', 'es', 'bg'];

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
        'app.name': 'Семейные мысли',
        'app.subtitle': 'Мысли парят в воздухе',
        'greeting': 'Привет',
        'friend': 'Друг',
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
        'thoughts_float': 'Мысли парят в воздухе',
        'placeholder': 'Пиши...',
        'voice_message': 'Голосовое сообщение',
        'photo': 'Фото',
        'send': 'Отправить',
        'back': 'Назад',
        'error': 'Ошибка',
        'no_access': 'Нет доступа к галерее',
        'profile': 'Профиль',
        'username': 'Имя пользователя',
        'email': 'Email',
        'change_avatar': 'Сменить аватар',
        'avatar_upload_failed': 'Не удалось загрузить аватар',
        'choose_language': 'Выберите язык',
    },
    en: {
        'app.name': 'Family Thoughts',
        'app.subtitle': 'Thoughts are floating in the air',
        'greeting': 'Hello',
        'friend': 'Friend',
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
        'thoughts_float': 'Thoughts are floating in the air',
        'placeholder': 'Write...',
        'voice_message': 'Voice message',
        'photo': 'Photo',
        'send': 'Send',
        'back': 'Back',
        'error': 'Error',
        'no_access': 'No gallery access',
        'profile': 'Profile',
        'username': 'Username',
        'email': 'Email',
        'change_avatar': 'Change avatar',
        'avatar_upload_failed': 'Failed to upload avatar',
        'choose_language': 'Choose language',
    },
    de: {
        'app.name': 'Familiengedanken',
        'app.subtitle': 'Gedanken schweben in der Luft',
        'greeting': 'Hallo',
        'friend': 'Freund',
        'select_chat': 'Chat auswählen',
        'all_chats': 'Alle',
        'group_chats': 'Gruppenchats',
        'group_chats_short': 'Gruppen',
        'private_chats': 'Privat',
        'no_chats': 'Keine Chats in dieser Kategorie',
        'soon': 'Bald verfügbar!',
        'members': 'Mitglieder',
        'sort_recent': 'Nach Aktivität',
        'sort_alpha': 'Alphabetisch',
        'thoughts_float': 'Gedanken schweben in der Luft',
        'placeholder': 'Schreib...',
        'voice_message': 'Sprachnachricht',
        'photo': 'Foto',
        'send': 'Senden',
        'back': 'Zurück',
        'error': 'Fehler',
        'no_access': 'Kein Zugriff auf die Galerie',
        'profile': 'Profil',
        'username': 'Benutzername',
        'email': 'E-Mail',
        'change_avatar': 'Avatar ändern',
        'avatar_upload_failed': 'Avatar konnte nicht hochgeladen werden',
        'choose_language': 'Sprache wählen',
    },
    uk: {
        'app.name': 'Сімейні думки',
        'app.subtitle': 'Думки витають у повітрі',
        'greeting': 'Привіт',
        'friend': 'Друже',
        'select_chat': 'Виберіть чат',
        'all_chats': 'Усі',
        'group_chats': 'Групові чати',
        'group_chats_short': 'Групи',
        'private_chats': 'Особисті',
        'no_chats': 'Немає чатів у цій категорії',
        'soon': 'Скоро з’являться!',
        'members': 'учасників',
        'sort_recent': 'За активністю',
        'sort_alpha': 'За алфавітом',
        'thoughts_float': 'Думки витають у повітрі',
        'placeholder': 'Пиши...',
        'voice_message': 'Голосове повідомлення',
        'photo': 'Фото',
        'send': 'Надіслати',
        'back': 'Назад',
        'error': 'Помилка',
        'no_access': 'Немає доступу до галереї',
        'profile': 'Профіль',
        'username': 'Ім’я користувача',
        'email': 'Email',
        'change_avatar': 'Змінити аватар',
        'avatar_upload_failed': 'Не вдалося завантажити аватар',
        'choose_language': 'Виберіть мову',
    },
    it: {
        'app.name': 'Pensieri di famiglia',
        'app.subtitle': 'I pensieri fluttuano nell’aria',
        'greeting': 'Ciao',
        'friend': 'Amico',
        'select_chat': 'Seleziona una chat',
        'all_chats': 'Tutte',
        'group_chats': 'Chat di gruppo',
        'group_chats_short': 'Gruppi',
        'private_chats': 'Private',
        'no_chats': 'Nessuna chat in questa categoria',
        'soon': 'In arrivo presto!',
        'members': 'membri',
        'sort_recent': 'Recenti',
        'sort_alpha': 'A-Z',
        'thoughts_float': 'I pensieri fluttuano nell’aria',
        'placeholder': 'Scrivi...',
        'voice_message': 'Messaggio vocale',
        'photo': 'Foto',
        'send': 'Invia',
        'back': 'Indietro',
        'error': 'Errore',
        'no_access': 'Nessun accesso alla galleria',
        'profile': 'Profilo',
        'username': 'Nome utente',
        'email': 'Email',
        'change_avatar': 'Cambia avatar',
        'avatar_upload_failed': 'Impossibile caricare l’avatar',
        'choose_language': 'Scegli la lingua',
    },
    nl: {
        'app.name': 'Familiegedachten',
        'app.subtitle': 'Gedachten zweven in de lucht',
        'greeting': 'Hallo',
        'friend': 'Vriend',
        'select_chat': 'Kies een chat',
        'all_chats': 'Alle',
        'group_chats': 'Groepschats',
        'group_chats_short': 'Groepen',
        'private_chats': 'Privé',
        'no_chats': 'Geen chats in deze categorie',
        'soon': 'Binnenkort beschikbaar!',
        'members': 'leden',
        'sort_recent': 'Op activiteit',
        'sort_alpha': 'Alfabetisch',
        'thoughts_float': 'Gedachten zweven in de lucht',
        'placeholder': 'Schrijf...',
        'voice_message': 'Spraakbericht',
        'photo': 'Foto',
        'send': 'Verzenden',
        'back': 'Terug',
        'error': 'Fout',
        'no_access': 'Geen toegang tot de galerij',
        'profile': 'Profiel',
        'username': 'Gebruikersnaam',
        'email': 'E-mail',
        'change_avatar': 'Avatar wijzigen',
        'avatar_upload_failed': 'Avatar uploaden mislukt',
        'choose_language': 'Kies taal',
    },
    fr: {
        'app.name': 'Pensées de famille',
        'app.subtitle': 'Les pensées flottent dans l’air',
        'greeting': 'Salut',
        'friend': 'Ami',
        'select_chat': 'Choisir une discussion',
        'all_chats': 'Toutes',
        'group_chats': 'Discussions de groupe',
        'group_chats_short': 'Groupes',
        'private_chats': 'Privées',
        'no_chats': 'Aucune discussion dans cette catégorie',
        'soon': 'Bientôt disponible !',
        'members': 'membres',
        'sort_recent': 'Récentes',
        'sort_alpha': 'A-Z',
        'thoughts_float': 'Les pensées flottent dans l’air',
        'placeholder': 'Écris...',
        'voice_message': 'Message vocal',
        'photo': 'Photo',
        'send': 'Envoyer',
        'back': 'Retour',
        'error': 'Erreur',
        'no_access': 'Pas d’accès à la galerie',
        'profile': 'Profil',
        'username': 'Nom d’utilisateur',
        'email': 'Email',
        'change_avatar': 'Changer l’avatar',
        'avatar_upload_failed': 'Échec du téléchargement de l’avatar',
        'choose_language': 'Choisir la langue',
    },
    es: {
        'app.name': 'Pensamientos familiares',
        'app.subtitle': 'Los pensamientos flotan en el aire',
        'greeting': 'Hola',
        'friend': 'Amigo',
        'select_chat': 'Selecciona un chat',
        'all_chats': 'Todos',
        'group_chats': 'Chats grupales',
        'group_chats_short': 'Grupos',
        'private_chats': 'Privados',
        'no_chats': 'No hay chats en esta categoría',
        'soon': '¡Próximamente!',
        'members': 'miembros',
        'sort_recent': 'Recientes',
        'sort_alpha': 'A-Z',
        'thoughts_float': 'Los pensamientos flotan en el aire',
        'placeholder': 'Escribe...',
        'voice_message': 'Mensaje de voz',
        'photo': 'Foto',
        'send': 'Enviar',
        'back': 'Atrás',
        'error': 'Error',
        'no_access': 'Sin acceso a la galería',
        'profile': 'Perfil',
        'username': 'Nombre de usuario',
        'email': 'Email',
        'change_avatar': 'Cambiar avatar',
        'avatar_upload_failed': 'No se pudo subir el avatar',
        'choose_language': 'Elige idioma',
    },
    bg: {
        'app.name': 'Семейни мисли',
        'app.subtitle': 'Мислите се реят във въздуха',
        'greeting': 'Здравей',
        'friend': 'Приятел',
        'select_chat': 'Изберете чат',
        'all_chats': 'Всички',
        'group_chats': 'Групови чатове',
        'group_chats_short': 'Групи',
        'private_chats': 'Лични',
        'no_chats': 'Няма чатове в тази категория',
        'soon': 'Очаквайте скоро!',
        'members': 'участници',
        'sort_recent': 'По активност',
        'sort_alpha': 'По азбучен ред',
        'thoughts_float': 'Мислите се реят във въздуха',
        'placeholder': 'Пиши...',
        'voice_message': 'Гласово съобщение',
        'photo': 'Снимка',
        'send': 'Изпрати',
        'back': 'Назад',
        'error': 'Грешка',
        'no_access': 'Няма достъп до галерията',
        'profile': 'Профил',
        'username': 'Потребителско име',
        'email': 'Имейл',
        'change_avatar': 'Смени аватара',
        'avatar_upload_failed': 'Неуспешно качване на аватара',
        'choose_language': 'Изберете език',
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
            if (saved && (LANGUAGE_ORDER as string[]).includes(saved)) {
                setLanguage(saved as Language);
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

/**
 * Открывает нативный выбор языка (список из 9 языков) через Alert.
 * Opens a native language picker (list of 9 languages) via Alert.
 */
export const showLanguagePicker = (
    currentLanguage: Language,
    setLanguage: (lang: Language) => void,
    title: string
) => {
    const options = LANGUAGE_ORDER.map((code) => ({
        text: `${LANGUAGE_META[code].flag} ${LANGUAGE_META[code].label}`,
        onPress: () => setLanguage(code),
    }));
    options.push({ text: currentLanguage === 'ru' ? 'Отмена' : 'Cancel', onPress: () => {} });
    Alert.alert(title, '', options);
};
