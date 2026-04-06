'use client';

import { create } from 'zustand';

import { apiClient } from '@/lib/api/client';
import type { AppRole, RegistrationResponse, AuthUser } from '@/lib/types';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  user: AuthUser | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  bootstrap: (force?: boolean) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, type: 'client' | 'vendor') => Promise<RegistrationResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

let bootstrapPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  refreshToken: null,
  expiresIn: null,
  user: null,
  hydrated: false,
  setHydrated: (value) => set({ hydrated: value }),
  async bootstrap(force = false) {
    if (get().hydrated && !force) {
      return;
    }

    if (bootstrapPromise) {
      await bootstrapPromise;
      return;
    }

    bootstrapPromise = (async () => {
      try {
        const user = await apiClient.getCurrentUser();
        set({
          token: 'cookie-session',
          refreshToken: null,
          expiresIn: null,
          user,
          hydrated: true,
        });
      } catch {
        set({
          token: null,
          refreshToken: null,
          expiresIn: null,
          user: null,
          hydrated: true,
        });
      } finally {
        bootstrapPromise = null;
      }
    })();

    await bootstrapPromise;
  },
  async login(email, password) {
    const response = await apiClient.login(email, password);

    set({
      token: 'cookie-session',
      refreshToken: null,
      expiresIn: response.expires_in,
      user: response.user,
      hydrated: true,
    });
  },
  async register(email, password, type) {
    return apiClient.register(email, password, type);
  },
  async logout() {
    try {
      await apiClient.logout();
    } catch {
      // Clear local session state even if the backend cookie revoke call fails.
    }

    set({
      token: null,
      refreshToken: null,
      expiresIn: null,
      user: null,
      hydrated: true,
    });
  },
  async refresh() {
    try {
      const response = await apiClient.refresh();
      set((state) => ({
        ...state,
        token: 'cookie-session',
        expiresIn: response.expires_in,
        user: response.user ?? state.user,
        hydrated: true,
      }));
    } catch {
      await get().logout();
    }
  },
  hasRole(role) {
    return get().user?.roles.includes(role) ?? false;
  },
}));
