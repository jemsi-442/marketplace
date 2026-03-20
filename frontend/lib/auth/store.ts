'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { apiClient } from '@/lib/api/client';
import type { AppRole, AuthResponse, AuthUser } from '@/lib/types';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  user: AuthUser | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, type: 'client' | 'vendor') => Promise<AuthResponse>;
  logout: () => void;
  refresh: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      expiresIn: null,
      user: null,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      async login(email, password) {
        const response = await apiClient.login(email, password);

        set({
          token: response.token,
          refreshToken: response.refresh_token,
          expiresIn: response.expires_in,
          user: response.user,
        });
      },
      async register(email, password, type) {
        const response = await apiClient.register(email, password, type);

        set({
          token: response.token,
          refreshToken: response.refresh_token,
          expiresIn: response.expires_in,
          user: response.user,
        });

        return response;
      },
      logout() {
        set({ token: null, refreshToken: null, expiresIn: null, user: null });
      },
      async refresh() {
        const currentRefreshToken = get().refreshToken;
        if (!currentRefreshToken) {
          get().logout();
          return;
        }

        const response = await apiClient.refresh(currentRefreshToken);
        set({
          token: response.access_token,
          refreshToken: response.refresh_token,
          expiresIn: response.expires_in,
        });
      },
      hasRole(role) {
        return get().user?.roles.includes(role) ?? false;
      },
    }),
    {
      name: 'marketplace-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        expiresIn: state.expiresIn,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
