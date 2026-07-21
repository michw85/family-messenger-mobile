/**
 * @file ThemeContext.tsx
 * @description Контекст для управления темой приложения (светлая/тёмная)
 * @description Context for managing the app's theme (light/dark)
 *
 * @author Bonds Team
 * @version 1.0.0
 * @license MIT
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, AppColors } from '../styles/theme';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'themeOverride';

interface ThemeContextType {
    /** Тема, реально применяемая сейчас / The theme actually applied right now */
    theme: ThemeMode;
    /** Цвета текущей темы / Colors of the current theme */
    colors: AppColors;
    /** Переключить между светлой и тёмной (сохраняется как явный выбор пользователя) /
     * Toggle between light and dark (persisted as an explicit user choice) */
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Провайдер темы. Пока пользователь ни разу не переключал тему вручную,
 * следует системной настройке телефона. Как только пользователь один раз
 * нажал переключатель, его выбор запоминается и системная тема больше не
 * учитывается.
 * Theme provider. Until the user manually toggles the theme, it follows the
 * phone's system setting. Once the user has toggled it once, that choice is
 * remembered and the system theme is no longer consulted.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [override, setOverride] = useState<ThemeMode | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
            if (saved === 'light' || saved === 'dark') {
                setOverride(saved);
            }
            setLoaded(true);
        });
    }, []);

    const theme: ThemeMode = override ?? (systemScheme === 'dark' ? 'dark' : 'light');

    const toggleTheme = () => {
        const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
        setOverride(next);
        AsyncStorage.setItem(STORAGE_KEY, next);
    };

    const value = useMemo(
        () => ({ theme, colors: theme === 'dark' ? darkColors : lightColors, toggleTheme }),
        [theme]
    );

    // Не рендерим детей, пока не прочитали сохранённый выбор темы, иначе на
    // мгновение мелькнёт не та тема
    // Don't render children until the saved theme choice has been read,
    // otherwise the wrong theme flashes for an instant
    if (!loaded) return null;

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Хук для использования темы
 * Hook for using the theme
 */
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
