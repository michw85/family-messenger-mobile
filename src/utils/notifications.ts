import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'android') {
        // enableVibrate по умолчанию false для Android-канала, даже при
        // importance: MAX - без явного vibrationPattern пуш (включая звонки)
        // никак не даёт о себе знать на телефоне с выключенным звуком/на вибро.
        // Канал переименован в default-v3 (было default-v2 с более резким
        // паттерном [0,800,800,800] - тестеры жаловались, что уведомления
        // будят даже соседей за стенкой, задача #93), а не подправлен под тем
        // же id - Android-каналы неизменяемы после создания (importance/
        // vibration нельзя обновить, только пересоздать под новым id), так
        // что уже установленные устройства иначе не подхватят это исправление.
        // Бэкенд (FcmService) должен передавать channelId: 'default-v3' в
        // пуш-пейлоаде, иначе Expo отправит на канал с буквальным именем
        // 'default', которого на устройстве больше нет.
        // enableVibrate defaults to false for an Android channel even with
        // importance: MAX - without an explicit vibrationPattern a push
        // (including calls) makes no noise at all on a phone with sound off/
        // on vibrate. The channel is renamed to default-v3 (was default-v2
        // with a harsher [0,800,800,800] pattern - testers reported
        // notifications waking people in other rooms, task #93) rather than
        // tweaked under the same id - Android channels are immutable after
        // creation (importance/vibration can't be updated, only recreated
        // under a new id), so already-installed devices wouldn't otherwise
        // pick up this fix. The backend (FcmService) must send
        // channelId: 'default-v3' in the push payload, or Expo will target a
        // channel literally named 'default', which no longer exists on device.
        await Notifications.setNotificationChannelAsync('default-v3', {
            name: 'default-v3',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 150, 250],
            enableVibrate: true,
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
    }

    try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'cd3777d1-9f36-4fe9-b724-7dcb24a59bf5',
        });
        if (tokenData.data) {
            await AsyncStorage.setItem('fcm_token', tokenData.data);
            console.log('FCM token registered:', tokenData.data);
        }
        return tokenData.data;
    } catch (error) {
        console.error('Failed to get push token:', error);
        return null;
    }
};