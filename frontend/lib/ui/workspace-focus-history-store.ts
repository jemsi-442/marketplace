'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface WorkspaceFocusHistoryItem {
  href: string;
  title: string;
  subtitle?: string;
  userKey: string;
  focusCount: number;
  lastFocusedAt: string;
}

interface WorkspaceFocusHistoryState {
  items: WorkspaceFocusHistoryItem[];
  addFocusVisit: (item: Omit<WorkspaceFocusHistoryItem, 'focusCount' | 'lastFocusedAt'>) => void;
  clearHistory: (userKey: string) => void;
}

export const useWorkspaceFocusHistoryStore = create<WorkspaceFocusHistoryState>()(
  persist(
    (set) => ({
      items: [],
      addFocusVisit: (item) => set((state) => {
        const existing = state.items.find((entry) => entry.href === item.href && entry.userKey === item.userKey);
        const nextItem: WorkspaceFocusHistoryItem = {
          ...item,
          focusCount: (existing?.focusCount ?? 0) + 1,
          lastFocusedAt: new Date().toISOString(),
        };

        return {
          items: [
            nextItem,
            ...state.items.filter((entry) => !(entry.href === item.href && entry.userKey === item.userKey)),
          ].slice(0, 24),
        };
      }),
      clearHistory: (userKey) => set((state) => ({
        items: state.items.filter((item) => item.userKey !== userKey),
      })),
    }),
    {
      name: 'wolfix-workspace-focus-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
