/**
 * @file CreateChatModal.tsx
 * @description Модальное окно для создания нового чата (группового или личного)
 * @description Modal dialog for creating new chat (group or private)
 * 
 * @author Family Messenger Team
 * @version 1.0.0
 * @license MIT
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';

/**
 * Интерфейс пропсов компонента CreateChatModal
 * CreateChatModal component props interface
 * @property visible - Видимость модального окна / Modal visibility
 * @property onClose - Функция закрытия модального окна / Close modal function
 * @param onCreate - Функция создания чата / Create chat function
 */
interface CreateChatModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (name: string, type: 'group' | 'private') => void;
}

/**
 * Компонент модального окна создания чата
 * Create chat modal component
 */
const CreateChatModal: React.FC<CreateChatModalProps> = ({ visible, onClose, onCreate }) => {
    const { t } = useLanguage();
    const [chatName, setChatName] = useState<string>('');
    const [chatType, setChatType] = useState<'group' | 'private'>('group');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    /**
     * Обработчик создания чата
     * Create chat handler
     * Проверяет введённые данные и вызывает onCreate
     * Validates input and calls onCreate
     */
    const handleCreate = (): void => {
        // Валидация: имя чата не должно быть пустым / Validation: chat name must not be empty
        if (!chatName.trim()) {
            Alert.alert(t('error'), 'Введите название чата / Enter chat name');
            return;
        }

        setIsLoading(true);
        
        // Имитация задержки для UX / Simulate delay for UX
        setTimeout(() => {
            onCreate(chatName.trim(), chatType);
            setChatName('');
            setChatType('group');
            setIsLoading(false);
            onClose();
        }, 300);
    };

    /**
     * Рендер кнопки выбора типа чата
     * Render chat type selection button
     * @param type - Тип чата ('group' или 'private') / Chat type ('group' or 'private')
     * @param label - Текст кнопки / Button text
     * @param icon - Иконка кнопки / Button icon
     */
    const renderTypeButton = (type: 'group' | 'private', label: string, icon: string) => (
        <TouchableOpacity
            style={[styles.typeButton, chatType === type && styles.typeButtonActive]}
            onPress={() => setChatType(type)}
            activeOpacity={0.7}
        >
            <Text style={styles.typeIcon}>{icon}</Text>
            <Text style={[styles.typeText, chatType === type && styles.typeTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            {/* Затемнённый фон / Darkened background */}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContainer}
                    >
                        <View style={styles.modalContent}>
                            {/* Заголовок модального окна / Modal header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>✨ Новый чат / New chat</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Text style={styles.closeText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Поле ввода названия чата / Chat name input field */}
                            <TextInput
                                style={styles.input}
                                placeholder="Название чата / Chat name"
                                placeholderTextColor="#95A5A6"
                                value={chatName}
                                onChangeText={setChatName}
                                autoCapitalize="none"
                                autoFocus={true}
                            />

                            {/* Выбор типа чата / Chat type selection */}
                            <Text style={styles.sectionTitle}>Тип чата / Chat type</Text>
                            <View style={styles.typeContainer}>
                                {renderTypeButton('group', 'Групповой / Group', '👥')}
                                {renderTypeButton('private', 'Личный / Private', '👤')}
                            </View>

                            {/* Пояснение к типам чата / Chat type explanation */}
                            <Text style={styles.hint}>
                                {chatType === 'group' 
                                    ? '👥 Групповой чат для общения с несколькими людьми / Group chat for multiple people'
                                    : '👤 Личный чат для общения один на один / Private chat for one-on-one conversation'}
                            </Text>

                            {/* Кнопка создания / Create button */}
                            <TouchableOpacity
                                style={[styles.createButton, (!chatName.trim() || isLoading) && styles.createButtonDisabled]}
                                onPress={handleCreate}
                                disabled={!chatName.trim() || isLoading}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.createButtonText}>
                                    {isLoading ? '⌛' : '➕ Создать / Create'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

/**
 * Стили компонента CreateChatModal
 * CreateChatModal component styles
 */
const styles = StyleSheet.create({
    // Затемнённый фон / Darkened overlay
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Контейнер модального окна / Modal container
    modalContainer: {
        width: '90%',
        maxWidth: 400,
    },
    // Содержимое модального окна / Modal content
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    // Заголовок модального окна / Modal header
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    // Заголовок / Title
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2C3E50',
    },
    // Кнопка закрытия / Close button
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F0F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Текст кнопки закрытия / Close button text
    closeText: {
        fontSize: 18,
        color: '#8A9AAA',
    },
    // Поле ввода / Input field
    input: {
        borderWidth: 1,
        borderColor: '#E8E8E8',
        borderRadius: 30,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8F8FA',
        fontSize: 16,
        color: '#2C3E50',
        marginBottom: 20,
    },
    // Заголовок секции / Section title
    sectionTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#8A9AAA',
        marginBottom: 12,
    },
    // Контейнер для кнопок типа чата / Chat type buttons container
    typeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    // Кнопка выбора типа / Type selection button
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 30,
        backgroundColor: '#F0F0F5',
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    // Активная кнопка типа / Active type button
    typeButtonActive: {
        backgroundColor: '#6C5CE7',
        borderColor: '#6C5CE7',
    },
    // Иконка типа чата / Chat type icon
    typeIcon: {
        fontSize: 18,
    },
    // Текст типа чата / Chat type text
    typeText: {
        fontSize: 12,
        color: '#2C3E50',
    },
    // Активный текст типа чата / Active chat type text
    typeTextActive: {
        color: '#FFFFFF',
    },
    // Подсказка / Hint text
    hint: {
        fontSize: 12,
        color: '#95A5A6',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    // Кнопка создания / Create button
    createButton: {
        backgroundColor: '#6C5CE7',
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: 'center',
    },
    // Отключённая кнопка создания / Disabled create button
    createButtonDisabled: {
        backgroundColor: '#B0A0D0',
        opacity: 0.7,
    },
    // Текст кнопки создания / Create button text
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CreateChatModal;