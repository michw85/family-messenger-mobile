import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
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