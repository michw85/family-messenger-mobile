/**
 * @file authStorage.ts
 * @description Хранилище JWT access/refresh токенов через expo-secure-store
 * (Keychain на iOS / Keystore-backed EncryptedSharedPreferences на Android)
 * вместо AsyncStorage, который хранит данные в открытом виде на диске -
 * скомпрометированное/рутованное устройство (или, на Android, `adb backup`
 * при включённой отладке) могло прочитать оба токена напрямую.
 * @description Storage for the JWT access/refresh tokens via expo-secure-store
 * (iOS Keychain / Android Keystore-backed EncryptedSharedPreferences) instead
 * of AsyncStorage, which stores data unencrypted on disk - a compromised/
 * rooted device (or, on Android, `adb backup` with debugging enabled) could
 * read both tokens directly.
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const setToken = (value: string) => SecureStore.setItemAsync(TOKEN_KEY, value);

export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
export const setRefreshToken = (value: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, value);

export const setTokens = async (token: string, refreshToken: string) => {
    await Promise.all([setToken(token), setRefreshToken(refreshToken)]);
};

export const clearTokens = async () => {
    await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
};
