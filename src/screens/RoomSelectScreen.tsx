/**
 * @file RoomSelectScreen.tsx
 * @description Экран выбора чата – загружает реальные данные с бэкенда через API
 * @description Chat selection screen – loads real data from backend via API
 * 
 * @author Bonds Team
 * @version 6.0.0
 * @license MIT
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingClouds from '../components/FloatingClouds';
import { useLanguage, useLanguagePicker, LANGUAGE_META } from '../context/LanguageContext';
import { useActionSheet } from '../components/ActionSheet';
import { useTheme } from '../context/ThemeContext';
import { useSimpleMode } from '../context/SimpleModeContext';
import {
    fetchChats, createChat, deleteChat, leaveChat, muteChat, unmuteChat, renameChat, logout,
    searchUsers, addParticipants,
} from '../services/api';
import CreateChatModal from '../components/CreateChatModal';
import RenameChatModal from '../components/RenameChatModal';
import { spacing, borderRadius, shadows, typography, AppColors } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NOTEBOOK_MARKER, isNotebookChat } from '../utils/notebook';


/**
 * Интерфейс чата, получаемый с бэкенда
 * Chat interface from backend
 */
interface ChatRoom {
    id: string;
    name: string;
    type: 'GROUP' | 'DIRECT' | 'FAMILY';
    createdBy: number;
    participants: Array<{ id: number; username: string; avatarUrl?: string | null }>;
    createdAt: string;
    lastActivityAt: string;
    mutedForCurrentUser: boolean;
    groupAdminUserIds?: number[];
    editorUserIds?: number[];
}

/** Фильтр по типу чата на экране выбора / Chat-type filter on the room-select screen */
type ChatFilter = 'ALL' | 'PERSONAL' | 'GROUP';

/** Пользователь, найденный поиском (не обязательно уже есть личный чат) / A user found via search (may not have a personal chat yet) */
interface FoundUser {
    id: number;
    username: string;
    email: string;
    avatarUrl?: string | null;
}

/**
 * Экран выбора чата
 * Chat selection screen
 */
const RoomSelectScreen: React.FC<any> = ({ navigation }) => {
    const { t, language, setLanguage } = useLanguage();
    const showActionSheet = useActionSheet();
    const { theme, colors, toggleTheme } = useTheme();
    const { simpleMode, toggleSimpleMode, fontScale } = useSimpleMode();
    const styles = useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
    const insets = useSafeAreaInsets();
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [currentUsername, setCurrentUsername] = useState<string>('');
    const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
    // Суперадмин (владелец приложения) - может удалить чужой блокнот навсегда, см. задачу #61
    // Superadmin (app owner) - can permanently delete someone else's notebook, see task #61
    const [isSuperadmin, setIsSuperadmin] = useState(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [renamingChat, setRenamingChat] = useState<ChatRoom | null>(null);
    const [filter, setFilter] = useState<ChatFilter>('ALL');
    // По умолчанию - по недавней активности (как бэкенд и отдаёт список), А-Я - по запросу
    // Default is recent activity (matches what the backend already returns), A-Z on request
    const [sortAlpha, setSortAlpha] = useState<boolean>(false);

    // Поиск чатов (по названию/участнику, локально) и людей (через API, чтобы
    // начать новый личный чат с тем, с кем ещё нет переписки)
    // Search chats (by name/participant, locally) and people (via the API, to
    // start a new personal chat with someone there's no existing chat with)
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [foundUsers, setFoundUsers] = useState<FoundUser[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [startingChatWith, setStartingChatWith] = useState<number | null>(null);

    // Разовый баннер про автоудаление видео/файлов через 30 дней - показывается,
    // пока пользователь не закроет его сам, потом не появляется больше никогда
    // One-time banner about video/file auto-deletion after 30 days - shown
    // until the user dismisses it, then never appears again
    const [showRetentionBanner, setShowRetentionBanner] = useState(false);
    useEffect(() => {
        AsyncStorage.getItem('media_retention_notice_dismissed').then((dismissed) => {
            if (!dismissed) setShowRetentionBanner(true);
        });
    }, []);
    const dismissRetentionBanner = () => {
        setShowRetentionBanner(false);
        AsyncStorage.setItem('media_retention_notice_dismissed', 'true');
    };

    /**
     * Загрузка чатов с бэкенда
     * Load chats from backend
     */
    const loadChats = async () => {
        try {
            const response = await fetchChats();
            let loaded: ChatRoom[] = response.data;
            // Блокнот создаётся один раз при первом входе - проверяем по факту
            // наличия на сервере (а не флагом в AsyncStorage), чтобы это
            // переживало переустановку приложения и вход с другого устройства
            // The notebook is created once on first login - checked by whether
            // it actually exists server-side (not an AsyncStorage flag), so it
            // survives reinstalls and logging in from another device
            if (!loaded.some(isNotebookChat)) {
                try {
                    await createChat(NOTEBOOK_MARKER, 'DIRECT');
                    const refreshed = await fetchChats();
                    loaded = refreshed.data;
                } catch (provisionError) {
                    console.error('Failed to provision notebook chat:', provisionError);
                }
            }
            setChats(loaded);
        } catch (error) {
            console.error('Failed to load chats:', error);
            Alert.alert(t('error'), t('could_not_load_chats'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    /**
     * Загрузка имени текущего пользователя
     * Load current username
     */
    const loadUser = async () => {
        const name = await AsyncStorage.getItem('username');
        if (name) setCurrentUsername(name);
        const avatarUrl = await AsyncStorage.getItem('avatarUrl');
        setMyAvatarUrl(avatarUrl);
        const superadmin = await AsyncStorage.getItem('isSuperadmin');
        setIsSuperadmin(superadmin === 'true');
    };

    useEffect(() => {
        loadUser();
        loadChats();
        // Обновляем аватар при возврате с экрана профиля (там он мог смениться)
        // Refresh the avatar when returning from the profile screen (it may have changed there)
        const unsubscribe = navigation.addListener('focus', loadUser);
        return unsubscribe;
    }, [navigation]);

    /**
     * Обработчик "потянуть для обновления"
     * Pull-to-refresh handler
     */
    const onRefresh = () => {
        setRefreshing(true);
        loadChats();
    };

    /**
     * Создание нового чата (группового или личного)
     * Create new chat (group or direct)
     * @param name - название чата
     * @param type - тип чата: 'group' (GROUP) или 'private' (DIRECT)
     */
    const handleCreateChat = async (name: string, type: 'group' | 'private') => {
        const backendType = type === 'group' ? 'GROUP' : 'DIRECT';
        try {
            await createChat(name, backendType);
            await loadChats(); // обновить список
        } catch (error) {
            Alert.alert(t('error'), t('could_not_create_chat'));
        }
    };

    /**
     * Переименование чата, выбранного через долгий тап
     * Renaming the chat selected via long-press
     */
    const handleRenameChat = async (name: string) => {
        if (!renamingChat) return;
        try {
            await renameChat(renamingChat.id, name);
            await loadChats();
        } catch (error) {
            Alert.alert(t('error'), t('could_not_rename_chat'));
        }
    };

    /**
     * Покинуть чат (группа) / удалить чат у себя (личный) - доступно любому
     * участнику. Создатель группового чата дополнительно может удалить его
     * целиком для всех.
     * Leave a chat (group) / delete a chat for yourself (personal) -
     * available to any participant. A group chat's creator additionally
     * gets the option to delete it entirely for everyone.
     * @param item - чат, по которому был долгий тап
     */
    const handleChatLongPress = (item: ChatRoom) => {
        const myId = item.participants.find((p) => p.username === currentUsername)?.id;
        const isCreator = myId !== undefined && myId === item.createdBy;
        const isGroupAdmin = myId !== undefined && !!item.groupAdminUserIds?.includes(myId);
        const isGroup = item.type === 'GROUP';

        const buttons: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [
            { text: t('cancel'), style: 'cancel' },
        ];

        buttons.push({
            text: item.mutedForCurrentUser ? t('unmute_chat') : t('mute_chat'),
            onPress: async () => {
                if (item.mutedForCurrentUser) {
                    await unmuteChat(item.id);
                } else {
                    await muteChat(item.id);
                }
                await loadChats();
            },
        });

        buttons.push({
            text: t('rename_chat'),
            onPress: () => setRenamingChat(item),
        });

        if (isGroup) {
            buttons.push({
                text: t('leave_chat'),
                style: 'destructive',
                onPress: async () => {
                    await leaveChat(item.id);
                    await loadChats();
                },
            });
            if (isCreator || isGroupAdmin || isSuperadmin) {
                buttons.push({
                    text: t('delete_for_everyone'),
                    style: 'destructive',
                    onPress: async () => {
                        await deleteChat(item.id);
                        await loadChats();
                    },
                });
            }
        } else {
            buttons.push({
                text: t('delete_chat'),
                style: 'destructive',
                onPress: async () => {
                    await leaveChat(item.id);
                    await loadChats();
                },
            });
            // Обычный пользователь может только скрыть свой блокнот (кнопка выше,
            // leaveChat) - безвозвратно удалить чужой личный чат/блокнот может
            // только суперадмин, см. задачу #61
            // A regular user can only hide their own notebook (button above,
            // leaveChat) - permanently deleting someone else's personal
            // chat/notebook is superadmin-only, see task #61
            if (isSuperadmin) {
                buttons.push({
                    text: t('delete_forever_superadmin'),
                    style: 'destructive',
                    onPress: async () => {
                        await deleteChat(item.id);
                        await loadChats();
                    },
                });
            }
        }

        // showActionSheet вместо Alert.alert - у Android нативный AlertDialog
        // поддерживает максимум 3 кнопки (positive/negative/neutral), лишние
        // молча отбрасываются; здесь их может быть до 4
        // showActionSheet instead of Alert.alert - Android's native AlertDialog
        // only supports 3 buttons (positive/negative/neutral) and silently
        // drops the rest; this menu can have up to 4
        showActionSheet(item.name, buttons);
    };

    /**
     * Список чатов после фильтра (личные/групповые) и сортировки
     * (по активности по умолчанию, либо по алфавиту)
     * Chat list after the personal/group filter and sorting
     * (recent activity by default, or alphabetical)
     */
    const visibleChats = useMemo(() => {
        let list = chats;
        if (filter === 'GROUP') {
            list = list.filter((c) => c.type === 'GROUP');
        } else if (filter === 'PERSONAL') {
            list = list.filter((c) => c.type !== 'GROUP');
        }
        const query = searchQuery.trim().toLowerCase();
        if (query) {
            list = list.filter((c) =>
                (isNotebookChat(c) ? t('notebook_chat_name') : c.name).toLowerCase().includes(query) ||
                c.participants.some((p) => p.username.toLowerCase().includes(query))
            );
        }
        list = [...list];
        if (sortAlpha) {
            list.sort((a, b) => a.name.localeCompare(b.name, language));
        } else {
            list.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
        }
        // Блокнот всегда закреплён первым, независимо от сортировки/фильтра
        // The notebook is always pinned first, regardless of sort/filter
        const notebookIndex = list.findIndex(isNotebookChat);
        if (notebookIndex > 0) {
            const [notebook] = list.splice(notebookIndex, 1);
            list.unshift(notebook);
        }
        return list;
    }, [chats, filter, sortAlpha, language, searchQuery]);

    /**
     * ID пользователей, с которыми уже есть личный (не групповой) чат - чтобы
     * не предлагать "начать новый чат" с тем, кто уже есть в списке выше
     * IDs of users who already have a personal (non-group) chat - so "start
     * new chat" doesn't suggest someone already shown in the list above
     */
    const existingDirectUserIds = useMemo(() => {
        const ids = new Set<number>();
        chats.filter((c) => c.type !== 'GROUP').forEach((c) => {
            c.participants.forEach((p) => {
                if (p.username !== currentUsername) ids.add(p.id);
            });
        });
        return ids;
    }, [chats, currentUsername]);

    /**
     * Поиск пользователей (для начала нового чата), с задержкой
     * User search (to start a new chat), debounced
     */
    useEffect(() => {
        const query = searchQuery.trim();
        if (!searchVisible || query.length < 2) {
            setFoundUsers([]);
            return;
        }
        const timeout = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const response = await searchUsers(query);
                setFoundUsers(
                    (response.data as FoundUser[]).filter((u) => !existingDirectUserIds.has(u.id))
                );
            } catch (error) {
                console.error('User search failed:', error);
            } finally {
                setSearchingUsers(false);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, searchVisible, existingDirectUserIds]);

    /**
     * Начать новый личный чат с найденным пользователем: создать пустой DIRECT-
     * чат, добавить его участником, обновить список и сразу открыть чат
     * Start a new personal chat with a found user: create an empty DIRECT
     * chat, add them as a participant, refresh the list, and open the chat
     */
    const handleStartChatWithUser = async (foundUser: FoundUser) => {
        setStartingChatWith(foundUser.id);
        try {
            const { data: newChat } = await createChat(foundUser.username, 'DIRECT');
            await addParticipants(newChat.id, [foundUser.id]);
            await loadChats();
            setSearchVisible(false);
            setSearchQuery('');
            navigation.navigate('ChatRoom', {
                roomId: newChat.id,
                roomName: newChat.name,
                roomType: 'DIRECT',
                otherParticipant: { id: foundUser.id, username: foundUser.username, avatarUrl: foundUser.avatarUrl },
            });
        } catch (error) {
            Alert.alert(t('error'), t('could_not_create_chat'));
        } finally {
            setStartingChatWith(null);
        }
    };

    /**
     * Рендер одного элемента чата
     * Render a single chat item
     */
    const renderChatItem = ({ item }: { item: ChatRoom }) => {
        // Для личных чатов показываем аватар собеседника (если он есть), для групп - инициал названия чата
        // For personal chats show the other participant's avatar (if any), for groups the chat-name initial
        const otherParticipant = item.type !== 'GROUP'
            ? item.participants.find((p) => p.username !== currentUsername)
            : null;
        const isNotebook = isNotebookChat(item);

        return (
        <TouchableOpacity
            style={styles.chatCard}
            onPress={() => navigation.navigate('ChatRoom', {
                roomId: item.id,
                roomName: isNotebook ? t('notebook_chat_name') : item.name,
                roomType: item.type,
                otherParticipant: otherParticipant
                    ? { id: otherParticipant.id, username: otherParticipant.username, avatarUrl: otherParticipant.avatarUrl }
                    : undefined,
            })}
            onLongPress={() => handleChatLongPress(item)}
            delayLongPress={500}
            activeOpacity={0.7}
        >
            <View style={[
                styles.avatar,
                isNotebook
                    ? { backgroundColor: colors.notebookAccentLight, borderColor: colors.notebookAccent }
                    : { backgroundColor: colors.accentLight, borderColor: colors.accent },
            ]}>
                {isNotebook ? (
                    <Text style={styles.avatarText}>📓</Text>
                ) : otherParticipant?.avatarUrl ? (
                    <Image source={{ uri: otherParticipant.avatarUrl }} style={styles.avatarImage} />
                ) : (
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {item.name.charAt(0).toUpperCase()}
                    </Text>
                )}
            </View>
            <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{isNotebook ? t('notebook_chat_name') : item.name}</Text>
                <Text style={styles.chatType}>
                    {isNotebook
                        ? t('notebook_chat_label')
                        : item.type === 'GROUP' ? '👥 ' + t('group_chats') : '👤 ' + t('private_chats')}
                </Text>
            </View>
            {item.mutedForCurrentUser && <Text style={styles.muteIcon}>🔕</Text>}
            <Text style={[styles.arrow, { color: colors.accent }]}>›</Text>
        </TouchableOpacity>
        );
    };

    /**
     * Переключение языка
     * Toggle language
     */
    const openLanguagePicker = useLanguagePicker();

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    /* Выйти из аккаунта/ Exit */
    const handleLogout = async () => {
        Alert.alert(
            t('logout_confirm_title'),
            t('logout_confirm_message'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('logout_confirm_button'),
                    style: 'destructive',
                    onPress: async () => {
                        // Раньше здесь просто чистили AsyncStorage вручную, не трогая
                        // refreshToken - он оставался рабочим и на сервере, и на устройстве
                        // после "выхода". logout() из api.ts отзывает refresh-токен на
                        // сервере и чистит оба токена из SecureStore.
                        // This used to just wipe AsyncStorage by hand without touching
                        // refreshToken - it stayed valid both server-side and on the device
                        // after "logging out". api.ts's logout() revokes the refresh token
                        // server-side and clears both tokens from SecureStore.
                        await logout();
                        navigation.replace('Login');
                    }
                }
            ]
        );
    };

    return (
        <LinearGradient colors={colors.backgroundGradient as [string, string, string]} style={styles.container}>
            <FloatingClouds />
            <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.myAvatarButton}>
                            {myAvatarUrl ? (
                                <Image source={{ uri: myAvatarUrl }} style={styles.myAvatarImage} />
                            ) : (
                                <Text style={[styles.myAvatarInitial, { color: colors.primary }]}>
                                    {(currentUsername || '?').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </TouchableOpacity>
                        <Text style={[styles.greeting, { flex: 1 }]}>
                            {t('greeting')}, {currentUsername || t('friend')}! 👋
                        </Text>
                        <TouchableOpacity onPress={toggleTheme} style={styles.langButton}>
                            <Text style={styles.langText}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={toggleSimpleMode}
                            style={[styles.langButton, simpleMode && { backgroundColor: colors.primary }]}
                        >
                            <Text style={[styles.langText, simpleMode && { color: colors.textLight }]}>Aa</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={openLanguagePicker} style={styles.langButton}>
                            {/* Нейтральный флаг для русского не читается как "переключатель языка"
                                без подписи - добавляем код языка мелким текстом рядом с флагом */}
                            {/* The neutral flag for Russian doesn't read as a "language switcher"
                                without a label - adding the language code in small text next to the flag */}
                            <Text style={styles.langText}>{LANGUAGE_META[language].flag} {language.toUpperCase()}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <Text style={styles.logoutText}>⎋</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{t('select_chat')}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setSearchVisible((v) => !v);
                                if (searchVisible) setSearchQuery('');
                            }}
                            style={styles.titleSearchButton}
                        >
                            <Text style={styles.langText}>🔍</Text>
                        </TouchableOpacity>
                    </View>

                    {showRetentionBanner && (
                        <View style={styles.retentionBanner}>
                            <Text style={styles.retentionBannerText}>{t('media_retention_banner')}</Text>
                            <TouchableOpacity onPress={dismissRetentionBanner} style={styles.retentionBannerClose}>
                                <Text style={styles.retentionBannerCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {searchVisible && (
                        <TextInput
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={t('search_chats_and_people_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                            autoFocus
                        />
                    )}

                    <View style={styles.filterRow}>
                        <View style={styles.segmentGroup}>
                            {([
                                ['ALL', t('all_chats')],
                                ['PERSONAL', t('private_chats')],
                                ['GROUP', t('group_chats_short')],
                            ] as [ChatFilter, string][]).map(([key, label]) => (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => setFilter(key)}
                                    style={[styles.segment, filter === key && styles.segmentActive]}
                                >
                                    <Text style={[styles.segmentText, filter === key && styles.segmentTextActive]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity onPress={() => setSortAlpha((prev) => !prev)} style={styles.sortButton}>
                            <Text style={styles.sortButtonText}>{sortAlpha ? t('sort_alpha') : t('sort_recent')}</Text>
                        </TouchableOpacity>
                    </View>

                    {searchVisible && searchQuery.trim().length >= 2 && (
                        <View style={styles.userResultsBox}>
                            {searchingUsers ? (
                                <ActivityIndicator size="small" color={colors.primary} style={{ padding: spacing.md }} />
                            ) : foundUsers.length > 0 ? (
                                <>
                                    <Text style={styles.userResultsLabel}>{t('start_new_chat_label')}</Text>
                                    {foundUsers.map((u) => (
                                        <TouchableOpacity
                                            key={u.id}
                                            style={styles.userResultRow}
                                            onPress={() => handleStartChatWithUser(u)}
                                            disabled={startingChatWith !== null}
                                        >
                                            <View style={[styles.avatar, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
                                                {u.avatarUrl ? (
                                                    <Image source={{ uri: u.avatarUrl }} style={styles.avatarImage} />
                                                ) : (
                                                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.chatName}>{u.username}</Text>
                                                <Text style={styles.userResultEmail}>{u.email}</Text>
                                            </View>
                                            {startingChatWith === u.id && <ActivityIndicator size="small" color={colors.primary} />}
                                        </TouchableOpacity>
                                    ))}
                                </>
                            ) : null}
                        </View>
                    )}
                </View>

                <FlatList
                    data={visibleChats}
                    keyExtractor={(item) => item.id}
                    renderItem={renderChatItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>💛</Text>
                            <Text style={styles.emptyText}>{t('no_chats')}</Text>
                            <Text style={styles.emptySubtext}>{t('soon')}</Text>
                        </View>
                    }
                />

                <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => setModalVisible(true)}>
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            </View>

            <CreateChatModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onCreate={handleCreateChat}
            />

            <RenameChatModal
                visible={renamingChat !== null}
                currentName={renamingChat ? (isNotebookChat(renamingChat) ? t('notebook_chat_name') : renamingChat.name) : ''}
                onClose={() => setRenamingChat(null)}
                onRename={handleRenameChat}
            />
        </LinearGradient>
    );
};

const createStyles = (colors: AppColors, fontScale: number = 1) => StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: 60 },
    header: { marginBottom: spacing.xxl },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm, },
    greeting: { fontSize: 14 * fontScale, color: colors.textSecondary, flexShrink: 1, },
    myAvatarButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.accentLight,
        borderWidth: 1,
        borderColor: colors.accent,
        overflow: 'hidden',
    },
    myAvatarImage: { width: '100%', height: '100%' },
    myAvatarInitial: { fontSize: 14, fontWeight: '700' },
    langButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.pillBackground,
        borderRadius: borderRadius.medium,
        ...shadows.soft,
    },
    langText: { fontSize: 11, fontWeight: '500', color: colors.primary, letterSpacing: 0.3 },
    title: { fontSize: 28 * fontScale, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    titleSearchButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.pillBackground,
        borderRadius: borderRadius.medium,
        ...shadows.soft,
    },
    filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    segmentGroup: {
        flexDirection: 'row',
        backgroundColor: colors.pillBackground,
        borderRadius: borderRadius.medium,
        padding: 3,
        gap: 2,
    },
    segment: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.small,
    },
    segmentActive: {
        backgroundColor: colors.primary,
    },
    segmentText: { fontSize: 12 * fontScale, fontWeight: '500', color: colors.textSecondary },
    segmentTextActive: { color: colors.textLight },
    sortButton: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    sortButtonText: { fontSize: 12 * fontScale, fontWeight: '500', color: colors.primary, textDecorationLine: 'underline' },
    retentionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
        borderRadius: borderRadius.medium,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.soft,
    },
    retentionBannerText: {
        flex: 1,
        fontSize: 12 * fontScale,
        color: colors.textSecondary,
        lineHeight: 17 * fontScale,
    },
    retentionBannerClose: {
        paddingLeft: spacing.sm,
    },
    retentionBannerCloseText: {
        fontSize: 16,
        color: colors.textMuted,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xlarge,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.backgroundLight,
        fontSize: 15 * fontScale,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    userResultsBox: {
        backgroundColor: colors.backgroundLight,
        borderRadius: borderRadius.medium,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
        marginTop: spacing.sm,
        ...shadows.soft,
    },
    userResultsLabel: {
        fontSize: 12 * fontScale,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
    },
    userResultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.xs,
    },
    userResultEmail: { fontSize: 12 * fontScale, color: colors.textSecondary, marginTop: 1 },
    listContent: { paddingBottom: 80 },
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
        borderRadius: borderRadius.medium,
        padding: spacing.md * fontScale,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.soft,
    },
    avatar: {
        width: 48 * fontScale,
        height: 48 * fontScale,
        borderRadius: 24 * fontScale,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        borderWidth: 2,
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { fontSize: 20 * fontScale, fontWeight: '600' },
    chatInfo: { flex: 1 },
    chatName: { fontSize: 16 * fontScale, fontWeight: '600', color: colors.text, letterSpacing: 0.2 },
    chatType: { fontSize: 11 * fontScale, color: colors.textSecondary, marginTop: 2 },
    muteIcon: { fontSize: 14, marginLeft: spacing.xs, opacity: 0.6 },
    arrow: { fontSize: 24, marginLeft: spacing.sm },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: spacing.md, opacity: 0.6 },
    emptyText: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.xs },
    emptySubtext: { fontSize: 13, color: colors.textMuted },
    fab: {
        position: 'absolute',
        // bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.large,
    },
    fabText: { color: colors.textLight, fontSize: 32, fontWeight: '300', marginTop: -2 },
    logoutButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.subtleOverlay, // легкий фон для тактильности
    },
    logoutText: {
        fontSize: 24,
        color: '#d32f2f', // красный, чтобы обозначить выход
        textAlign: 'center',
        lineHeight: 28,
    },
});

export default RoomSelectScreen;