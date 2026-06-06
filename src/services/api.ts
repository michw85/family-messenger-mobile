// src/services/api.ts
/**
 * API клиент для связи с бэкендом
 * API client for backend communication
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Базовый URL бэкенда (замените на ваш IP в локальной сети)
// Base URL of backend (replace with your local IP)
const BASE_URL = 'http://192.168.184.112:8080/api';  // 'http://192.168.1.100:8080/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Добавляем токен в каждый запрос
// Add token to every request
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth endpoints
export const login = (username: string, password: string) =>
    api.post('/auth/login', { username, password });

export const register = (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password });

export const getCurrentUser = () => api.get('/auth/me');

// Chats endpoints
export const fetchChats = () => api.get('/chats');
export const createChat = (name: string, type: 'GROUP' | 'FAMILY') =>
    api.post('/chats', { name, type });
export const deleteChat = (chatId: string) => api.delete(`/chats/${chatId}`);

// Messages
export const fetchMessages = (chatId: string, page = 0, size = 30) =>
    api.get(`/chats/${chatId}/messages`, { params: { page, size } });

// Files
export const uploadFile = (formData: FormData, type: 'image' | 'voice') =>
    api.post(`/files/upload/${type}`, formData, {
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