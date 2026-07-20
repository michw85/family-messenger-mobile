
// /**
//  * @file useKeyboard.ts
//  * @description Хук для отслеживания состояния клавиатуры (высота, видимость)
//  * @description Hook for tracking keyboard state (height, visibility)
//  * 
//  * @author Bonds Team
//  * @version 1.0.0
//  * @license MIT
//  */

// import { useState, useEffect } from 'react';
// import { Keyboard, Platform, KeyboardEvent } from 'react-native';

// /**
//  * Интерфейс состояния клавиатуры
//  * Keyboard state interface
//  * @property isVisible - Видима ли клавиатура / Is keyboard visible
//  * @property height - Высота клавиатуры в пикселях / Keyboard height in pixels
//  */
// interface KeyboardState {
//     isVisible: boolean;
//     height: number;
// }

// /**
//  * Хук для отслеживания состояния клавиатуры
//  * Hook for tracking keyboard state
//  * @returns Объект с состоянием клавиатуры / Object with keyboard state
//  * 
//  * @example
//  * const { isVisible, height } = useKeyboard();
//  * // Использование: изменяем отступ при появлении клавиатуры
//  * // Usage: adjust padding when keyboard appears
//  */

// export const useKeyboard = (): KeyboardState => {
//     // Состояние клавиатуры / Keyboard state
//     const [keyboardState, setKeyboardState] = useState<KeyboardState>({
//         isVisible: false,
//         height: 0,
//     });

//     useEffect(() => {
//         /**
//          * Обработчик появления клавиатуры
//          * Keyboard show handler
//          * @param e - Событие клавиатуры / Keyboard event
//          */
//         const showSubscription = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
//             setKeyboardState({
//                 isVisible: true,
//                 height: e.endCoordinates.height,
//             });
//         });

//         /**
//          * Обработчик скрытия клавиатуры
//          * Keyboard hide handler
//          */
//         const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
//             setKeyboardState({
//                 isVisible: false,
//                 height: 0,
//             });
//         });

//         // Очистка подписок при размонтировании / Cleanup subscriptions on unmount
//         return () => {
//             showSubscription.remove();
//             hideSubscription.remove();
//         };
//     }, []);

//     return keyboardState;
// };

// hooks/useKeyboard.ts (уже есть, но нужно доработать)
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

export const useKeyboard = () => {
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    useEffect(() => {
        const showListener = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
            setKeyboardHeight(e.endCoordinates.height);
            setIsKeyboardVisible(true);
        });
        const hideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
            setIsKeyboardVisible(false);
        });

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    return { keyboardHeight, isKeyboardVisible };
};