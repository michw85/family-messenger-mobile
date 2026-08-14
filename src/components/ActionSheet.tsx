/**
 * @file ActionSheet.tsx
 * @description Кастомное меню-список вместо Alert.alert с большим числом
 * кнопок. Alert.alert на Android жёстко ограничен 3 кнопками (нативный
 * AlertDialog поддерживает только positive/negative/neutral) - при попытке
 * передать больше вариантов Android молча показывает только первые 3,
 * включая кнопку "Отмена", если она не попала в это число. Этот компонент
 * рендерит все варианты сам, без ограничения по количеству.
 * @description Custom list-menu replacing Alert.alert for menus with many
 * buttons. Alert.alert on Android is hard-capped at 3 buttons (the native
 * AlertDialog only has positive/negative/neutral slots) - passing more
 * options silently shows only the first 3, possibly dropping "Cancel"
 * entirely. This component renders every option itself, with no such cap.
 *
 * @author Bonds Team
 * @version 1.0.0
 * @license MIT
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows } from '../styles/theme';

export interface ActionSheetOption {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface ActionSheetContextType {
    showActionSheet: (title: string, options: ActionSheetOption[]) => void;
}

const ActionSheetContext = createContext<ActionSheetContextType | undefined>(undefined);

export const ActionSheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState<ActionSheetOption[]>([]);

    const showActionSheet = useCallback((title: string, opts: ActionSheetOption[]) => {
        setTitle(title);
        setOptions(opts);
        setVisible(true);
    }, []);

    const close = () => setVisible(false);

    // Небольшая задержка перед вызовом onPress - даёт модалке время закрыться,
    // прежде чем действие само откроет что-то ещё (другой ActionSheet, Alert)
    // A short delay before calling onPress - lets the modal finish closing
    // before the action itself opens something else (another ActionSheet, Alert)
    const handlePress = (option: ActionSheetOption) => {
        close();
        setTimeout(() => option.onPress?.(), 80);
    };

    const cancelOption = options.find((o) => o.style === 'cancel');
    const regularOptions = options.filter((o) => o.style !== 'cancel');

    return (
        <ActionSheetContext.Provider value={{ showActionSheet }}>
            {children}
            <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[styles.sheet, { backgroundColor: colors.backgroundLight, paddingBottom: spacing.xl + insets.bottom }]}
                        onPress={() => {}}
                    >
                        {!!title && (
                            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        )}
                        <ScrollView style={styles.scroll} bounces={false}>
                            {regularOptions.map((option, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.option, { borderBottomColor: colors.border }]}
                                    onPress={() => handlePress(option)}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            { color: option.style === 'destructive' ? '#E74C3C' : colors.text },
                                        ]}
                                    >
                                        {option.text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.cancelButton, { backgroundColor: colors.background }]}
                            onPress={() => (cancelOption ? handlePress(cancelOption) : close())}
                        >
                            <Text style={[styles.cancelText, { color: colors.primary }]}>
                                {cancelOption?.text || 'Отмена / Cancel'}
                            </Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </ActionSheetContext.Provider>
    );
};

/**
 * Хук для показа меню-списка вместо Alert.alert
 * Hook to show a list-menu in place of Alert.alert
 */
export const useActionSheet = () => {
    const context = useContext(ActionSheetContext);
    if (!context) {
        throw new Error('useActionSheet must be used within ActionSheetProvider');
    }
    return context.showActionSheet;
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: borderRadius.large,
        borderTopRightRadius: borderRadius.large,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
        maxHeight: '75%',
        ...shadows.medium,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
    },
    scroll: {
        flexGrow: 0,
    },
    option: {
        paddingVertical: spacing.md + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionText: {
        fontSize: 16,
        textAlign: 'center',
    },
    cancelButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.medium,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
});
