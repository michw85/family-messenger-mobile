import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export const registerForPushNotificationsAsync = async () => {
    /*const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'cd3777d1-9f36-4fe9-b724-7dcb24a59bf5', // замените на ваш
    });
    if (tokenData.data) {
        await AsyncStorage.setItem('fcm_token', tokenData.data);
    }
    return tokenData.data;*/
    console.warn('FCM not supported in Expo Go, skipping');
    return 'test-token-123';
    // return null;
};