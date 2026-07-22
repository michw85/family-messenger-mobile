// src/services/api.ts
/**
 * API клиент для связи с бэкендом
 * API client for backend communication
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { triggerAuthExpired } from '../utils/authEvents';

// Базовый URL бэкенда (замените на ваш IP в локальной сети)
// Base URL of backend (replace with your local IP)
// const BASE_URL = 'http://192.168.106.112:8080/api';  // 'http://192.168.1.100:8080/api'; было - 'http://192.168.184.112:8080/api'
// const BASE_URL = 'http://10.0.2.2:8080/api';
// const BASE_URL = 'http://165.245.213.90:8080/api';
const BASE_URL = 'https://bonds-app.duckdns.org/api';


const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
console.log('Request URL:', BASE_URL + '/auth/register');
// Добавляем токен в каждый запрос
// Add token to every request
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Adding token to request:', config.url, token.substring(0, 20) + '...');
    }else {
        console.log('No token for request:', config.url);
    }
    return config;
});
// Логика автообновления access-токена по 401 (одна попытка refresh на очередь запросов)
// Auto-refresh logic for the access token on 401 (a single refresh call serves the whole queue of requests)
let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

const onTokenRefreshed = (token: string | null) => {
    pendingRequests.forEach((cb) => cb(token));
    pendingRequests = [];
};

const clearSessionAndSignOut = async () => {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'username']);
    triggerAuthExpired();
};

api.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login')
        || originalRequest?.url?.includes('/auth/register')
        || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingRequests.push((token) => {
                    if (!token) {
                        reject(error);
                        return;
                    }
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(api(originalRequest));
                });
            });
        }

        isRefreshing = true;
        try {
            const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
            if (!storedRefreshToken) {
                throw new Error('No refresh token stored');
            }

            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: storedRefreshToken });
            await AsyncStorage.setItem('token', data.token);
            await AsyncStorage.setItem('refreshToken', data.refreshToken);

            isRefreshing = false;
            onTokenRefreshed(data.token);

            originalRequest.headers.Authorization = `Bearer ${data.token}`;
            return api(originalRequest);
        } catch (refreshError) {
            isRefreshing = false;
            onTokenRefreshed(null);
            await clearSessionAndSignOut();
            return Promise.reject(refreshError);
        }
    }

    console.error('API Error:', error.config?.url, error.message);
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password });

// Шаг 2 логина: подтверждение одноразового кода из email (2FA)
// Login step 2: verify the one-time email code (2FA)
export const verifyLoginOtp = (username: string, code: string) =>
  api.post('/auth/login/verify-otp', { username, code });

export const register = (username: string, email: string, password: string) => {
  console.log('Register request to:', `${BASE_URL}/auth/register`);
  return api.post('/auth/register', { username, email, password });
};

export const getCurrentUser = () => api.get('/auth/me');

// Выход из аккаунта — отзывает refresh-токен на сервере, затем нужно очистить AsyncStorage
// Logout — revokes the refresh token on the server; caller must then clear AsyncStorage
export const logout = async () => {
    const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
    if (storedRefreshToken) {
        await api.post('/auth/logout', { refreshToken: storedRefreshToken }).catch(() => {});
    }
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'username']);
};

// Chats endpoints
export const fetchChats = () => api.get('/chats');
export const createChat = (name: string, type: 'GROUP' | 'FAMILY') =>
  api.post('/chats', { name, type });
export const deleteChat = (chatId: string) => api.delete(`/chats/${chatId}`);
// Покинуть чат (группа) / удалить чат только у себя (личный чат)
// Leave a chat (group) / delete a chat for yourself only (personal chat)
export const leaveChat = (chatId: string) => api.post(`/chats/${chatId}/leave`);

// Messages
export const fetchMessages = (chatId: string, page = 0, size = 30) =>
  api.get(`/chats/${chatId}/messages`, { params: { page, size } });

export const searchMessages = (chatId: string, query: string) =>
  api.get(`/chats/${chatId}/messages/search`, { params: { query } });

export const editMessage = (chatId: string, messageId: string, content: string) =>
  api.put(`/chats/${chatId}/messages/${messageId}`, { content });

export const deleteMessage = (chatId: string, messageId: string) =>
  api.delete(`/chats/${chatId}/messages/${messageId}`);

// Files
export const uploadFile = (formData: FormData, type: 'image' | 'voice') =>
  api.post(`/files/upload/${type}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Firebase
export const updateFcmToken = (token: string) => {
    return api.post('/auth/fcm-token', { token });
};

// Users
export const searchUsers = (query: string) =>
    api.get(`/users/search?query=${encodeURIComponent(query)}`);

// Chat participants
export const getParticipants = (chatId: string) =>
    api.get(`/chats/${chatId}/participants`);

export const addParticipants = (chatId: string, userIds: number[]) =>
    api.post(`/chats/${chatId}/participants`, userIds);

export const removeParticipant = (chatId: string, userId: number) =>
    api.delete(`/chats/${chatId}/participants/${userId}`);

export const createGroupChat = (name: string, participantIds: number[]) =>
    api.post('/chats/group', { name, participantIds });

// Avatar upload — returns the updated user (including the new avatarUrl)
export const uploadAvatar = (formData: FormData) =>
    api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });


/*
const IP = '192.168.184.112';  // Ваш IP

export const API_URL = `http://${IP}:8080/api`;
export const WS_URL = `http://${IP}:8080/ws`;

export const api = {
  register: async (username: string, email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  },

  login: async (username: string, password: string) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),  // Только username и password
  });
  return response.json();
},
}; */