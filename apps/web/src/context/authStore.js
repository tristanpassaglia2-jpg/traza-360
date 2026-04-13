// apps/web/src/context/authStore.js
import { create } from 'zustand';
import { auth as authApi } from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('traza_token') || null,
  loading: true,
  error: null,

  // Initialize — check if we have a stored token
  init: async () => {
    const token = localStorage.getItem('traza_token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, token, loading: false });
    } catch {
      localStorage.removeItem('traza_token');
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem('traza_token', data.token);
      set({ user: data.user, token: data.token, error: null });
      return data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  register: async (email, password, displayName, role) => {
    set({ error: null });
    try {
      const data = await authApi.register({ email, password, displayName, role });
      localStorage.setItem('traza_token', data.token);
      set({ user: data.user, token: data.token, error: null });
      return data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  logout: () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('traza_token');
    set({ user: null, token: null });
  },

  isLoggedIn: () => !!get().token && !!get().user,
}));

export default useAuthStore;
