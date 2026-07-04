import { create } from 'zustand';
import { authApi } from '../api/endpoints';
import { apiClient, tokenStorage } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    set({ user, status: 'authenticated' });
  },

  logout: async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore network errors on logout
      }
    }
    tokenStorage.clear();
    set({ user: null, status: 'unauthenticated' });
  },

  loadCurrentUser: async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      set({ status: 'unauthenticated' });
      return;
    }
    set({ status: 'loading' });
    try {
      const { data } = await authApi.me();
      set({ user: data, status: 'authenticated' });
    } catch {
      tokenStorage.clear();
      set({ user: null, status: 'unauthenticated' });
    }
  },
}));
