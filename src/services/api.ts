// src/services/api.ts
const IP = '192.168.184.112';  // Ваш IP

export const API_URL = `http://${IP}:8080/api`;
export const WS_URL = `ws://${IP}:8080/ws`;

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
};