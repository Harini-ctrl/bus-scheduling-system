import api from './api';
import type { AuthResponse, LoginInput, RegisterInput, User } from '../types';

export const authService = {
  login: (data: LoginInput) =>
    api.post<AuthResponse>('/auth/login', data).then(r => r.data),

  register: (data: RegisterInput) =>
    api.post<AuthResponse>('/auth/register', data).then(r => r.data),

  getMe: () =>
    api.get<User>('/auth/me').then(r => r.data),

  // Save token + user to localStorage
  saveAuth: (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Get current user from localStorage
  getUser: (): User | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Get token
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  // Logout — clear everything
  logout: () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.replace('/login');
},

  // Check if logged in
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },
};