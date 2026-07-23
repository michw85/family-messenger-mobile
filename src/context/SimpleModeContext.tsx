/**
 * @file SimpleModeContext.tsx
 * @description Упрощённый режим интерфейса: крупный текст и крупные кнопки
 * для родственников, которым сложно с мелким интерфейсом
 * @description Simplified UI mode: larger text and bigger buttons for
 * relatives who find a small interface hard to use
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'simpleModeEnabled';

interface SimpleModeContextType {
    simpleMode: boolean;
    toggleSimpleMode: () => void;
    /** Множитель размера шрифта для экранов, поддерживающих упрощённый режим /
     * Font-size multiplier for screens that support the simplified mode */
    fontScale: number;
}

const SimpleModeContext = createContext<SimpleModeContextType | undefined>(undefined);

export const SimpleModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [simpleMode, setSimpleMode] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
            setSimpleMode(saved === 'true');
            setLoaded(true);
        });
    }, []);

    const toggleSimpleMode = () => {
        const next = !simpleMode;
        setSimpleMode(next);
        AsyncStorage.setItem(STORAGE_KEY, String(next));
    };

    const value = useMemo(
        () => ({ simpleMode, toggleSimpleMode, fontScale: simpleMode ? 1.35 : 1 }),
        [simpleMode]
    );

    if (!loaded) return null;

    return <SimpleModeContext.Provider value={value}>{children}</SimpleModeContext.Provider>;
};

export const useSimpleMode = () => {
    const context = useContext(SimpleModeContext);
    if (!context) {
        throw new Error('useSimpleMode must be used within SimpleModeProvider');
    }
    return context;
};
